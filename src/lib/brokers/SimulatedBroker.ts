import type { IBrokerAdapter, PlaceOrderRequest, BrokerExecutionReport, MarketQuote } from './IBrokerAdapter';
import type { Order, Position, PortfolioSummary, OrderSide, OrderType } from '../../types';

export class SimulatedBroker implements IBrokerAdapter {
  readonly name = 'Simulated Paper Broker';
  private connected = true;

  private cash = 100000; // $100,000 starting paper balance
  private initialCash = 100000;
  private dayStartEquity = 100000;
  private realizedPnl = 0;
  private positions: Map<string, Position> = new Map();
  private orders: Order[] = [];

  private slippagePct = 0.0005; // 0.05%
  private commissionPerShare = 0.005; // $0.005 / share
  private minCommission = 1.0;

  private priceMap: Map<string, number> = new Map([
    ['NVDA', 142.50],
    ['AAPL', 228.30],
    ['TSLA', 246.80],
    ['MSFT', 421.10],
    ['AMZN', 188.40],
    ['SPY', 585.20],
  ]);

  get isConnected(): boolean {
    return this.connected;
  }

  async connect(): Promise<boolean> {
    this.connected = true;
    return true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  updateLivePrice(symbol: string, price: number) {
    this.priceMap.set(symbol, price);
    const pos = this.positions.get(symbol);
    if (pos) {
      pos.currentPrice = price;
      pos.unrealizedPnl = Number(((pos.currentPrice - pos.averagePrice) * pos.quantity).toFixed(2));
      pos.unrealizedPnlPct = Number((((pos.currentPrice - pos.averagePrice) / pos.averagePrice) * 100).toFixed(2));

      // Automated Stop-Loss execution
      if (pos.stopLoss && pos.quantity > 0 && price <= pos.stopLoss) {
        this.placeOrder({
          symbol,
          side: 'SELL',
          type: 'MARKET',
          quantity: pos.quantity,
          reason: `Auto Stop-Loss triggered at $${price.toFixed(2)} (Limit: $${pos.stopLoss.toFixed(2)})`,
        });
      }

      // Automated Take-Profit execution
      if (pos.takeProfit && pos.quantity > 0 && price >= pos.takeProfit) {
        this.placeOrder({
          symbol,
          side: 'SELL',
          type: 'MARKET',
          quantity: pos.quantity,
          reason: `Auto Take-Profit target achieved at $${price.toFixed(2)} (Target: $${pos.takeProfit.toFixed(2)})`,
        });
      }
    }
  }

  async getAccountSummary(): Promise<PortfolioSummary> {
    let positionMarketValue = 0;
    let totalUnrealized = 0;

    for (const pos of this.positions.values()) {
      const currentPrice = this.priceMap.get(pos.symbol) || pos.averagePrice;
      pos.currentPrice = currentPrice;
      pos.unrealizedPnl = Number(((pos.currentPrice - pos.averagePrice) * pos.quantity).toFixed(2));
      pos.unrealizedPnlPct = Number((((pos.currentPrice - pos.averagePrice) / pos.averagePrice) * 100).toFixed(2));

      positionMarketValue += pos.currentPrice * pos.quantity;
      totalUnrealized += pos.unrealizedPnl;
    }

    const equity = Number((this.cash + positionMarketValue).toFixed(2));
    const dayDrawdownPct = Number((Math.max(0, ((this.dayStartEquity - equity) / this.dayStartEquity) * 100)).toFixed(2));

    return {
      cash: Number(this.cash.toFixed(2)),
      initialCash: this.initialCash,
      equity,
      realizedPnl: Number(this.realizedPnl.toFixed(2)),
      unrealizedPnl: Number(totalUnrealized.toFixed(2)),
      dayStartEquity: this.dayStartEquity,
      dayDrawdownPct,
      positions: Array.from(this.positions.values()),
      orders: [...this.orders].reverse(),
    };
  }

  async getPositions(): Promise<Position[]> {
    return Array.from(this.positions.values());
  }

  async getOrders(): Promise<Order[]> {
    return [...this.orders].reverse();
  }

  async placeOrder(req: PlaceOrderRequest): Promise<BrokerExecutionReport> {
    const marketPrice = this.priceMap.get(req.symbol) || 150;
    const slippageFactor = req.side === 'BUY' ? (1 + this.slippagePct) : (1 - this.slippagePct);
    const executionPrice = Number((marketPrice * slippageFactor).toFixed(2));
    const commission = Math.max(this.minCommission, req.quantity * this.commissionPerShare);

    const orderCost = executionPrice * req.quantity + commission;

    if (req.side === 'BUY') {
      if (orderCost > this.cash) {
        return {
          success: false,
          errorMessage: `Insufficient buying power. Required $${orderCost.toFixed(2)}, Available $${this.cash.toFixed(2)}`,
        };
      }

      this.cash -= orderCost;

      const existingPos = this.positions.get(req.symbol);
      if (existingPos) {
        const totalQty = existingPos.quantity + req.quantity;
        const totalCost = existingPos.averagePrice * existingPos.quantity + executionPrice * req.quantity;
        existingPos.averagePrice = Number((totalCost / totalQty).toFixed(2));
        existingPos.quantity = totalQty;
        existingPos.currentPrice = marketPrice;
        if (req.stopLossPrice) existingPos.stopLoss = req.stopLossPrice;
        if (req.takeProfitPrice) existingPos.takeProfit = req.takeProfitPrice;
      } else {
        this.positions.set(req.symbol, {
          symbol: req.symbol,
          quantity: req.quantity,
          averagePrice: executionPrice,
          currentPrice: marketPrice,
          unrealizedPnl: 0,
          unrealizedPnlPct: 0,
          stopLoss: req.stopLossPrice,
          takeProfit: req.takeProfitPrice,
          realizedPnl: 0,
          openedAt: Date.now(),
        });
      }
    } else {
      // SELL / CLOSE
      const existingPos = this.positions.get(req.symbol);
      if (!existingPos || existingPos.quantity < req.quantity) {
        return {
          success: false,
          errorMessage: `Cannot sell ${req.quantity} shares of ${req.symbol}. Current position: ${existingPos?.quantity || 0}`,
        };
      }

      const grossProceeds = executionPrice * req.quantity;
      const netProceeds = grossProceeds - commission;
      const costBasis = existingPos.averagePrice * req.quantity;
      const tradePnl = Number((grossProceeds - costBasis - commission).toFixed(2));

      this.cash += netProceeds;
      this.realizedPnl += tradePnl;

      existingPos.quantity -= req.quantity;
      existingPos.realizedPnl += tradePnl;

      if (existingPos.quantity <= 0) {
        this.positions.delete(req.symbol);
      }
    }

    const order: Order = {
      id: `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      symbol: req.symbol,
      side: req.side,
      type: req.type,
      quantity: req.quantity,
      filledPrice: executionPrice,
      status: 'FILLED',
      timestamp: Date.now(),
      filledAt: Date.now(),
      brokerOrderId: `sim_${Date.now()}`,
      commission: Number(commission.toFixed(2)),
      slippage: Number((Math.abs(executionPrice - marketPrice) * req.quantity).toFixed(2)),
      reason: req.reason,
    };

    this.orders.push(order);

    return {
      success: true,
      order,
    };
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    const order = this.orders.find((o) => o.id === orderId);
    if (order && order.status === 'PENDING') {
      order.status = 'CANCELLED';
      return true;
    }
    return false;
  }

  async closePosition(symbol: string): Promise<BrokerExecutionReport> {
    const pos = this.positions.get(symbol);
    if (!pos || pos.quantity <= 0) {
      return { success: false, errorMessage: `No active position for ${symbol}` };
    }
    return this.placeOrder({
      symbol,
      side: 'SELL',
      type: 'MARKET',
      quantity: pos.quantity,
      reason: `Manual position liquidation for ${symbol}`,
    });
  }

  async closeAllPositions(): Promise<BrokerExecutionReport[]> {
    const reports: BrokerExecutionReport[] = [];
    const symbols = Array.from(this.positions.keys());
    for (const sym of symbols) {
      const rep = await this.closePosition(sym);
      reports.push(rep);
    }
    return reports;
  }

  async getQuote(symbol: string): Promise<MarketQuote> {
    const last = this.priceMap.get(symbol) || 100;
    const spread = last * 0.0004;
    return {
      symbol,
      bid: Number((last - spread / 2).toFixed(2)),
      ask: Number((last + spread / 2).toFixed(2)),
      last: Number(last.toFixed(2)),
      volume: 1250000,
      timestamp: Date.now(),
    };
  }
}
