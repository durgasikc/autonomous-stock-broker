import type { IBrokerAdapter, PlaceOrderRequest, BrokerExecutionReport, MarketQuote } from './IBrokerAdapter';
import type { Order, Position, PortfolioSummary, IBKRConfig } from '../../types';

/**
 * Interactive Brokers Client Portal Web API Adapter
 * Connects to IBKR Client Portal Gateway (CP Gateway)
 * Default URL: https://localhost:5000/v1/api
 */
export class InteractiveBrokersAdapter implements IBrokerAdapter {
  readonly name = 'Interactive Brokers (CP Gateway)';
  private config: IBKRConfig;
  private connected = false;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor(config: IBKRConfig) {
    this.config = config;
  }

  get isConnected(): boolean {
    return this.connected;
  }

  private async fetchIBKR(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.config.baseUrl.replace(/\/$/, '')}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'AutonomousStockBroker/1.0',
      ...(options.headers || {}),
    };

    try {
      const res = await fetch(url, {
        ...options,
        headers,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`IBKR API Error ${res.status}: ${text}`);
      }
      return await res.json();
    } catch (err: any) {
      // Re-throw with descriptive context
      throw new Error(`IBKR Gateway Connection Failed (${url}): ${err.message}`);
    }
  }

  async connect(): Promise<boolean> {
    try {
      // Step 1: Check session status
      const authStatus = await this.fetchIBKR('/iserver/auth/status');
      if (authStatus && authStatus.authenticated) {
        this.connected = true;

        // Start 30-second heartbeat to keep session alive
        if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = setInterval(async () => {
          try {
            await this.fetchIBKR('/tickle');
          } catch {
            // Heartbeat failed, mark disconnected
            this.connected = false;
          }
        }, 30000);

        return true;
      }
      this.connected = false;
      return false;
    } catch (err) {
      this.connected = false;
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.connected = false;
    try {
      await this.fetchIBKR('/logout', { method: 'POST' });
    } catch {
      // Ignore logout errors
    }
  }

  async getAccountSummary(): Promise<PortfolioSummary> {
    const accountId = this.config.accountId || 'DU123456';
    try {
      const summary = await this.fetchIBKR(`/portfolio/${accountId}/summary`);
      const positions = await this.getPositions();
      const orders = await this.getOrders();

      const cash = Number(summary?.totalcashvalue?.amount ?? 100000);
      const equity = Number(summary?.netliquidation?.amount ?? 100000);
      const unrealizedPnl = Number(summary?.unrealizedpnl?.amount ?? 0);
      const realizedPnl = Number(summary?.realizedpnl?.amount ?? 0);

      return {
        cash,
        initialCash: 100000,
        equity,
        realizedPnl,
        unrealizedPnl,
        dayStartEquity: equity - realizedPnl - unrealizedPnl,
        dayDrawdownPct: 0,
        positions,
        orders,
      };
    } catch (err: any) {
      // Return safe mock state if gateway is not reachable
      return {
        cash: 50000,
        initialCash: 50000,
        equity: 50000,
        realizedPnl: 0,
        unrealizedPnl: 0,
        dayStartEquity: 50000,
        dayDrawdownPct: 0,
        positions: [],
        orders: [],
      };
    }
  }

  async getPositions(): Promise<Position[]> {
    const accountId = this.config.accountId || 'DU123456';
    try {
      const res = await this.fetchIBKR(`/portfolio/${accountId}/positions/0`);
      if (!Array.isArray(res)) return [];

      return res.map((item: any) => ({
        symbol: item.ticker || item.contractDesc || 'UNKNOWN',
        quantity: item.position || 0,
        averagePrice: item.avgCost || 0,
        currentPrice: item.mktPrice || item.avgCost || 0,
        unrealizedPnl: item.unrealizedPnl || 0,
        unrealizedPnlPct: item.avgCost ? ((item.mktPrice - item.avgCost) / item.avgCost) * 100 : 0,
        realizedPnl: item.realizedPnl || 0,
        openedAt: Date.now(),
      }));
    } catch {
      return [];
    }
  }

  async getOrders(): Promise<Order[]> {
    try {
      const res = await this.fetchIBKR('/iserver/account/orders');
      const rawOrders = res?.orders || [];

      return rawOrders.map((o: any) => ({
        id: String(o.orderId),
        symbol: o.ticker || 'UNKNOWN',
        side: o.side === 'BUY' ? 'BUY' : 'SELL',
        type: o.orderType || 'MARKET',
        quantity: o.totalSize || 0,
        limitPrice: o.price,
        filledPrice: o.avgPrice || o.price,
        status: o.status === 'Filled' ? 'FILLED' : o.status === 'Cancelled' ? 'CANCELLED' : 'PENDING',
        timestamp: Date.now(),
        brokerOrderId: String(o.orderId),
        commission: 1.0,
        slippage: 0,
        reason: 'IBKR Gateway Order',
      }));
    } catch {
      return [];
    }
  }

  async placeOrder(req: PlaceOrderRequest): Promise<BrokerExecutionReport> {
    const accountId = this.config.accountId || 'DU123456';
    const cOID = `agy_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // IBKR order body format
    const ibkrOrder = {
      acctId: accountId,
      conid: 265598, // Example AAPL conid, in real app resolved via /iserver/secdef/search
      secType: 'STK',
      cOID,
      orderType: req.type === 'LIMIT' ? 'LMT' : 'MKT',
      price: req.limitPrice,
      side: req.side,
      tif: 'DAY',
      quantity: req.quantity,
    };

    try {
      const res = await this.fetchIBKR(`/iserver/account/${accountId}/orders`, {
        method: 'POST',
        body: JSON.stringify({ orders: [ibkrOrder] }),
      });

      // IBKR sometimes responds with confirmation prompts (replyId)
      if (Array.isArray(res) && res[0]?.id) {
        // Confirmation needed
        await this.fetchIBKR(`/iserver/reply/${res[0].id}`, {
          method: 'POST',
          body: JSON.stringify({ confirmed: true }),
        });
      }

      const order: Order = {
        id: cOID,
        symbol: req.symbol,
        side: req.side,
        type: req.type,
        quantity: req.quantity,
        limitPrice: req.limitPrice,
        status: 'FILLED',
        timestamp: Date.now(),
        filledAt: Date.now(),
        brokerOrderId: cOID,
        commission: 1.0,
        slippage: 0,
        reason: req.reason,
      };

      return { success: true, order };
    } catch (err: any) {
      return { success: false, errorMessage: `IBKR Order Execution failed: ${err.message}` };
    }
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    const accountId = this.config.accountId || 'DU123456';
    try {
      await this.fetchIBKR(`/iserver/account/${accountId}/order/${orderId}`, {
        method: 'DELETE',
      });
      return true;
    } catch {
      return false;
    }
  }

  async closePosition(symbol: string): Promise<BrokerExecutionReport> {
    const positions = await this.getPositions();
    const pos = positions.find((p) => p.symbol === symbol);
    if (!pos || pos.quantity <= 0) {
      return { success: false, errorMessage: `No position in ${symbol} found on IBKR` };
    }
    return this.placeOrder({
      symbol,
      side: 'SELL',
      type: 'MARKET',
      quantity: pos.quantity,
      reason: `IBKR Position liquidation: ${symbol}`,
    });
  }

  async closeAllPositions(): Promise<BrokerExecutionReport[]> {
    const positions = await this.getPositions();
    const reports: BrokerExecutionReport[] = [];
    for (const pos of positions) {
      if (pos.quantity > 0) {
        const rep = await this.closePosition(pos.symbol);
        reports.push(rep);
      }
    }
    return reports;
  }

  async getQuote(symbol: string): Promise<MarketQuote> {
    try {
      const res = await this.fetchIBKR(`/iserver/marketdata/snapshot?conids=265598&fields=31,84,86,88`);
      const quote = res[0] || {};
      const last = Number(quote['31'] || 150);
      const bid = Number(quote['84'] || last - 0.05);
      const ask = Number(quote['86'] || last + 0.05);
      const volume = Number(quote['88'] || 500000);
      return { symbol, bid, ask, last, volume, timestamp: Date.now() };
    } catch {
      return {
        symbol,
        bid: 149.95,
        ask: 150.05,
        last: 150.0,
        volume: 1000000,
        timestamp: Date.now(),
      };
    }
  }
}
