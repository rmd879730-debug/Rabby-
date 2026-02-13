
import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface ScoreBoardProps {
  score: number;
  highScore: number;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const ScoreBoard: React.FC<ScoreBoardProps> = ({ score, highScore, isMuted, onToggleMute }) => {
  return (
    <div className="flex justify-between items-center w-full px-6 py-4 bg-slate-900/50 backdrop-blur-md border-b border-slate-800 sticky top-0 z-20">
      <div className="flex items-center gap-6">
        <div className="flex flex-col">
          <span className="text-slate-400 text-xs uppercase tracking-widest font-semibold text-[10px]">Current Score</span>
          <span className="text-3xl font-bold text-emerald-400 font-mono leading-none">{score.toString().padStart(4, '0')}</span>
        </div>
        <button 
          onClick={onToggleMute}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-emerald-400"
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
      </div>
      
      <div className="flex flex-col items-end">
        <span className="text-slate-400 text-xs uppercase tracking-widest font-semibold text-[10px]">Best Record</span>
        <span className="text-3xl font-bold text-rose-400 font-mono leading-none">{highScore.toString().padStart(4, '0')}</span>
      </div>
    </div>
  );
};
