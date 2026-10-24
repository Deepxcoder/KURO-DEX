'use client';

import React from 'react';
import { WorkoutSession } from '@/lib/types';
import { Flame, CheckCircle, Clock, Weight, Dumbbell, Award } from 'lucide-react';

interface AnalyticsPaneProps {
  session: WorkoutSession | null;
}

export const AnalyticsPane: React.FC<AnalyticsPaneProps> = ({ session }) => {
  if (!session) {
    return (
      <div className="glass-panel rounded-2xl p-6 border border-white/10 text-center text-white/50">
        No workout session selected
      </div>
    );
  }

  const completionPct = session.completionRate || 0;
  const isAllDone = completionPct === 100 && session.totalSets > 0;

  return (
    <aside className="space-y-4" aria-label="Session Analytics">
      {/* Session Primary KPI Glass Card */}
      <div className="glass-panel rounded-2xl p-5 border border-white/10 relative overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-[#FF7A00]" />
            <span className="text-xs font-bold uppercase tracking-wider text-white/80">
              Session Analytics
            </span>
          </div>
          <span className="text-[10px] font-mono-numbers font-semibold px-2 py-0.5 rounded-full bg-[#FF7A00]/10 text-[#FF7A00] border border-[#FF7A00]/20">
            Week {session.weekNumber} Arnold Split
          </span>
        </div>

        {/* Total Volume Metric */}
        <div className="my-3">
          <span className="text-xs text-white/50 uppercase font-semibold tracking-wider block">
            Total Tonnage Volume
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black font-mono-numbers text-white">
              {session.totalVolumeKg.toLocaleString()}
            </span>
            <span className="text-sm font-bold text-[#FF7A00]">kg</span>
          </div>
          <p className="text-[11px] text-white/40 mt-0.5">
            Calculated across {session.totalSets} work & cluster sets
          </p>
        </div>

        {/* Completion Progress Bar */}
        <div className="mt-5 pt-4 border-t border-white/5">
          <div className="flex justify-between items-center text-xs mb-1.5 font-semibold">
            <span className="text-white/60">Completion Rate</span>
            <span className={`font-mono-numbers ${isAllDone ? 'text-emerald-400' : 'text-[#FF7A00]'}`}>
              {completionPct}%
            </span>
          </div>
          <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isAllDone
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  : 'bg-gradient-to-r from-[#FF7A00] to-[#FFA800]'
              }`}
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Grid of Micro-KPIs */}
      <div className="grid grid-cols-2 gap-3">
        {/* Completed Sets */}
        <div className="glass-card rounded-xl p-3.5 border border-white/5">
          <div className="flex items-center gap-1.5 text-white/50 text-xs mb-1">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sets Done</span>
          </div>
          <div className="text-xl font-bold font-mono-numbers text-white">
            {session.completedSets} <span className="text-xs text-white/40 font-normal">/ {session.totalSets}</span>
          </div>
        </div>

        {/* Warmup Time */}
        <div className="glass-card rounded-xl p-3.5 border border-white/5">
          <div className="flex items-center gap-1.5 text-white/50 text-xs mb-1">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Warm-up</span>
          </div>
          <div className="text-xl font-bold font-mono-numbers text-white">
            {session.warmupMinutes || 8} <span className="text-xs text-white/40 font-normal">min</span>
          </div>
        </div>

        {/* Exercises Count */}
        <div className="glass-card rounded-xl p-3.5 border border-white/5">
          <div className="flex items-center gap-1.5 text-white/50 text-xs mb-1">
            <Dumbbell className="w-3.5 h-3.5 text-[#FF7A00]" />
            <span>Exercises</span>
          </div>
          <div className="text-xl font-bold font-mono-numbers text-white">
            {session.exercises.length}
          </div>
        </div>

        {/* Muscle Focus */}
        <div className="glass-card rounded-xl p-3.5 border border-white/5">
          <div className="flex items-center gap-1.5 text-white/50 text-xs mb-1">
            <Weight className="w-3.5 h-3.5 text-blue-400" />
            <span>Split Focus</span>
          </div>
          <div className="text-xs font-bold text-white truncate" title={session.muscleSplit}>
            {session.muscleSplit}
          </div>
        </div>
      </div>

      {/* Progressive Overload Insight Callout */}
      <div className="glass-card rounded-2xl p-4 border border-white/5 flex items-start gap-3">
        <div className="p-2 rounded-xl bg-[#FF7A00]/10 text-[#FF7A00]">
          <Award className="w-5 h-5" />
        </div>
        <div>
          <h5 className="text-xs font-bold text-white">Intensity Protocol</h5>
          <p className="text-[11px] text-white/50 leading-relaxed mt-0.5">
            Rest-pause (RP) and half-rep tokens indicate training beyond momentary muscular failure. Aim for +1 rep or +1.5kg on your working sets next rotation.
          </p>
        </div>
      </div>
    </aside>
  );
};
