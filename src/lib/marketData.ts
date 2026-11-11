import type { Candlestick } from '../types';

export interface StockMetadata {
  symbol: string;
  name: string;
  basePrice: number;
  volatility: number; // annualized volatility e.g. 0.35
  description: string;
  sector: string;
}

export const WATCHLIST: Record<string, StockMetadata> = {
  NVDA: {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    basePrice: 142.5,
    volatility: 0.45,
    description: 'Semiconductors & AI Accelerated Computing',
    sector: 'Technology',
  },
  AAPL: {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    basePrice: 228.3,
    volatility: 0.25,
    description: 'Consumer Electronics & Software Ecosystem',
    sector: 'Technology',
  },
  TSLA: {
    symbol: 'TSLA',
    name: 'Tesla, Inc.',
    basePrice: 246.8,
    volatility: 0.55,
    description: 'Electric Vehicles, Robotics & Autonomous AI',
    sector: 'Automotive',
  },
  MSFT: {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    basePrice: 421.1,
    volatility: 0.22,
    description: 'Enterprise Cloud, Productivity & Azure AI',
    sector: 'Technology',
  },
  AMZN: {
    symbol: 'AMZN',
    name: 'Amazon.com, Inc.',
    basePrice: 188.4,
    volatility: 0.3,
    description: 'E-commerce, AWS Cloud Infrastructure',
    sector: 'Consumer Cyclical',
  },
  SPY: {
    symbol: 'SPY',
    name: 'SPDR S&P 500 ETF Trust',
    basePrice: 585.2,
    volatility: 0.16,
    description: 'Benchmark S&P 500 Index ETF',
    sector: 'Index ETF',
  },
};

/**
 * Generates synthetic historical candlestick data with realistic geometric Brownian motion
 */
export function generateHistoricalCandles(
  symbol: string,
  count = 90,
  intervalMinutes = 60
): Candlestick[] {
  const meta = WATCHLIST[symbol] || {
    symbol,
    basePrice: 100,
    volatility: 0.3,
  };

  const candles: Candlestick[] = [];
  const now = Date.now();
  const stepMs = intervalMinutes * 60 * 1000;
  let currentPrice = meta.basePrice * (1 + (Math.random() - 0.5) * 0.1);

  const startTime = now - count * stepMs;

  for (let i = 0; i < count; i++) {
    const timestamp = startTime + i * stepMs;
    // Volatility drift
    const dt = 1 / (252 * (390 / intervalMinutes));
    const drift = 0.08 * dt; // 8% expected annual return
    const shock = meta.volatility * Math.sqrt(dt) * (Math.random() * 2 - 1);
    const returnPct = drift + shock;

    const open = currentPrice;
    const close = Math.max(1, Number((open * (1 + returnPct)).toFixed(2)));
    const spread = Math.abs(close - open);
    const wickHigh = spread * (0.3 + Math.random() * 0.8);
    const wickLow = spread * (0.3 + Math.random() * 0.8);

    const high = Number((Math.max(open, close) + wickHigh).toFixed(2));
    const low = Number((Math.max(0.5, Math.min(open, close) - wickLow)).toFixed(2));
    const volume = Math.floor(50000 + Math.random() * 250000 + spread * 100000);

    candles.push({
      timestamp,
      open,
      high,
      low,
      close,
      volume,
    });

    currentPrice = close;
  }

  return candles;
}

/**
 * Advances price with a single new tick/candle
 */
export function generateNextCandle(prevCandle: Candlestick, volatility = 0.3): Candlestick {
  const dt = 1 / (252 * 390);
  const shock = volatility * Math.sqrt(dt) * (Math.random() * 2 - 1);
  const open = prevCandle.close;
  const close = Number((open * (1 + shock)).toFixed(2));
  const diff = Math.abs(close - open);
  const high = Number((Math.max(open, close) + diff * Math.random()).toFixed(2));
  const low = Number((Math.max(1, Math.min(open, close) - diff * Math.random())).toFixed(2));
  const volume = Math.floor(10000 + Math.random() * 50000);

  return {
    timestamp: Date.now(),
    open,
    high,
    low,
    close,
    volume,
  };
}
