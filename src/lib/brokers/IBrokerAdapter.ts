import type { Order, Position, PortfolioSummary, OrderSide, OrderType } from '../../types';

export interface PlaceOrderRequest {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  limitPrice?: number;
  stopPrice?: number;
  takeProfitPrice?: number;
  stopLossPrice?: number;
  reason?: string;
}

export interface BrokerExecutionReport {
  success: boolean;
  order?: Order;
  errorMessage?: string;
}

export interface MarketQuote {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  volume: number;
  timestamp: number;
}

/**
 * Standard interface implemented by all broker adapters
 * (Interactive Brokers, Simulated Paper, Alpaca, etc.)
 */
export interface IBrokerAdapter {
  readonly name: string;
  readonly isConnected: boolean;

  connect(): Promise<boolean>;
  disconnect(): Promise<void>;

  getAccountSummary(): Promise<PortfolioSummary>;
  getPositions(): Promise<Position[]>;
  getOrders(): Promise<Order[]>;

  placeOrder(request: PlaceOrderRequest): Promise<BrokerExecutionReport>;
  cancelOrder(orderId: string): Promise<boolean>;
  closePosition(symbol: string): Promise<BrokerExecutionReport>;
  closeAllPositions(): Promise<BrokerExecutionReport[]>;

  getQuote(symbol: string): Promise<MarketQuote>;
}
