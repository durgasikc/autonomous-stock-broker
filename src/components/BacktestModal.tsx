'use client';

import React, { useState } from 'react';
import { AgentMode, BacktestResult, RiskManagementConfig } from '../types';
import { WATCHLIST } from '../lib/marketData';
import { runBacktest } from '../lib/backtester';
import {
  X,
  Play,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Award,
  Shield,
  Layers,
  Calendar,
} from 'lucide-react';

interface BacktestModalProps {
  isOpen: boolean;
  onClose: () => void;
  riskConfig: RiskManagementConfig;
}

export const BacktestModal: React.FC<BacktestModalProps> = ({
  isOpen,
  onClose,
  riskConfig,
}) => {
  const [symbol, setSymbol] = useState('NVDA');
  const [mode, setMode] = useState<AgentMode>('MODERATE');
  const [days, setDays] = useState(60);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  if (!isOpen) return null;

  const handleRun = () => {
    setIsRunning(true);
    setTimeout(() => {
      const res = runBacktest({
        symbol,
        mode,
        initialBalance: 100000,
        days,
        risk: riskConfig,
      });
      setResult(res);
      setIsRunning(false);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none">
      <div className="bg-[#0f1420] border border-broker-border rounded-xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-broker-border flex items-center justify-between bg-[#121826]">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-bold font-mono text-white tracking-wide">
              HISTORICAL STRATEGY BACKTESTING SIMULATOR
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Backtest Parameters Toolbar */}
        <div className="p-4 bg-[#0a0e17] border-b border-broker-border flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <span className="text-slate-400 text-[10px] block mb-1">ASSET TICKER</span>
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="bg-[#151b29] border border-broker-border rounded px-2.5 py-1.5 text-white font-mono"
              >
                {Object.keys(WATCHLIST).map((tick) => (
                  <option key={tick} value={tick}>
                    {tick} - {WATCHLIST[tick].name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="text-slate-400 text-[10px] block mb-1">STRATEGY MODE</span>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as AgentMode)}
                className="bg-[#151b29] border border-broker-border rounded px-2.5 py-1.5 text-white font-mono"
              >
                <option value="CONSERVATIVE">Conservative (High Confluence)</option>
                <option value="MODERATE">Moderate (Standard Confluence)</option>
                <option value="AGGRESSIVE">Aggressive (Momentum Scalp)</option>
              </select>
            </div>

            <div>
              <span className="text-slate-400 text-[10px] block mb-1">LOOKBACK PERIOD</span>
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="bg-[#151b29] border border-broker-border rounded px-2.5 py-1.5 text-white font-mono"
              >
                <option value={30}>30 Days (Hourly)</option>
                <option value={60}>60 Days (Hourly)</option>
                <option value={90}>90 Days (Hourly)</option>
                <option value={180}>180 Days (Hourly)</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleRun}
            disabled={isRunning}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all shadow-md"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{isRunning ? 'Simulating...' : 'RUN BACKTEST'}</span>
          </button>
        </div>

        {/* Backtest Output */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs font-mono">
          {result ? (
            <div className="space-y-5">
              {/* Scorecard Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-[#121826] border border-broker-border p-3.5 rounded-lg">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                    Total Return
                  </div>
                  <div
                    className={`text-lg font-bold mt-1 flex items-center gap-1 ${
                      result.totalReturnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {result.totalReturnPct >= 0 ? '+' : ''}
                    {result.totalReturnPct}%
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Ending Equity: ${result.finalBalance.toLocaleString()}
                  </div>
                </div>

                <div className="bg-[#121826] border border-broker-border p-3.5 rounded-lg">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                    Win Rate
                  </div>
                  <div className="text-lg font-bold text-cyan-400 mt-1 flex items-center gap-1">
                    <Award className="w-4 h-4" />
                    {result.winRatePct}%
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    {result.winningTrades} Wins / {result.losingTrades} Losses ({result.totalTrades} Total)
                  </div>
                </div>

                <div className="bg-[#121826] border border-broker-border p-3.5 rounded-lg">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                    Profit Factor
                  </div>
                  <div className="text-lg font-bold text-white mt-1">
                    {result.profitFactor}x
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Gross Win/Loss Ratio
                  </div>
                </div>

                <div className="bg-[#121826] border border-broker-border p-3.5 rounded-lg">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                    Max Drawdown
                  </div>
                  <div className="text-lg font-bold text-rose-400 mt-1 flex items-center gap-1">
                    <Shield className="w-4 h-4" />
                    -{result.maxDrawdownPct}%
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Sharpe Ratio: {result.sharpeRatio}
                  </div>
                </div>
              </div>

              {/* Equity Curve SVG */}
              <div className="bg-[#101522] border border-broker-border rounded-lg p-4">
                <div className="text-xs font-semibold text-slate-200 mb-2 flex items-center justify-between">
                  <span>Simulated Equity Curve ($100k Initial Capital)</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {result.startDate} → {result.endDate}
                  </span>
                </div>
                <div className="h-44 w-full relative">
                  <svg className="w-full h-full overflow-visible">
                    {/* SVG Equity Line */}
                    {(() => {
                      const points = result.equityCurve;
                      if (!points || points.length < 2) return null;
                      const equities = points.map((p) => p.equity);
                      const minEq = Math.min(...equities) * 0.98;
                      const maxEq = Math.max(...equities) * 1.02;
                      const range = maxEq - minEq || 1;

                      const polyPoints = points
                        .map((pt, i) => {
                          const x = (i / (points.length - 1)) * 740;
                          const y = 160 - ((pt.equity - minEq) / range) * 140;
                          return `${x},${y}`;
                        })
                        .join(' ');

                      const isOverallProfitable = result.totalReturnPct >= 0;

                      return (
                        <>
                          <line
                            x1="0"
                            y1={160 - ((100000 - minEq) / range) * 140}
                            x2="740"
                            y2={160 - ((100000 - minEq) / range) * 140}
                            stroke="#334155"
                            strokeDasharray="4 4"
                          />
                          <polyline
                            points={polyPoints}
                            fill="none"
                            stroke={isOverallProfitable ? '#10b981' : '#ef4444'}
                            strokeWidth="2.5"
                          />
                        </>
                      );
                    })()}
                  </svg>
                </div>
              </div>

              {/* Simulated Trades Table */}
              <div className="bg-[#101522] border border-broker-border rounded-lg overflow-hidden">
                <div className="bg-[#141b2a] px-4 py-2 text-xs font-semibold text-slate-200 border-b border-broker-border">
                  Executed Backtest Trades ({result.trades.length})
                </div>
                <div className="max-h-48 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-broker-border text-[10px] text-slate-400 uppercase bg-[#090d16]">
                        <th className="p-2">Entry</th>
                        <th className="p-2">Exit</th>
                        <th className="p-2 text-right">Entry Price</th>
                        <th className="p-2 text-right">Exit Price</th>
                        <th className="p-2 text-right">P&amp;L ($)</th>
                        <th className="p-2 text-right">P&amp;L (%)</th>
                        <th className="p-2">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-broker-border/40">
                      {result.trades.map((t, idx) => {
                        const isWin = t.pnl >= 0;
                        return (
                          <tr key={idx} className="hover:bg-[#161e30]">
                            <td className="p-2 text-slate-300">{t.entryDate}</td>
                            <td className="p-2 text-slate-300">{t.exitDate}</td>
                            <td className="p-2 text-right text-slate-200">${t.entryPrice.toFixed(2)}</td>
                            <td className="p-2 text-right text-slate-200">${t.exitPrice.toFixed(2)}</td>
                            <td className={`p-2 text-right font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {isWin ? '+' : ''}${t.pnl.toFixed(2)}
                            </td>
                            <td className={`p-2 text-right ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {isWin ? '+' : ''}{t.pnlPct.toFixed(2)}%
                            </td>
                            <td className="p-2 text-slate-400 text-[11px]">{t.reason}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-slate-500 font-mono">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30 text-cyan-400" />
              <div className="text-sm font-semibold text-slate-400">Backtest Ready</div>
              <div className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Select your asset ticker and strategy mode above, then click &quot;Run Backtest&quot; to test performance against historical market data.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
