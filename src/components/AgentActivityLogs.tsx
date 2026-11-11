'use client';

import React, { useRef, useEffect } from 'react';
import { AgentLog } from '../types';
import { Terminal, ShieldAlert, Zap, ShoppingCart, Info, AlertTriangle } from 'lucide-react';

interface AgentActivityLogsProps {
  logs: AgentLog[];
  onClearLogs: () => void;
}

export const AgentActivityLogs: React.FC<AgentActivityLogsProps> = ({ logs, onClearLogs }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = React.useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getLogIcon = (level: AgentLog['level']) => {
    switch (level) {
      case 'TRADE':
        return <ShoppingCart className="w-3.5 h-3.5 text-emerald-400 mt-0.5" />;
      case 'SIGNAL':
        return <Zap className="w-3.5 h-3.5 text-cyan-400 mt-0.5" />;
      case 'RISK_ALERT':
        return <ShieldAlert className="w-3.5 h-3.5 text-rose-400 mt-0.5" />;
      case 'ERROR':
        return <AlertTriangle className="w-3.5 h-3.5 text-rose-500 mt-0.5" />;
      default:
        return <Info className="w-3.5 h-3.5 text-slate-400 mt-0.5" />;
    }
  };

  const getLevelBadge = (level: AgentLog['level']) => {
    switch (level) {
      case 'TRADE':
        return 'text-emerald-400 bg-emerald-950/60 border-emerald-800';
      case 'SIGNAL':
        return 'text-cyan-400 bg-cyan-950/60 border-cyan-800';
      case 'RISK_ALERT':
        return 'text-rose-400 bg-rose-950/60 border-rose-800 animate-pulse';
      case 'ERROR':
        return 'text-rose-400 bg-rose-950 border-rose-700';
      default:
        return 'text-slate-400 bg-slate-900 border-slate-800';
    }
  };

  return (
    <div className="bg-broker-card border border-broker-border rounded-lg overflow-hidden flex flex-col h-full select-none">
      <div className="bg-[#0f1420] border-b border-broker-border px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold font-mono text-slate-200 uppercase tracking-wide">
            Autonomous Agent Terminal
          </h3>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
        <button
          onClick={onClearLogs}
          className="text-[10px] font-mono text-slate-500 hover:text-slate-300 transition-colors"
        >
          Clear
        </button>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto max-h-[220px] p-2.5 space-y-2 font-mono text-xs bg-[#080b12]"
      >
        {logs.map((log) => {
          const time = isMounted
            ? new Date(log.timestamp).toLocaleTimeString('en-US', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })
            : '--:--:--';

          return (
            <div key={log.id} className="flex items-start gap-2 leading-relaxed">
              <span suppressHydrationWarning className="text-slate-500 text-[10px] select-none pt-0.5">
                {time}
              </span>
              {getLogIcon(log.level)}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] px-1 py-0.2 rounded border font-semibold ${getLevelBadge(log.level)}`}>
                    {log.level}
                  </span>
                  {log.symbol && (
                    <span className="text-cyan-300 font-bold text-[11px]">{log.symbol}</span>
                  )}
                  <span className="text-slate-200 font-semibold text-[11px]">{log.title}</span>
                </div>
                <div className="text-slate-400 text-[11px] mt-0.5 whitespace-pre-wrap">{log.message}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
