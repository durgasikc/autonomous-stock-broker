import type {
  Candlestick,
  TechnicalIndicators,
  TradingSignal,
  ConfluenceFactor,
  SignalAction,
  AgentMode,
  RiskManagementConfig,
  PortfolioSummary,
} from '../types';
import { computeAllIndicators } from './indicators';

export interface StrategyEvaluationInput {
  symbol: string;
  candles: Candlestick[];
  mode: AgentMode;
  risk: RiskManagementConfig;
  portfolio: PortfolioSummary;
}

/**
 * Determines market regime based on trend and volatility indicators
 */
export function detectMarketRegime(
  currentPrice: number,
  indicators: TechnicalIndicators
): 'BULLISH_TREND' | 'BEARISH_TREND' | 'CONSOLIDATION' | 'HIGH_VOLATILITY' {
  const isHighVol = indicators.bollingerBands.bandwidth > 0.06 || (indicators.atr / currentPrice) > 0.02;
  if (isHighVol) {
    return 'HIGH_VOLATILITY';
  }

  const isBullish = currentPrice > indicators.sma50 && indicators.ema9 > indicators.ema21;
  const isBearish = currentPrice < indicators.sma50 && indicators.ema9 < indicators.ema21;

  if (isBullish) return 'BULLISH_TREND';
  if (isBearish) return 'BEARISH_TREND';
  return 'CONSOLIDATION';
}

/**
 * Evaluates market data using quantitative metrics and AI reasoning synthesis
 */
