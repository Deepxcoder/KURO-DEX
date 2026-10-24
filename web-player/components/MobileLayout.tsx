'use client';

import React, { useState } from 'react';
import { WorkoutSession } from '@/lib/types';
import { ExerciseCard } from './ExerciseCard';
import { RestTimerDrawer } from './RestTimerDrawer';
import { Calendar, ChevronLeft, ChevronRight, Edit3, BarChart2, Flame, Clock } from 'lucide-react';

interface MobileLayoutProps {
  sessions: WorkoutSession[];
  currentSession: WorkoutSession | null;
  onSelectSession: (session: WorkoutSession) => void;
  onToggleExercise: (exerciseId: string, newCompleted: boolean) => void;
  onOpenEditor: () => void;
  onOpenAnalytics: () => void;
  focusedExerciseIndex: number;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({
  sessions,
  currentSession,
  onSelectSession,
  onToggleExercise,
  onOpenEditor,
  onOpenAnalytics,
  focusedExerciseIndex
}) => {
  const [showDatePicker, setShowDatePicker] = useState(false);

  if (!currentSession) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-white/50">
        Loading session...
      </div>
    );
  }

  const currentIndex = sessions.findIndex(s => s.id === currentSession.id);
  const hasPrev = currentIndex < sessions.length - 1;
  const hasNext = currentIndex > 0;

  const goToPrev = () => {
    if (hasPrev) onSelectSession(sessions[currentIndex + 1]);
  };

  const goToNext = () => {
    if (hasNext) onSelectSession(sessions[currentIndex - 1]);
  };

  return (
    <div className="flex flex-col min-h-screen pb-24">
      {/* Sticky Mobile Header (Gym Sprint Mode) */}
      <header className="sticky top-0 z-30 glass-panel border-b border-white/10 px-4 py-3 backdrop-blur-2xl">
        <div className="flex items-center justify-between">
          {/* Workout Split & Date Badge */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-white hover:bg-white/10 transition-all"
            >
              <Calendar className="w-3.5 h-3.5 text-[#FF7A00]" />
              <span>{currentSession.dateStr}</span>
            </button>
            <span className="text-[11px] font-semibold text-white/50 font-mono-numbers flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#FF7A00]/80" /> {currentSession.timeStr}
            </span>
          </div>

          {/* Quick Actions: Analytics Drawer & Edit Mode Pill */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={onOpenAnalytics}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 border border-white/5 transition-all"
              title="Open Session Analytics"
            >
              <BarChart2 className="w-4 h-4 text-[#FF7A00]" />
            </button>

            <button
              onClick={onOpenEditor}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full btn-glass text-xs font-bold text-white hover:border-[#FF7A00]/40 transition-all"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#FF7A00]" />
              <span>Edit</span>
            </button>
          </div>
        </div>

        {/* Current Workout Split Title & Session Navigators */}
        <div className="mt-2.5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-[#FF7A00]" />
              <h2 className="text-base font-extrabold text-white tracking-tight truncate max-w-[220px]">
                {currentSession.muscleSplit}
              </h2>
            </div>
            <span className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">
              {currentSession.dayOfWeek} · Week {currentSession.weekNumber}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={goToPrev}
              disabled={!hasPrev}
              className="p-1.5 rounded-lg bg-white/5 text-white/60 hover:text-white disabled:opacity-30 transition-all"
              title="Previous Session"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={goToNext}
              disabled={!hasNext}
              className="p-1.5 rounded-lg bg-white/5 text-white/60 hover:text-white disabled:opacity-30 transition-all"
              title="Next Session"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dropdown Session Picker */}
        {showDatePicker && (
          <div className="mt-3 p-2 rounded-2xl glass-card border border-white/15 max-h-56 overflow-y-auto space-y-1">
            {sessions.map(s => (
              <button
                key={s.id}
                onClick={() => {
                  onSelectSession(s);
                  setShowDatePicker(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs flex justify-between items-center transition-all ${
                  s.id === currentSession.id
                    ? 'bg-[#FF7A00]/20 text-[#FF7A00] font-bold border border-[#FF7A00]/30'
                    : 'text-white/80 hover:bg-white/5'
                }`}
              >
                <span>{s.dateStr} — {s.muscleSplit}</span>
                <span className="text-[10px] text-white/40">{s.completionRate}%</span>
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Stretching / Warmup Banner */}
      {currentSession.stretchingNotes && (
        <div className="mx-4 mt-3 px-3.5 py-2 rounded-xl bg-white/5 border border-white/5 text-[11px] text-white/60 flex items-center justify-between">
          <span className="truncate">{currentSession.stretchingNotes}</span>
          <span className="font-mono-numbers text-amber-400 font-semibold flex-shrink-0">
            {currentSession.warmupMinutes}m warm
          </span>
        </div>
      )}

      {/* Main Exercise Stack */}
      <main className="flex-1 px-4 mt-3 space-y-3">
        {currentSession.exercises.map((exercise, idx) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            onToggle={onToggleExercise}
            isFocused={idx === focusedExerciseIndex}
          />
        ))}

        {currentSession.exercises.length === 0 && (
          <div className="glass-card rounded-2xl p-8 text-center text-white/40 text-xs">
            No exercises recorded in this session.
          </div>
        )}
      </main>

      {/* Rest Timer Drawer */}
      <RestTimerDrawer />
    </div>
  );
};
