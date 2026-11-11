'use client';

import React, { useState } from 'react';
import {
  BrokerSettings,
  BrokerType,
  RiskManagementConfig,
  AgentMode,
} from '../types';
import {
  X,
  Shield,
  Server,
  Save,
  CheckCircle,
  ExternalLink,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react';

interface RiskSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  brokerSettings: BrokerSettings;
  riskConfig: RiskManagementConfig;
  onSave: (broker: BrokerSettings, risk: RiskManagementConfig) => void;
}

export const RiskSettingsModal: React.FC<RiskSettingsModalProps> = ({
  isOpen,
  onClose,
  brokerSettings,
  riskConfig,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<'BROKER' | 'RISK'>('BROKER');
  const [localBroker, setLocalBroker] = useState<BrokerSettings>(brokerSettings);
  const [localRisk, setLocalRisk] = useState<RiskManagementConfig>(riskConfig);
  const [savedNotice, setSavedNotice] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(localBroker, localRisk);
    setSavedNotice(true);
    setTimeout(() => {
      setSavedNotice(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 select-none">
      <div className="bg-[#0f1420] border border-broker-border rounded-xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-broker-border flex items-center justify-between bg-[#121826]">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-bold font-mono text-white tracking-wide">
              CONFIGURATION &amp; RISK PROTOCOLS
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-broker-border bg-[#0b0f19] px-5 text-xs font-mono">
          <button
            onClick={() => setActiveTab('BROKER')}
            className={`py-3 px-4 font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'BROKER'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>Broker Integration</span>
          </button>
          <button
            onClick={() => setActiveTab('RISK')}
            className={`py-3 px-4 font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'RISK'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Risk Guardrails &amp; Limits</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs font-mono">
          {activeTab === 'BROKER' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-2">
                  Active Execution Broker
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setLocalBroker({ ...localBroker, activeBroker: 'PAPER' })}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      localBroker.activeBroker === 'PAPER'
                        ? 'bg-emerald-950/40 border-emerald-500 text-white'
                        : 'bg-[#151b29] border-broker-border text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5 text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      Paper Trading Engine
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Safe zero-risk simulated order book with slippage and commission models.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setLocalBroker({ ...localBroker, activeBroker: 'INTERACTIVE_BROKERS' })
                    }
                    className={`p-3 rounded-lg border text-left transition-all ${
                      localBroker.activeBroker === 'INTERACTIVE_BROKERS'
                        ? 'bg-amber-950/40 border-amber-500 text-white'
                        : 'bg-[#151b29] border-broker-border text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5 text-amber-400">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      Interactive Brokers (IBKR)
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Direct integration with IBKR Client Portal Web API / Gateway.
                    </div>
                  </button>
                </div>
              </div>

              {localBroker.activeBroker === 'INTERACTIVE_BROKERS' && (
                <div className="bg-[#131929] border border-amber-900/40 rounded-lg p-3 space-y-3">
                  <div className="flex items-center gap-1.5 text-amber-300 font-semibold text-[11px]">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>Interactive Brokers Client Portal Configuration</span>
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">
                      IBKR Client Portal Gateway Base URL
                    </label>
                    <input
                      type="text"
                      value={localBroker.ibkr.baseUrl}
                      onChange={(e) =>
                        setLocalBroker({
                          ...localBroker,
                          ibkr: { ...localBroker.ibkr, baseUrl: e.target.value },
                        })
                      }
                      className="w-full bg-[#0a0e17] border border-broker-border rounded p-2 text-white font-mono"
                      placeholder="https://localhost:5000/v1/api"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">
                      IBKR Account ID (Paper or Live)
                    </label>
                    <input
                      type="text"
                      value={localBroker.ibkr.accountId}
                      onChange={(e) =>
                        setLocalBroker({
                          ...localBroker,
                          ibkr: { ...localBroker.ibkr, accountId: e.target.value },
                        })
                      }
                      className="w-full bg-[#0a0e17] border border-broker-border rounded p-2 text-white font-mono"
                      placeholder="e.g. DU123456 or U123456"
                    />
                  </div>

                  <div className="bg-[#0b0f19] p-2.5 rounded border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
                    <strong className="text-slate-300">IBKR Setup Quick Guide:</strong>
                    <ol className="list-decimal list-inside space-y-1 mt-1 text-slate-400">
                      <li>Download &amp; run IBKR Client Portal Gateway (`clientportal.gw`).</li>
                      <li>Authenticate locally via browser at `https://localhost:5000`.</li>
                      <li>The autonomous engine connects to `/v1/api/iserver` routes.</li>
                    </ol>
                  </div>
                </div>
              )}

              {localBroker.activeBroker === 'PAPER' && (
                <div className="bg-[#121826] border border-broker-border rounded-lg p-3 space-y-3">
                  <div className="font-semibold text-slate-200">Paper Trading Execution Model</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 text-[11px] mb-1">
                        Slippage Percentage (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={localBroker.paper.slippagePct}
                        onChange={(e) =>
                          setLocalBroker({
                            ...localBroker,
                            paper: {
                              ...localBroker.paper,
                              slippagePct: parseFloat(e.target.value) || 0.05,
                            },
                          })
                        }
                        className="w-full bg-[#0a0e17] border border-broker-border rounded p-2 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[11px] mb-1">
                        Commission ($ / share)
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        value={localBroker.paper.commissionPerShare}
                        onChange={(e) =>
                          setLocalBroker({
                            ...localBroker,
                            paper: {
                              ...localBroker.paper,
                              commissionPerShare: parseFloat(e.target.value) || 0.005,
                            },
                          })
                        }
                        className="w-full bg-[#0a0e17] border border-broker-border rounded p-2 text-white font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-900/50 flex items-start gap-2.5">
                <Shield className="w-5 h-5 text-rose-400 mt-0.5" />
                <div className="text-[11px] leading-relaxed text-rose-200">
                  <strong className="text-white block font-semibold mb-0.5">
                    Autonomous Risk Guardrails
                  </strong>
                  These mathematical circuit breakers are enforced before any order is submitted. If daily drawdown is exceeded, the agent halts automatically.
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-slate-300 font-semibold">
                      Max Position Size (% of Portfolio)
                    </label>
                    <span className="text-cyan-400 font-bold">
                      {localRisk.maxPositionSizePct}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="30"
                    step="1"
                    value={localRisk.maxPositionSizePct}
                    onChange={(e) =>
                      setLocalRisk({
                        ...localRisk,
                        maxPositionSizePct: Number(e.target.value),
                      })
                    }
                    className="w-full accent-cyan-400"
                  />
                  <div className="text-[10px] text-slate-500">
                    Capped capital allocation per single stock position.
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-slate-300 font-semibold">
                      Daily Drawdown Circuit Breaker Limit (%)
                    </label>
                    <span className="text-rose-400 font-bold">
                      {localRisk.maxDailyDrawdownPct}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="0.5"
                    value={localRisk.maxDailyDrawdownPct}
                    onChange={(e) =>
                      setLocalRisk({
                        ...localRisk,
                        maxDailyDrawdownPct: Number(e.target.value),
                      })
                    }
                    className="w-full accent-rose-400"
                  />
                  <div className="text-[10px] text-slate-500">
                    Trading is immediately frozen for the day if equity drops by this threshold.
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Default Stop-Loss (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={localRisk.defaultStopLossPct}
                      onChange={(e) =>
                        setLocalRisk({
                          ...localRisk,
                          defaultStopLossPct: parseFloat(e.target.value) || 2.0,
                        })
                      }
                      className="w-full bg-[#0a0e17] border border-broker-border rounded p-2 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Min Risk/Reward Ratio
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={localRisk.minRiskRewardRatio}
                      onChange={(e) =>
                        setLocalRisk({
                          ...localRisk,
                          minRiskRewardRatio: parseFloat(e.target.value) || 2.0,
                        })
                      }
                      className="w-full bg-[#0a0e17] border border-broker-border rounded p-2 text-white font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-broker-border bg-[#121826] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded text-slate-400 hover:text-white transition-colors text-xs font-mono"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs font-mono transition-colors shadow-sm"
          >
            {savedNotice ? (
              <>
                <CheckCircle className="w-4 h-4 text-white" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Configuration</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
