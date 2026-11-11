import type { Candlestick, BacktestResult, AgentMode, RiskManagementConfig, OrderSide } from '../types';
import { generateHistoricalCandles } from './marketData';
import { evaluateStrategy } from './strategyEngine';

export interface BacktestOptions {
  symbol: string;
  mode: AgentMode;
  initialBalance: number;
  days: number;
  risk: RiskManagementConfig;
}

export function runBacktest(options: BacktestOptions): BacktestResult {
  const { symbol, mode, initialBalance, days, risk } = options;
  const candleCount = Math.max(80, days * 7); // Hourly candles
  const candles = generateHistoricalCandles(symbol, candleCount, 60);

  let cash = initialBalance;
  let equity = initialBalance;
  let peakEquity = initialBalance;
  let maxDrawdown = 0;

  let activePosition: {
    quantity: number;
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    entryDate: string;
  } | null = null;

  const trades: BacktestResult['trades'] = [];
  const equityCurve: BacktestResult['equityCurve'] = [];

  const minWarmup = 35; // candles needed for EMA 21 / SMA 20 / RSI 14
  let winningTrades = 0;
  let losingTrades = 0;
  let grossProfits = 0;
  let grossLosses = 0;

  for (let i = minWarmup; i < candles.length; i++) {
    const historicalSlice = candles.slice(0, i + 1);
    const currentCandle = candles[i];
    const dateStr = new Date(currentCandle.timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
    });

    // Check existing position exit triggers (Stop loss / Take profit)
    if (activePosition) {
      const price = currentCandle.close;
      let exitReason = '';

      if (price <= activePosition.stopLoss) {
        exitReason = 'Stop Loss Hit';
      } else if (price >= activePosition.takeProfit) {
        exitReason = 'Take Profit Hit';
      }

      if (exitReason) {
        const exitPrice = price;
        const gross = exitPrice * activePosition.quantity;
        const cost = activePosition.entryPrice * activePosition.quantity;
        const commission = 2.0;
        const pnl = Number((gross - cost - commission).toFixed(2));
        const pnlPct = Number((((exitPrice - activePosition.entryPrice) / activePosition.entryPrice) * 100).toFixed(2));

        cash += gross - commission;
        if (pnl > 0) {
          winningTrades++;
          grossProfits += pnl;
        } else {
          losingTrades++;
          grossLosses += Math.abs(pnl);
        }

        trades.push({
          entryDate: activePosition.entryDate,
          exitDate: dateStr,
          side: 'BUY',
          entryPrice: activePosition.entryPrice,
          exitPrice,
          pnl,
          pnlPct,
          reason: exitReason,
        });

        activePosition = null;
      }
    }

    // Evaluate strategy for potential new entries
    const dummyPortfolio = {
      cash,
      initialCash: initialBalance,
      equity,
      realizedPnl: 0,
      unrealizedPnl: 0,
      dayStartEquity: initialBalance,
      dayDrawdownPct: 0,
      positions: [],
      orders: [],
    };

    const signal = evaluateStrategy({
      symbol,
      candles: historicalSlice,
      mode,
      risk,
      portfolio: dummyPortfolio,
    });

    if (!activePosition && signal.action === 'BUY') {
      const price = currentCandle.close;
      // Position sizing based on risk percentage
      const maxAlloc = equity * (risk.maxPositionSizePct / 100);
      const shares = Math.max(1, Math.floor(maxAlloc / price));
      const cost = shares * price + 1.0;

      if (cash >= cost) {
        cash -= cost;
        activePosition = {
          quantity: shares,
          entryPrice: price,
          stopLoss: signal.suggestedStopLoss,
          takeProfit: signal.suggestedTakeProfit,
          entryDate: dateStr,
        };
      }
    }

    // Mark to market equity
    const positionValue = activePosition ? activePosition.quantity * currentCandle.close : 0;
    equity = Number((cash + positionValue).toFixed(2));

    if (equity > peakEquity) peakEquity = equity;
    const currentDrawdown = ((peakEquity - equity) / peakEquity) * 100;
    if (currentDrawdown > maxDrawdown) maxDrawdown = currentDrawdown;

    equityCurve.push({
      date: dateStr,
      equity,
    });
  }

  // Close remaining position at last candle close
  if (activePosition) {
    const lastCandle = candles[candles.length - 1];
    const exitPrice = lastCandle.close;
    const gross = exitPrice * activePosition.quantity;
    const cost = activePosition.entryPrice * activePosition.quantity;
    const pnl = Number((gross - cost - 2.0).toFixed(2));
    const pnlPct = Number((((exitPrice - activePosition.entryPrice) / activePosition.entryPrice) * 100).toFixed(2));

    cash += gross - 2.0;
    equity = cash;
    if (pnl > 0) {
      winningTrades++;
      grossProfits += pnl;
    } else {
      losingTrades++;
      grossLosses += Math.abs(pnl);
    }

    trades.push({
      entryDate: activePosition.entryDate,
      exitDate: new Date(lastCandle.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      side: 'BUY',
      entryPrice: activePosition.entryPrice,
      exitPrice,
      pnl,
      pnlPct,
      reason: 'End of Backtest Period',
    });
  }

  const totalTrades = winningTrades + losingTrades;
  const winRatePct = totalTrades > 0 ? Number(((winningTrades / totalTrades) * 100).toFixed(1)) : 0;
  const profitFactor = grossLosses > 0 ? Number((grossProfits / grossLosses).toFixed(2)) : grossProfits > 0 ? 9.99 : 1.0;
  const totalReturnPct = Number((((equity - initialBalance) / initialBalance) * 100).toFixed(2));
  const annualizedReturnPct = Number((totalReturnPct * (365 / days)).toFixed(2));

  // Approx Sharpe ratio
  const sharpeRatio = maxDrawdown > 0 ? Number((totalReturnPct / (maxDrawdown * 0.8 + 1)).toFixed(2)) : 1.8;

  return {
    symbol,
    startDate: new Date(candles[minWarmup].timestamp).toLocaleDateString(),
    endDate: new Date(candles[candles.length - 1].timestamp).toLocaleDateString(),
    initialBalance,
    finalBalance: Number(equity.toFixed(2)),
    totalReturnPct,
    annualizedReturnPct,
    maxDrawdownPct: Number(maxDrawdown.toFixed(2)),
    sharpeRatio,
    profitFactor,
    winRatePct,
    totalTrades,
    winningTrades,
    losingTrades,
    trades: trades.reverse(),
    equityCurve,
  };
}
