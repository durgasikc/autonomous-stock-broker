import type { Candlestick, TechnicalIndicators } from '../types';

/**
 * Simple Moving Average (SMA)
 */
export function calculateSMA(values: number[], period: number): number[] {
  if (values.length < period) return values.map(() => values[values.length - 1] ?? 0);
  const result: number[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) {
      sum -= values[i - period];
      result.push(sum / period);
    } else if (i === period - 1) {
      result.push(sum / period);
    } else {
      result.push(sum / (i + 1));
    }
  }
  return result;
}

/**
 * Exponential Moving Average (EMA)
 */
export function calculateEMA(values: number[], period: number): number[] {
  if (values.length === 0) return [];
  const k = 2 / (period + 1);
  const result: number[] = [values[0]];

  for (let i = 1; i < values.length; i++) {
    const emaVal = values[i] * k + result[i - 1] * (1 - k);
    result.push(emaVal);
  }
  return result;
}

/**
 * Relative Strength Index (RSI - Wilder's Smoothing)
 */
export function calculateRSI(closes: number[], period = 14): number[] {
  if (closes.length <= period) {
    return closes.map(() => 50);
  }

  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? Math.abs(diff) : 0);
  }

  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  const rsiValues: number[] = new Array(period).fill(50);

  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  let initialRsi = 100 - 100 / (1 + rs);
  rsiValues.push(initialRsi);

  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;

    if (avgLoss === 0) {
      rsiValues.push(100);
    } else {
      rs = avgGain / avgLoss;
      rsiValues.push(100 - 100 / (1 + rs));
    }
  }

  return rsiValues;
}

/**
 * Moving Average Convergence Divergence (MACD)
 */
export function calculateMACD(
  closes: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): { macdLine: number[]; signalLine: number[]; histogram: number[] } {
  const fastEMA = calculateEMA(closes, fastPeriod);
  const slowEMA = calculateEMA(closes, slowPeriod);

  const macdLine: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    macdLine.push(fastEMA[i] - slowEMA[i]);
  }

  const signalLine = calculateEMA(macdLine, signalPeriod);
  const histogram: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    histogram.push(macdLine[i] - signalLine[i]);
  }

  return { macdLine, signalLine, histogram };
}

/**
 * Bollinger Bands (SMA +/- N * stdDev)
 */
export function calculateBollingerBands(
  closes: number[],
  period = 20,
  stdDevMultiplier = 2
): { upper: number[]; middle: number[]; lower: number[]; bandwidth: number[] } {
  const middle = calculateSMA(closes, period);
  const upper: number[] = [];
  const lower: number[] = [];
  const bandwidth: number[] = [];

  for (let i = 0; i < closes.length; i++) {
    const startIdx = Math.max(0, i - period + 1);
    const window = closes.slice(startIdx, i + 1);
    const mean = middle[i];

    const variance =
      window.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / window.length;
    const stdDev = Math.sqrt(variance);

    const u = mean + stdDevMultiplier * stdDev;
    const l = mean - stdDevMultiplier * stdDev;
    upper.push(u);
    lower.push(l);
    bandwidth.push(mean !== 0 ? (u - l) / mean : 0);
  }

  return { upper, middle, lower, bandwidth };
}

/**
 * Average True Range (ATR)
 */
export function calculateATR(candles: Candlestick[], period = 14): number[] {
  if (candles.length < 2) return candles.map(() => 1);

  const trueRanges: number[] = [candles[0].high - candles[0].low];

  for (let i = 1; i < candles.length; i++) {
    const cur = candles[i];
    const prevClose = candles[i - 1].close;
    const tr = Math.max(
      cur.high - cur.low,
      Math.abs(cur.high - prevClose),
      Math.abs(cur.low - prevClose)
    );
    trueRanges.push(tr);
  }

  return calculateSMA(trueRanges, period);
}

/**
 * Computes all technical indicators for the current candle series
 */
export function computeAllIndicators(candles: Candlestick[]): TechnicalIndicators {
  if (!candles || candles.length === 0) {
    return {
      rsi: 50,
      macd: { macdLine: 0, signalLine: 0, histogram: 0 },
      bollingerBands: { upper: 0, middle: 0, lower: 0, bandwidth: 0 },
      sma20: 0,
      sma50: 0,
      sma200: 0,
      ema9: 0,
      ema21: 0,
      atr: 1,
    };
  }

  const closes = candles.map((c) => c.close);
  const n = closes.length - 1;

  const rsiSeries = calculateRSI(closes, 14);
  const macdSeries = calculateMACD(closes, 12, 26, 9);
  const bbSeries = calculateBollingerBands(closes, 20, 2);
  const sma20Series = calculateSMA(closes, 20);
  const sma50Series = calculateSMA(closes, 50);
  const sma200Series = calculateSMA(closes, 200);
  const ema9Series = calculateEMA(closes, 9);
  const ema21Series = calculateEMA(closes, 21);
  const atrSeries = calculateATR(candles, 14);

  return {
    rsi: Number((rsiSeries[n] ?? 50).toFixed(2)),
    macd: {
      macdLine: Number((macdSeries.macdLine[n] ?? 0).toFixed(3)),
      signalLine: Number((macdSeries.signalLine[n] ?? 0).toFixed(3)),
      histogram: Number((macdSeries.histogram[n] ?? 0).toFixed(3)),
    },
    bollingerBands: {
      upper: Number((bbSeries.upper[n] ?? closes[n]).toFixed(2)),
      middle: Number((bbSeries.middle[n] ?? closes[n]).toFixed(2)),
      lower: Number((bbSeries.lower[n] ?? closes[n]).toFixed(2)),
      bandwidth: Number((bbSeries.bandwidth[n] ?? 0).toFixed(4)),
    },
    sma20: Number((sma20Series[n] ?? closes[n]).toFixed(2)),
    sma50: Number((sma50Series[n] ?? closes[n]).toFixed(2)),
    sma200: Number((sma200Series[n] ?? closes[n]).toFixed(2)),
    ema9: Number((ema9Series[n] ?? closes[n]).toFixed(2)),
    ema21: Number((ema21Series[n] ?? closes[n]).toFixed(2)),
    atr: Number((atrSeries[n] ?? 1).toFixed(2)),
  };
}
