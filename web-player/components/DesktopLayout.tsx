'use client';

import React, { useState } from 'react';
import { WorkoutSession } from '@/lib/types';
import { ExerciseCard } from './ExerciseCard';
import { AnalyticsPane } from './AnalyticsPane';
import { RestTimerDrawer } from './RestTimerDrawer';
import {
  Calendar,
  Flame,
  Clock,
  Edit3,
  Dumbbell,
  CheckCircle2,
  Search,
  Github,
  HardDrive
} from 'lucide-react';

interface DesktopLayoutProps {
  sessions: WorkoutSession[];
  currentSession: WorkoutSession | null;
  onSelectSession: (session: WorkoutSession) => void;
  onToggleExercise: (exerciseId: string, newCompleted: boolean) => void;
  onOpenEditor: () => void;
  focusedExerciseIndex: number;
  source: 'github' | 'local';
}

export const DesktopLayout: React.FC<DesktopLayoutProps> = ({
  sessions,
  currentSession,
  onSelectSession,
  onToggleExercise,
  onOpenEditor,
  focusedExerciseIndex,
  source
}) => {
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

  if (!currentSession) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-white/50">
        Loading session...
      </div>
    );
  }

  // Filter sessions by week and text search
  const filteredSessions = sessions.filter(s => {
    const matchesWeek = selectedWeek === null || s.weekNumber === selectedWeek;
    const matchesSearch =
      !searchFilter ||
      s.dateStr.toLowerCase().includes(searchFilter.toLowerCase()) ||
      s.muscleSplit.toLowerCase().includes(searchFilter.toLowerCase()) ||
      s.exercises.some(e => e.name.toLowerCase().includes(searchFilter.toLowerCase()));
    return matchesWeek && matchesSearch;
  });

  return (
    <div className="flex flex-col min-h-screen">
      {/* Top Glass Navigation Bar */}
      <header className="sticky top-0 z-30 glass-panel border-b border-white/10 px-6 py-3.5 backdrop-blur-2xl flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#FF7A00] to-[#FFA800] flex items-center justify-center text-black font-black text-sm shadow-lg shadow-[#FF7A00]/25">
            KD
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-tight text-white flex items-center gap-2">
              KURODEX WORKOUT PLAYER
              <span className="text-[10px] font-mono-numbers font-bold px-2 py-0.5 rounded-full bg-[#FF7A00]/10 text-[#FF7A00] border border-[#FF7A00]/25">
                v2.0
              </span>
            </h1>
            <p className="text-[11px] text-white/40">
              Interactive Arnold Split & Live Markdown Engine
            </p>
          </div>
        </div>

        {/* Center: Keyboard Shortcuts Legend */}
        <div className="hidden lg:flex items-center gap-3 text-[11px] text-white/40 font-mono-numbers">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/70">E</kbd> Editor
          </span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/70">Space</kbd> Timer
          </span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/70">J</kbd>/
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/70">K</kbd> Navigate
          </span>
        </div>

        {/* Right: Source Indicator & Action Pill */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono-numbers">
            {source === 'github' ? (
              <>
                <Github className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">GitHub Commits</span>
              </>
            ) : (
              <>
                <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-amber-400 font-semibold">Local Storage</span>
              </>
            )}
          </div>

          <button
            onClick={onOpenEditor}
            className="flex items-center gap-2 px-4 py-2 rounded-xl btn-neon-orange text-xs font-bold transition-all"
            title="Edit Workout.md Directly [Shortcut: E]"
          >
            <Edit3 className="w-4 h-4" />
            <span>Edit Markdown</span>
          </button>
        </div>
      </header>

      {/* 3-Column Wide Stage */}
      <div className="flex-1 max-w-[1720px] w-full mx-auto p-6 grid grid-cols-12 gap-6 items-start">
        {/* ============================================================== */}
        {/* Left Column: 4-Week Arnold Split Navigator & History (Col 1-3) */}
        {/* ============================================================== */}
        <aside className="col-span-3 space-y-4" aria-label="Split Navigator">
          {/* Week Filter Pills (Arnold Split: Week 1 to 4) */}
          <div className="glass-panel rounded-2xl p-4 border border-white/10">
            <div className="text-xs font-bold uppercase tracking-wider text-white/60 mb-3 flex items-center justify-between">
              <span>Arnold Split Cycle</span>
              {selectedWeek !== null && (
                <button
                  onClick={() => setSelectedWeek(null)}
                  className="text-[10px] text-[#FF7A00] hover:underline"
                >
                  Clear Filter
                </button>
              )}
            </div>

            <div className="grid grid-cols-4 gap-1.5 mb-3">
              {[1, 2, 3, 4].map(w => (
                <button
                  key={w}
                  onClick={() => setSelectedWeek(selectedWeek === w ? null : w)}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                    selectedWeek === w
                      ? 'bg-[#FF7A00] text-black font-extrabold shadow-md shadow-[#FF7A00]/25'
                      : 'bg-white/5 hover:bg-white/10 text-white/70 border border-white/5'
                  }`}
                >
                  Wk {w}
                </button>
              ))}
            </div>

            {/* Quick Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                placeholder="Search date or movement..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#FF7A00]/50"
              />
            </div>
          </div>

          {/* Session Timeline Feed */}
          <div className="glass-panel rounded-2xl p-3 border border-white/10 max-h-[calc(100vh-270px)] overflow-y-auto space-y-2">
            <div className="px-2 py-1 text-[11px] font-bold text-white/40 uppercase tracking-wider">
              Recorded Workouts ({filteredSessions.length})
            </div>

            {filteredSessions.map(session => {
              const isSelected = session.id === currentSession.id;
              const isDone = session.completionRate === 100 && session.totalSets > 0;

              return (
                <button
                  key={session.id}
                  onClick={() => onSelectSession(session)}
                  className={`w-full text-left p-3 rounded-xl border transition-all duration-200 block ${
                    isSelected
                      ? 'bg-[#FF7A00]/15 border-[#FF7A00]/60 shadow-lg shadow-[#FF7A00]/10'
                      : 'glass-card hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold font-mono-numbers text-white flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-[#FF7A00]" />
                      {session.dateStr}
                    </span>
                    <span className="text-[10px] text-white/40 font-mono-numbers">
                      {session.timeStr}
                    </span>
                  </div>

                  <div className="text-xs font-semibold text-white/80 truncate">
                    {session.muscleSplit}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-white/40 mt-2 font-mono-numbers">
                    <span>{session.exercises.length} moves · {session.totalSets} sets</span>
                    <span className={isDone ? 'text-emerald-400 font-bold' : ''}>
                      {session.completionRate}%
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* ============================================================== */}
        {/* Center Column: Main Stage / Workout Details (Col 4-9)          */}
        {/* ============================================================== */}
        <main className="col-span-6 space-y-5">
          {/* Main Stage Header Card */}
          <div className="glass-panel rounded-2xl p-6 border border-white/10 relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#FF7A00]/10 text-[#FF7A00] border border-[#FF7A00]/25 text-xs font-bold">
                    Week {currentSession.weekNumber} Arnold Split
                  </span>
                  <span className="text-xs font-semibold text-white/50">
                    {currentSession.dayOfWeek}
                  </span>
                </div>
                <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  <Flame className="w-6 h-6 text-[#FF7A00]" />
                  {currentSession.muscleSplit}
                </h2>
              </div>

              <div className="text-right font-mono-numbers">
                <div className="text-2xl font-bold text-white flex items-center gap-1 justify-end">
                  <Clock className="w-4 h-4 text-white/40" />
                  {currentSession.timeStr}
                </div>
                <div className="text-xs text-white/40 mt-0.5">
                  {currentSession.dateStr}
                </div>
              </div>
            </div>

            {/* Warmup / Stretching Banner */}
            {currentSession.stretchingNotes && (
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-white/60">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  {currentSession.stretchingNotes}
                </span>
                <span className="font-mono-numbers text-amber-400 font-semibold">
                  ~{currentSession.warmupMinutes}m warm-up
                </span>
              </div>
            )}
          </div>

          {/* Exercise Cards Stack */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-white/50 px-1">
              <span>Planned Movements ({currentSession.exercises.length})</span>
              <span>Tap Checkbox to Complete Sets</span>
            </div>

            {currentSession.exercises.map((exercise, idx) => (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                onToggle={onToggleExercise}
                isFocused={idx === focusedExerciseIndex}
              />
            ))}

            {currentSession.exercises.length === 0 && (
              <div className="glass-card rounded-2xl p-12 text-center text-white/40 text-sm">
                No exercises found in this session. Click <strong>Edit Markdown</strong> above to add movements.
              </div>
            )}
          </div>
        </main>

        {/* ============================================================== */}
        {/* Right Column: Analytics & Volume Rail (Col 10-12)              */}
        {/* ============================================================== */}
        <div className="col-span-3">
          <AnalyticsPane session={currentSession} />
        </div>
      </div>

      {/* Floating Rest Timer Component */}
      <RestTimerDrawer />
    </div>
  );
};
