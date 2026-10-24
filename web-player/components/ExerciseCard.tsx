'use client';

import React from 'react';
import { WorkoutExercise } from '@/lib/types';
import { Check, Dumbbell, Zap } from 'lucide-react';

interface ExerciseCardProps {
  exercise: WorkoutExercise;
  onToggle: (exerciseId: string, newCompleted: boolean) => void;
  isFocused?: boolean;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({
  exercise,
  onToggle,
  isFocused = false
}) => {
  const isDone = exercise.completed;

  // Calculate total volume for this exercise
  const exerciseVolume = exercise.sets.reduce((sum, s) => sum + (s.totalReps * s.weight), 0);
  const maxWeight = exercise.sets.reduce((max, s) => Math.max(max, s.weight), 0);

  return (
    <div
      className={`relative w-full rounded-2xl p-4 md:p-5 transition-all duration-300 border ${
        isDone
          ? 'bg-[#12121A]/50 border-emerald-500/30 opacity-85'
          : isFocused
          ? 'glass-card-active'
          : 'glass-card'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left Side: Exercise Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/5 text-[#FF7A00] border border-[#FF7A00]/20">
              {exercise.muscleSplit}
            </span>
            {exercise.code && (
              <span className="text-[10px] uppercase font-mono-numbers font-semibold px-1.5 py-0.5 rounded bg-white/5 text-white/50">
                {exercise.code}
              </span>
            )}
            {isDone && (
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <Check className="w-2.5 h-2.5" /> Done
              </span>
            )}
          </div>

          <h4 className={`text-base md:text-lg font-bold tracking-tight truncate ${
            isDone ? 'line-through text-white/60' : 'text-white'
          }`}>
            {exercise.name}
          </h4>

          {exercise.targetSets && exercise.targetReps && (
            <p className="text-xs text-white/50 mt-0.5 font-mono-numbers">
              Target: {exercise.targetSets} sets × {exercise.targetReps} reps
            </p>
          )}
        </div>

        {/* Right Side: Minimum 48px Interactive Tap Target Checkbox */}
        <button
          onClick={() => onToggle(exercise.id, !isDone)}
          className={`flex-shrink-0 min-w-[48px] min-h-[48px] w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
            isDone
              ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/30'
              : 'bg-white/5 hover:bg-white/10 text-white/40 border border-white/10 hover:border-[#FF7A00]/50'
          }`}
          title={isDone ? 'Mark as Incomplete' : 'Mark as Complete'}
          aria-label={`Toggle ${exercise.name}`}
        >
          <Check className={`w-6 h-6 stroke-[3] transition-transform ${isDone ? 'scale-100' : 'scale-75 opacity-0'}`} />
        </button>
      </div>

      {/* Set Clusters / Tag Badges */}
      {exercise.sets.length > 0 && (
        <div className="mt-4 pt-3 border-t border-white/5">
          <div className="flex items-center justify-between text-[11px] text-white/40 mb-2">
            <span className="font-semibold uppercase tracking-wider flex items-center gap-1">
              <Dumbbell className="w-3 h-3 text-[#FF7A00]" /> {exercise.sets.length} Sets Logged
            </span>
            <span className="font-mono-numbers font-medium text-white/60">
              Peak: {maxWeight} kg | Vol: {Math.round(exerciseVolume)} kg
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {exercise.sets.map((set, idx) => {
              const isRestPause = set.tags.some(t => t.startsWith('Rest-Pause'));
              const isHalfRep = set.tags.includes("Half Rep (1')");
              const isNearFull = set.tags.includes('Near-Full (1*)');
              const isDropSet = set.tags.includes('Drop Set');
              const isWarmup = set.tags.includes('Warmup');

              return (
                <div
                  key={set.setId || idx}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono-numbers font-medium transition-all ${
                    isDone
                      ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300'
                      : isDropSet
                      ? 'bg-red-500/10 border-red-500/30 text-red-300'
                      : isRestPause
                      ? 'bg-[#FF7A00]/10 border-[#FF7A00]/30 text-[#FF9B38]'
                      : 'bg-white/5 border-white/10 text-white/90'
                  }`}
                >
                  <span className="text-white/40 text-[10px]">#{idx + 1}</span>
                  <span className="font-bold">{set.raw}</span>

                  {/* Special Tag Indicator */}
                  {isRestPause && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-[#FF7A00]/20 text-[#FF7A00] font-sans font-bold flex items-center gap-0.5">
                      <Zap className="w-2.5 h-2.5" /> RP
                    </span>
                  )}
                  {isHalfRep && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-sans font-semibold">
                      Half
                    </span>
                  )}
                  {isNearFull && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-blue-500/20 text-blue-300 font-sans font-semibold">
                      NearFull
                    </span>
                  )}
                  {isDropSet && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-red-500/20 text-red-300 font-sans font-bold">
                      Drop
                    </span>
                  )}
                  {isWarmup && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-white/10 text-white/60 font-sans">
                      Warm
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
