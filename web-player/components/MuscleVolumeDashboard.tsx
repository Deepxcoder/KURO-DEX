'use client';

import React, { useState } from 'react';
import { WorkoutSession } from '@/lib/types';
import { calculateMuscleVolumeStats } from '@/lib/muscleTaxonomy';
import { VolumeAnalyticsChart } from './VolumeAnalyticsChart';
import { CyberpunkMuscleSkeleton } from './CyberpunkMuscleSkeleton';

interface MuscleVolumeDashboardProps {
  sessions: WorkoutSession[];
  onSelectSessionDate?: (dateStr: string) => void;
  onOpenPlayer?: () => void;
  theme?: 'light' | 'dark';
}

export const MuscleVolumeDashboard: React.FC<MuscleVolumeDashboardProps> = ({
  sessions,
  onSelectSessionDate,
  theme = 'light'
}) => {
  // Default to 'chest' or 'all'
  const [selectedMuscleId, setSelectedMuscleId] = useState<string>('chest');

  // Compute kinetic and volume metrics
  const stats = calculateMuscleVolumeStats(sessions, selectedMuscleId);

  const isLight = theme === 'light';

  return (
    <div
      className={`w-full h-full flex-1 p-3.5 box-border flex flex-col min-h-0 transition-colors duration-200 ${
        isLight
          ? 'bg-[#F8FAFC] bg-[radial-gradient(circle_at_18%_25%,rgba(37,99,235,0.035)_0%,transparent_50%),radial-gradient(circle_at_82%_70%,rgba(225,29,72,0.025)_0%,transparent_45%),linear-gradient(rgba(148,163,184,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.07)_1px,transparent_1px)] bg-[size:100%_100%,100%_100%,32px_32px,32px_32px]'
          : 'bg-[#07090E] bg-[radial-gradient(circle_at_18%_25%,rgba(99,102,241,0.08)_0%,transparent_45%),radial-gradient(circle_at_82%_70%,rgba(0,229,255,0.06)_0%,transparent_40%),linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:100%_100%,100%_100%,32px_32px,32px_32px]'
      }`}
    >
      {/* ============================================================== */}
      {/* Edge-to-Edge 2-Column Cockpit Workspace (70% / 30%)             */}
      {/* ============================================================== */}
      <main className="w-full h-full flex flex-col lg:flex-row items-stretch gap-3.5 flex-1 min-h-0">
        {/* ------------------------------------------------------------ */}
        {/* LEFT PANEL: Expansive Training Volume Graph (70% Width)      */}
        {/* ------------------------------------------------------------ */}
        <div className="w-full lg:w-[70%] h-full flex flex-col min-h-[440px]">
          <VolumeAnalyticsChart
            stats={stats}
            onSelectSessionDate={onSelectSessionDate}
            onResetToAll={() => setSelectedMuscleId('all')}
            theme={theme}
          />
        </div>

        {/* ------------------------------------------------------------ */}
        {/* RIGHT PANEL: Kinetic Muscular Load Skeleton (30% Width)      */}
        {/* ------------------------------------------------------------ */}
        <div className="w-full lg:w-[30%] h-full flex flex-col min-h-[440px]">
          <CyberpunkMuscleSkeleton
            selectedMuscleId={selectedMuscleId}
            onSelectMuscle={setSelectedMuscleId}
            muscleHeatmap={stats.muscleHeatmap}
            theme={theme}
          />
        </div>
      </main>
    </div>
  );
};
