
import React from 'react';
import { AITip } from '../types';
import { Sparkles, Terminal } from 'lucide-react';

interface AICoachProps {
  tip: AITip | null;
  isLoading: boolean;
}

export const AICoach: React.FC<AICoachProps> = ({ tip, isLoading }) => {
  return (
    <div className="flex flex-col gap-4 p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl w-full max-w-xs transition-all duration-300">
      <div className="flex items-center gap-2 text-emerald-400 border-b border-emerald-900/30 pb-3">
        <Terminal size={18} />
        <h3 className="text-sm font-bold uppercase tracking-wider">Strategy Coach</h3>
      </div>
      
      <div className="min-h-[80px] flex items-center justify-center italic text-slate-300 relative">
        {isLoading ? (
          <div className="flex gap-1">
            <div className="w-1 h-1 bg-emerald-400 rounded-full animate-bounce"></div>
            <div className="w-1 h-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-1 h-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          </div>
        ) : tip ? (
          <div className="text-sm leading-relaxed text-center group">
            <span className="absolute -top-4 -left-2 text-rose-500 opacity-20 group-hover:opacity-40 transition-opacity">
              <Sparkles size={24} />
            </span>
            "{tip.text}"
          </div>
        ) : (
          <p className="text-xs text-slate-500 text-center uppercase tracking-tighter">Awaiting movement data...</p>
        )}
      </div>

      <div className="text-[10px] text-slate-600 font-mono flex justify-between">
        <span>GEMINI_3_FLASH_ONLINE</span>
        <span className="animate-pulse">●</span>
      </div>
    </div>
  );
};
