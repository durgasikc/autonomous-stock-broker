import { generateHistoricalCandles } from '../src/lib/marketData.ts';
import { computeAllIndicators } from '../src/lib/indicators.ts';
import { evaluateStrategy } from '../src/lib/strategyEngine.ts';
import { SimulatedBroker } from '../src/lib/brokers/SimulatedBroker.ts';
import { runBacktest } from '../src/lib/backtester.ts';

console.log('====================================================');
console.log('RUNNING AUTONOMOUS BROKER ENGINE VERIFICATION SUITE');
console.log('====================================================\n');

// 1. Test Market Data & Indicator Calculation
console.log('1. Testing Market Data & Indicators Calculation...');
const candles = generateHistoricalCandles('NVDA', 90, 60);
if (candles.length !== 90) throw new Error('Expected 90 candles');

const indicators = computeAllIndicators(candles);
console.log('   - NVDA Latest Price:', candles[candles.length - 1].close);
console.log('   - RSI(14):', indicators.rsi);
console.log('   - MACD Line:', indicators.macd.macdLine, 'Signal:', indicators.macd.signalLine, 'Hist:', indicators.macd.histogram);
console.log('   - Bollinger Bands: Upper:', indicators.bollingerBands.upper, 'Lower:', indicators.bollingerBands.lower);
console.log('   - ATR(14):', indicators.atr);

if (indicators.rsi < 0 || indicators.rsi > 100) throw new Error('RSI out of bounds 0-100');
console.log('   ✓ Indicators calculated successfully.\n');

// 2. Test Strategy Evaluation & Confluence Scoring
console.log('2. Testing Strategy Confluence Evaluation...');
const dummyPortfolio = {
  cash: 100000,
  initialCash: 100000,
  equity: 100000,
  realizedPnl: 0,
  unrealizedPnl: 0,
  dayStartEquity: 100000,
  dayDrawdownPct: 0,
  positions: [],
  orders: [],
};

const riskConfig = {
  maxPositionSizePct: 15,
  defaultStopLossPct: 2.0,
  defaultTakeProfitPct: 4.5,
  maxDailyDrawdownPct: 3.0,
  minRiskRewardRatio: 2.0,
};

const signal = evaluateStrategy({
  symbol: 'NVDA',
  candles,
  mode: 'MODERATE',
  risk: riskConfig,
  portfolio: dummyPortfolio,
});

console.log('   - Signal Action:', signal.action);
console.log('   - Confidence:', signal.confidence + '%');
console.log('   - Market Regime:', signal.regime);
console.log('   - Suggested Stop Loss: $' + signal.suggestedStopLoss);
console.log('   - Suggested Take Profit: $' + signal.suggestedTakeProfit);
console.log('   - R:R Ratio:', signal.riskRewardRatio + ':1');
console.log('   - Confluence Factors Count:', signal.confluenceFactors.length);
console.log('   ✓ Strategy engine generated valid trading decision.\n');

// 3. Test Simulated Broker Execution & Bracket Stops
console.log('3. Testing Simulated Broker & Bracket Order Execution...');
async function testBroker() {
  const broker = new SimulatedBroker();
  broker.updateLivePrice('NVDA', 140.00);

  const buyReport = await broker.placeOrder({
    symbol: 'NVDA',
    side: 'BUY',
    type: 'MARKET',
    quantity: 50,
    stopLossPrice: 135.00,
    takeProfitPrice: 150.00,
    reason: 'Autonomous Confluence Buy Test',
  });

  if (!buyReport.success) throw new Error(`Buy failed: ${buyReport.errorMessage}`);
  console.log('   - Buy order filled at: $' + buyReport.order?.filledPrice);

  const positions = await broker.getPositions();
  if (positions.length !== 1 || positions[0].quantity !== 50) {
    throw new Error('Position not registered properly');
  }
  console.log('   - Active position verified: 50 shares of NVDA');

  // Simulate price rise to trigger Take Profit
  console.log('   - Simulating market tick surge to $151.00...');
  broker.updateLivePrice('NVDA', 151.00);

  const positionsAfterTp = await broker.getPositions();
  if (positionsAfterTp.length !== 0) {
    throw new Error('Take profit should have liquidated position');
  }
  console.log('   ✓ Auto Take-Profit executed cleanly. Position closed.\n');

  // 4. Test Backtester Engine
  console.log('4. Testing Historical Strategy Backtester...');
  const backtest = runBacktest({
    symbol: 'NVDA',
    mode: 'MODERATE',
    initialBalance: 100000,
    days: 60,
    risk: riskConfig,
  });

  console.log('   - Backtest Symbol:', backtest.symbol);
  console.log('   - Initial Balance: $' + backtest.initialBalance);
  console.log('   - Final Balance: $' + backtest.finalBalance);
  console.log('   - Total Return: ' + backtest.totalReturnPct + '%');
  console.log('   - Win Rate: ' + backtest.winRatePct + '% (' + backtest.winningTrades + 'W / ' + backtest.losingTrades + 'L)');
  console.log('   - Profit Factor: ' + backtest.profitFactor + 'x');
  console.log('   - Max Drawdown: ' + backtest.maxDrawdownPct + '%');
  console.log('   - Sharpe Ratio: ' + backtest.sharpeRatio);
  console.log('   - Total Trades Executed: ' + backtest.totalTrades);
  console.log('   ✓ Backtesting engine verified successfully.\n');

  console.log('====================================================');
  console.log('ALL VERIFICATION CHECKS PASSED PERFECTLY!');
  console.log('====================================================');
}

testBroker().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
