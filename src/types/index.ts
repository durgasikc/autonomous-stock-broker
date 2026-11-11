export interface Candlestick {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalIndicators {
  rsi: number;
  macd: {
    macdLine: number;
    signalLine: number;
    histogram: number;
  };
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
    bandwidth: number;
  };
  sma20: number;
  sma50: number;
  sma200: number;
  ema9: number;
  ema21: number;
  atr: number;
}

export type SignalAction = 'BUY' | 'SELL' | 'HOLD';

export interface ConfluenceFactor {
  name: string;
  verdict: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  description: string;
  weight: number; // e.g. 1 to 3
}

export interface TradingSignal {
  id: string;
  symbol: string;
  action: SignalAction;
  price: number;
  timestamp: number;
  confidence: number; // 0 - 100
  reasoning: string;
  regime: 'BULLISH_TREND' | 'BEARISH_TREND' | 'CONSOLIDATION' | 'HIGH_VOLATILITY';
  confluenceFactors: ConfluenceFactor[];
  suggestedStopLoss: number;
  suggestedTakeProfit: number;
  riskRewardRatio: number;
  indicators: TechnicalIndicators;
}

export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'TAKE_PROFIT';
export type OrderStatus = 'PENDING' | 'FILLED' | 'CANCELLED' | 'REJECTED';

export interface Order {
  id: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  limitPrice?: number;
  stopPrice?: number;
  filledPrice?: number;
  status: OrderStatus;
  timestamp: number;
  filledAt?: number;
  brokerOrderId?: string;
  commission: number;
  slippage: number;
  reason?: string;
}

export interface Position {
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  stopLoss?: number;
  takeProfit?: number;
  realizedPnl: number;
  openedAt: number;
}

export interface PortfolioSummary {
  cash: number;
  initialCash: number;
  equity: number;
  realizedPnl: number;
  unrealizedPnl: number;
  dayStartEquity: number;
  dayDrawdownPct: number;
  positions: Position[];
  orders: Order[];
}

export type AgentMode = 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';

export interface RiskManagementConfig {
  maxPositionSizePct: number; // e.g. 10% of portfolio equity
  defaultStopLossPct: number;  // e.g. 2.0%
  defaultTakeProfitPct: number; // e.g. 4.5%
  maxDailyDrawdownPct: number; // e.g. 3.0% circuit breaker
  minRiskRewardRatio: number;  // e.g. 2.0
}

export interface AgentConfig {
  enabled: boolean;
  mode: AgentMode;
  tradingTickIntervalMs: number; // e.g. 3000ms
  symbols: string[];
  risk: RiskManagementConfig;
}

export type LogLevel = 'INFO' | 'SIGNAL' | 'TRADE' | 'RISK_ALERT' | 'ERROR';

export interface AgentLog {
  id: string;
  timestamp: number;
  level: LogLevel;
  symbol?: string;
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

export type BrokerType = 'PAPER' | 'INTERACTIVE_BROKERS' | 'ALPACA';

export interface IBKRConfig {
  baseUrl: string; // default e.g. https://localhost:5000/v1/api
  accountId: string;
  sslVerify: boolean;
  paperAccount: boolean;
}

export interface AlpacaConfig {
  apiKey: string;
  secretKey: string;
  paperTrading: boolean;
}

export interface BrokerSettings {
  activeBroker: BrokerType;
  ibkr: IBKRConfig;
  alpaca: AlpacaConfig;
  paper: {
    slippagePct: number;
    commissionPerShare: number;
  };
}

export interface BacktestResult {
  symbol: string;
  startDate: string;
  endDate: string;
  initialBalance: number;
  finalBalance: number;
  totalReturnPct: number;
  annualizedReturnPct: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  profitFactor: number;
  winRatePct: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  trades: Array<{
    entryDate: string;
    exitDate: string;
    side: OrderSide;
    entryPrice: number;
    exitPrice: number;
    pnl: number;
    pnlPct: number;
    reason: string;
  }>;
  equityCurve: Array<{
    date: string;
    equity: number;
  }>;
}