export function evaluateStrategy(input: StrategyEvaluationInput): TradingSignal {
  const { symbol, candles, mode, risk, portfolio } = input;
  const currentCandle = candles[candles.length - 1];
  const currentPrice = currentCandle ? currentCandle.close : 100;
  const indicators = computeAllIndicators(candles);

  const regime = detectMarketRegime(currentPrice, indicators);
  const factors: ConfluenceFactor[] = [];

  // Factor 1: Trend Alignment (EMA 9 vs EMA 21 & SMA 50)
  const isEmaBullish = indicators.ema9 > indicators.ema21;
  const isAboveSma50 = currentPrice > indicators.sma50;
  if (isEmaBullish && isAboveSma50) {
    factors.push({
      name: 'Trend Alignment (EMA 9/21 & SMA 50)',
      verdict: 'BULLISH',
      description: `Fast EMA9 ($${indicators.ema9.toFixed(2)}) above slow EMA21 ($${indicators.ema21.toFixed(2)}) and price above 50 SMA.`,
      weight: 2.5,
    });
  } else if (!isEmaBullish && !isAboveSma50) {
    factors.push({
      name: 'Trend Alignment (EMA 9/21 & SMA 50)',
      verdict: 'BEARISH',
      description: `Fast EMA9 ($${indicators.ema9.toFixed(2)}) below slow EMA21 ($${indicators.ema21.toFixed(2)}) and price below 50 SMA.`,
      weight: 2.5,
    });
  } else {
    factors.push({
      name: 'Trend Alignment (EMA 9/21 & SMA 50)',
      verdict: 'NEUTRAL',
      description: 'Moving averages are compressed or conflicting, indicating transitional phase.',
      weight: 1.0,
    });
  }

  // Factor 2: Momentum (RSI 14)
  if (indicators.rsi < 35) {
    factors.push({
      name: 'RSI(14) Momentum',
      verdict: 'BULLISH',
      description: `RSI is oversold at ${indicators.rsi.toFixed(1)}, signaling strong mean-reversion buying opportunity.`,
      weight: 2.0,
    });
  } else if (indicators.rsi > 65) {
    factors.push({
      name: 'RSI(14) Momentum',
      verdict: 'BEARISH',
      description: `RSI is overbought at ${indicators.rsi.toFixed(1)}, indicating stretched upside and pullback risk.`,
      weight: 2.0,
    });
  } else {
    factors.push({
      name: 'RSI(14) Momentum',
      verdict: 'NEUTRAL',
      description: `RSI is balanced at ${indicators.rsi.toFixed(1)}, showing normal equilibrium.`,
      weight: 1.0,
    });
  }

  // Factor 3: MACD Momentum Divergence
  const { macdLine, signalLine, histogram } = indicators.macd;
  if (macdLine > signalLine && histogram > 0) {
    factors.push({
      name: 'MACD (12, 26, 9) Crossover',
      verdict: 'BULLISH',
      description: `MACD line (${macdLine.toFixed(2)}) crossed above signal (${signalLine.toFixed(2)}) with positive histogram expansion (${histogram.toFixed(2)}).`,
      weight: 2.0,
    });
  } else if (macdLine < signalLine && histogram < 0) {
    factors.push({
      name: 'MACD (12, 26, 9) Crossover',
      verdict: 'BEARISH',
      description: `MACD line (${macdLine.toFixed(2)}) below signal (${signalLine.toFixed(2)}) with negative histogram (${histogram.toFixed(2)}).`,
      weight: 2.0,
    });
  } else {
    factors.push({
      name: 'MACD (12, 26, 9) Crossover',
      verdict: 'NEUTRAL',
      description: 'MACD lines converging without distinct divergence.',
      weight: 1.0,
    });
  }

  // Factor 4: Bollinger Band Volatility Envelope
  const { lower, upper, middle } = indicators.bollingerBands;
  const distanceToLower = ((currentPrice - lower) / lower) * 100;
  const distanceToUpper = ((upper - currentPrice) / upper) * 100;

  if (distanceToLower < 1.0) {
    factors.push({
      name: 'Bollinger Band Envelope (20, 2)',
      verdict: 'BULLISH',
      description: `Price ($${currentPrice.toFixed(2)}) is hugging lower envelope ($${lower.toFixed(2)}), favorable statistical risk/reward.`,
      weight: 1.8,
    });
  } else if (distanceToUpper < 1.0) {
    factors.push({
      name: 'Bollinger Band Envelope (20, 2)',
      verdict: 'BEARISH',
      description: `Price ($${currentPrice.toFixed(2)}) is pressing against upper envelope ($${upper.toFixed(2)}), risk of resistance rejection.`,
      weight: 1.8,
    });
  } else {
    factors.push({
      name: 'Bollinger Band Envelope (20, 2)',
      verdict: 'NEUTRAL',
      description: `Price oscillating within standard bands (Mid: $${middle.toFixed(2)}).`,
      weight: 1.0,
    });
  }

  // Calculate Weighted Confluence Scores
  let bullishPoints = 0;
  let bearishPoints = 0;
  let totalWeight = 0;

  for (const f of factors) {
    totalWeight += f.weight;
    if (f.verdict === 'BULLISH') bullishPoints += f.weight;
    if (f.verdict === 'BEARISH') bearishPoints += f.weight;
  }

  const bullishScore = (bullishPoints / totalWeight) * 100;
  const bearishScore = (bearishPoints / totalWeight) * 100;

  // Mode thresholds
  const confidenceThreshold =
    mode === 'CONSERVATIVE' ? 70 : mode === 'MODERATE' ? 55 : 45;

  let action: SignalAction = 'HOLD';
  let confidence = 50;

  if (bullishScore >= confidenceThreshold && bullishScore > bearishScore) {
    action = 'BUY';
    confidence = Math.round(bullishScore);
  } else if (bearishScore >= confidenceThreshold && bearishScore > bullishScore) {
    action = 'SELL';
    confidence = Math.round(bearishScore);
  } else {
    action = 'HOLD';
    confidence = Math.round(Math.max(bullishScore, bearishScore, 50));
  }

  // Dynamic Stop Loss & Take Profit pegged to Volatility (ATR)
  const atrBuffer = Math.max(indicators.atr * 1.5, currentPrice * (risk.defaultStopLossPct / 100));
  const suggestedStopLoss =
    action === 'BUY'
      ? Number((currentPrice - atrBuffer).toFixed(2))
      : Number((currentPrice + atrBuffer).toFixed(2));

  const targetRewardBuffer = atrBuffer * risk.minRiskRewardRatio;
  const suggestedTakeProfit =
    action === 'BUY'
      ? Number((currentPrice + targetRewardBuffer).toFixed(2))
      : Number((currentPrice - targetRewardBuffer).toFixed(2));

  const riskDistance = Math.abs(currentPrice - suggestedStopLoss);
  const rewardDistance = Math.abs(suggestedTakeProfit - currentPrice);
  const riskRewardRatio = riskDistance > 0 ? Number((rewardDistance / riskDistance).toFixed(2)) : 2.0;

  // Synthesize AI Reasoning Log
  let reasoning = '';
  if (action === 'BUY') {
    reasoning = `[CONFLUENCE BUY SIGNAL: ${confidence}%] Market regime classified as ${regime}. Bullish convergence across ${
      factors.filter((f) => f.verdict === 'BULLISH').length
    } indicators. RSI(${indicators.rsi.toFixed(1)}) and MACD support upward momentum. Stop-loss established at $${suggestedStopLoss} with $${suggestedTakeProfit} target (${riskRewardRatio}:1 R/R).`;
  } else if (action === 'SELL') {
    reasoning = `[CONFLUENCE SELL / EXIT SIGNAL: ${confidence}%] Bearish inflection in ${regime} regime. Identified downside risk across ${
      factors.filter((f) => f.verdict === 'BEARISH').length
    } factors. Securing capital with protective stop at $${suggestedStopLoss} and target at $${suggestedTakeProfit}.`;
  } else {
    reasoning = `[MONITORING / NEUTRAL] Regime: ${regime}. Indeterminate market signals (Bullish: ${bullishScore.toFixed(0)}%, Bearish: ${bearishScore.toFixed(0)}%). Awaiting higher confluence threshold (requires ≥ ${confidenceThreshold}% for ${mode} mode).`;
  }

  return {
    id: `sig_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    symbol,
    action,
    price: currentPrice,
    timestamp: Date.now(),
    confidence,
    reasoning,
    regime,
    confluenceFactors: factors,
    suggestedStopLoss,
    suggestedTakeProfit,
    riskRewardRatio,
    indicators,
  };
}
