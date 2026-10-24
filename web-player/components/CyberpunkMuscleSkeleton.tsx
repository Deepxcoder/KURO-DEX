'use client';

import React, { useState } from 'react';
import { MUSCLE_GROUPS } from '@/lib/muscleTaxonomy';

interface CyberpunkMuscleSkeletonProps {
  selectedMuscleId: string;
  onSelectMuscle: (muscleId: string) => void;
  muscleHeatmap: Record<string, number>;
  theme?: 'light' | 'dark';
}

export const CyberpunkMuscleSkeleton: React.FC<CyberpunkMuscleSkeletonProps> = ({
  selectedMuscleId,
  onSelectMuscle,
  muscleHeatmap,
  theme = 'light'
}) => {
  const [viewMode, setViewMode] = useState<'front' | 'back'>('front');

  const isLight = theme === 'light';

  const activeGroup = MUSCLE_GROUPS.find(m => m.id === selectedMuscleId);
  const synergistIds = activeGroup ? activeGroup.synergists : [];
  const selectedVolume = muscleHeatmap[selectedMuscleId] || (selectedMuscleId === 'all' ? Object.values(muscleHeatmap).reduce((a, b) => a + b, 0) : 0);

  // Compute synergist loads
  const syn1 = synergistIds[0] ? MUSCLE_GROUPS.find(m => m.id === synergistIds[0]) : null;
  const syn2 = synergistIds[1] ? MUSCLE_GROUPS.find(m => m.id === synergistIds[1]) : null;
  const syn1Load = syn1 ? Math.round((muscleHeatmap[syn1.id] || 0) * 0.35) : 420;
  const syn2Load = syn2 ? Math.round((muscleHeatmap[syn2.id] || 0) * 0.35) : 375;

  const isSelected = (id: string) => selectedMuscleId === id;
  const isSynergist = (id: string) => synergistIds.includes(id);

  // Theme-aware styles
  const baseStroke = isLight ? '#94A3B8' : '#334155';
  const trapStroke = isLight ? '#64748B' : '#475569';
  const selectedStroke = isLight ? '#1D4ED8' : '#00E5FF';
  const synergistStroke = isLight ? '#E11D48' : '#F43F5E';
  const conduitStroke = isLight ? '#E11D48' : '#F43F5E';
  const inactiveStroke = isLight ? '#94A3B8' : 'rgba(255,255,255,0.2)';
  const inactiveFill = isLight ? 'none' : 'rgba(255,255,255,0.04)';
  const kneeStroke = isLight ? '#2563EB' : '#00E5FF';

  return (
    <aside
      className={`w-full h-full flex flex-col justify-between rounded-2xl transition-colors duration-200 relative overflow-hidden select-none ${
        isLight
          ? 'bg-white border border-slate-200/90 p-5 shadow-[0_4px_24px_rgba(15,23,42,0.05),0_1px_3px_rgba(0,0,0,0.03)] text-slate-800'
          : 'bg-[#0C101A]/90 border border-white/[0.08] p-5 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] text-[#EDEDED]'
      }`}
    >
      {/* Ambient Glow Behind Anatomy */}
      <div
        className={`absolute top-1/3 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-3xl pointer-events-none ${
          isLight ? 'bg-blue-500/5' : 'bg-cyan-500/10'
        }`}
      />

      {/* ============================================================== */}
      {/* Top Header & Viewport Controls                                 */}
      {/* ============================================================== */}
      <header
        className={`w-full flex items-center justify-between pb-2.5 shrink-0 z-10 ${
          isLight ? 'border-b border-slate-100' : 'border-b border-white/[0.06]'
        }`}
      >
        <div>
          <h2
            className={`text-sm font-bold tracking-tight uppercase font-sans ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}
          >
            Kinetic Muscular Load
          </h2>
          <p className="text-[11px] text-slate-400 font-mono">
            {viewMode === 'front' ? 'Chain: Anterior Kinetic' : 'Chain: Posterior Kinetic'}
          </p>
        </div>

        {/* Sleek Pill Toggle: Front / Back */}
        <div
          className={`flex items-center p-1 rounded-xl ${
            isLight ? 'bg-slate-100 border border-slate-200' : 'bg-black/40 border border-white/[0.08]'
          }`}
        >
          <button
            onClick={() => setViewMode('front')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'front'
                ? isLight
                  ? 'bg-white text-blue-600 shadow-sm border border-slate-200/80 font-bold'
                  : 'bg-white/10 text-cyan-300 shadow-sm border border-cyan-400/20'
                : isLight
                ? 'text-slate-500 hover:text-slate-900'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            FRONT
          </button>
          <button
            onClick={() => setViewMode('back')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'back'
                ? isLight
                  ? 'bg-white text-blue-600 shadow-sm border border-slate-200/80 font-bold'
                  : 'bg-white/10 text-rose-300 shadow-sm border border-rose-400/20'
                : isLight
                ? 'text-slate-500 hover:text-slate-900'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            BACK
          </button>
        </div>
      </header>

      {/* ============================================================== */}
      {/* Center Silhouette: High-Aesthetic Muscular Anatomy SVG         */}
      {/* ============================================================== */}
      <div
        className={`relative flex-1 w-full min-h-[380px] my-2 flex items-center justify-center overflow-hidden rounded-xl ${
          isLight ? 'bg-slate-50/60 border border-slate-100' : ''
        }`}
      >
        {/* Tech Subtle Range Rings */}
        <div
          className={`absolute w-64 h-64 rounded-full pointer-events-none ${
            isLight ? 'border border-slate-200/70' : 'border border-white/[0.03]'
          }`}
        />
        <div
          className={`absolute w-80 h-80 rounded-full border-dashed pointer-events-none ${
            isLight ? 'border border-slate-200/50' : 'border border-white/[0.02]'
          }`}
        />

        <svg
          className={`w-full h-full max-h-[480px] object-contain cursor-pointer ${
            isLight
              ? 'drop-shadow-[0_2px_12px_rgba(37,99,235,0.08)]'
              : 'drop-shadow-[0_0_24px_rgba(0,229,255,0.15)]'
          }`}
          viewBox="0 0 340 500"
        >
          <defs>
            {/* Luminous Primary Muscle Radial Fill */}
            {isLight ? (
              <radialGradient cx="50%" cy="50%" id="pecGlow" r="50%">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.85" />
                <stop offset="70%" stopColor="#2563EB" stopOpacity="0.75" />
                <stop offset="100%" stopColor="#1D4ED8" stopOpacity="0.9" />
              </radialGradient>
            ) : (
              <radialGradient id="pecGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.75" />
                <stop offset="70%" stopColor="#00E5FF" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#00E5FF" stopOpacity="0.1" />
              </radialGradient>
            )}

            {/* Synergist Pink/Rose Fill */}
            {isLight ? (
              <radialGradient cx="50%" cy="50%" id="synergistGlow" r="50%">
                <stop offset="0%" stopColor="#FDA4AF" stopOpacity="0.75" />
                <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.6" />
              </radialGradient>
            ) : (
              <radialGradient id="synergistGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.65" />
                <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.15" />
              </radialGradient>
            )}

            {/* Modern Hex Pattern for Muscle Highlight */}
            <pattern id="modernGrid" width="6" height="6" patternUnits="userSpaceOnUse">
              <path
                d="M 6 0 L 0 0 0 6"
                fill="none"
                opacity={isLight ? 0.4 : 0.6}
                stroke={isLight ? '#FFFFFF' : '#00E5FF'}
                strokeWidth={isLight ? 0.8 : 0.7}
              />
            </pattern>
          </defs>

          {/* ============================================================== */}
          {/* ANTERIOR (FRONT) VIEW                                          */}
          {/* ============================================================== */}
          {viewMode === 'front' && (
            <g id="anterior-view">
              {/* Silhouette Base Form: Head & Neck */}
              <g
                fill="none"
                opacity={isSelected('head') ? 1 : isLight ? 0.85 : 0.75}
                stroke={isSelected('head') ? selectedStroke : baseStroke}
                strokeWidth={isSelected('head') ? 2 : 1.3}
                onClick={() => onSelectMuscle('head')}
              >
                <path d="M 170 30 C 158 30, 150 40, 150 54 C 150 68, 160 80, 170 82 C 180 80, 190 68, 190 54 C 190 40, 182 30, 170 30 Z" />
                <path d="M 158 54 Q 170 60 182 54" opacity={isLight ? 0.5 : 0.4} />
                {/* Neck & Traps */}
                <path d="M 160 80 L 152 100 M 180 80 L 188 100" />
                <path d="M 152 100 C 142 105, 126 112, 114 122 M 188 100 C 198 105, 214 112, 226 122" stroke={trapStroke} strokeWidth="1.5" />
                {/* Clavicle Frame */}
                <path d="M 170 102 C 156 102, 134 112, 116 122 M 170 102 C 184 102, 206 112, 224 122" stroke={trapStroke} strokeWidth="1.5" />
              </g>

              {/* Kinetic Conduit Dotted Energy Paths */}
              {isSynergist('shoulders') || isSynergist('triceps') ? (
                <g fill="none" opacity={isLight ? 0.9 : 0.9} stroke={conduitStroke} strokeDasharray="3 3" strokeWidth="1.8" className="animate-pulse">
                  <path d="M 145 145 Q 120 135 106 142 Q 95 160 88 190" />
                  <path d="M 195 145 Q 220 135 234 142 Q 245 160 252 190" />
                </g>
              ) : null}

              {/* CHEST (Pectoralis Major & Minor) */}
              <g
                className="cursor-pointer transition-all duration-300"
                onClick={() => onSelectMuscle('chest')}
              >
                {/* Left Pectoral */}
                <path
                  className="hover:stroke-blue-700 transition-all drop-shadow-sm"
                  d="M 168 108 C 152 107, 122 118, 115 136 C 111 146, 116 166, 134 174 C 150 180, 166 174, 168 168 Z"
                  fill={isSelected('chest') ? 'url(#pecGlow)' : isSynergist('chest') ? 'url(#synergistGlow)' : inactiveFill}
                  stroke={isSelected('chest') ? selectedStroke : isSynergist('chest') ? synergistStroke : inactiveStroke}
                  strokeWidth="2.2"
                />
                {isSelected('chest') && (
                  <path
                    d="M 168 108 C 152 107, 122 118, 115 136 C 111 146, 116 166, 134 174 C 150 180, 166 174, 168 168 Z"
                    fill="url(#modernGrid)"
                  />
                )}

                {/* Right Pectoral */}
                <path
                  className="hover:stroke-blue-700 transition-all drop-shadow-sm"
                  d="M 172 108 C 188 107, 218 118, 225 136 C 229 146, 224 166, 206 174 C 190 180, 174 174, 172 168 Z"
                  fill={isSelected('chest') ? 'url(#pecGlow)' : isSynergist('chest') ? 'url(#synergistGlow)' : inactiveFill}
                  stroke={isSelected('chest') ? selectedStroke : isSynergist('chest') ? synergistStroke : inactiveStroke}
                  strokeWidth="2.2"
                />
                {isSelected('chest') && (
                  <path
                    d="M 172 108 C 188 107, 218 118, 225 136 C 229 146, 224 166, 206 174 C 190 180, 174 174, 172 168 Z"
                    fill="url(#modernGrid)"
                  />
                )}

                {/* Sternal Cleavage Division */}
                <line x1="170" y1="108" x2="170" y2="170" stroke="#FFFFFF" strokeWidth="1.8" opacity="0.9" />
              </g>

              {/* SHOULDERS (Deltoids) */}
              <g className="cursor-pointer" onClick={() => onSelectMuscle('shoulders')}>
                <path
                  d="M 115 124 C 104 128, 92 140, 94 158 C 96 168, 108 170, 112 152 C 114 138, 115 130, 115 124 Z"
                  fill={isSelected('shoulders') ? 'url(#pecGlow)' : isSynergist('shoulders') ? 'url(#synergistGlow)' : inactiveFill}
                  stroke={isSelected('shoulders') ? selectedStroke : isSynergist('shoulders') ? synergistStroke : inactiveStroke}
                  strokeWidth="1.8"
                />
                <path
                  d="M 225 124 C 236 128, 248 140, 246 158 C 244 168, 232 170, 228 152 C 226 138, 225 130, 225 124 Z"
                  fill={isSelected('shoulders') ? 'url(#pecGlow)' : isSynergist('shoulders') ? 'url(#synergistGlow)' : inactiveFill}
                  stroke={isSelected('shoulders') ? selectedStroke : isSynergist('shoulders') ? synergistStroke : inactiveStroke}
                  strokeWidth="1.8"
                />
              </g>

              {/* TRICEPS */}
              <g className="cursor-pointer" onClick={() => onSelectMuscle('triceps')}>
                <path
                  d="M 94 160 C 88 170, 78 188, 76 206 C 80 210, 88 206, 92 194 C 95 180, 96 168, 94 160 Z"
                  fill={isSelected('triceps') ? 'url(#pecGlow)' : isSynergist('triceps') ? 'url(#synergistGlow)' : inactiveFill}
                  stroke={isSelected('triceps') ? selectedStroke : isSynergist('triceps') ? synergistStroke : inactiveStroke}
                  strokeWidth="1.6"
                />
                <path
                  d="M 246 160 C 252 170, 262 188, 264 206 C 260 210, 252 206, 248 194 C 245 180, 244 168, 246 160 Z"
                  fill={isSelected('triceps') ? 'url(#pecGlow)' : isSynergist('triceps') ? 'url(#synergistGlow)' : inactiveFill}
                  stroke={isSelected('triceps') ? selectedStroke : isSynergist('triceps') ? synergistStroke : inactiveStroke}
                  strokeWidth="1.6"
                />
              </g>

              {/* BICEPS & FOREARMS */}
              <g
                className="cursor-pointer"
                onClick={() => onSelectMuscle('biceps')}
                fill={isSelected('biceps') ? 'url(#pecGlow)' : isSynergist('biceps') ? 'url(#synergistGlow)' : 'none'}
                stroke={isSelected('biceps') ? selectedStroke : isSynergist('biceps') ? synergistStroke : isLight ? '#94A3B8' : '#475569'}
                strokeWidth="1.4"
                opacity={isLight ? 0.85 : 0.75}
              >
                <path d="M 98 165 C 102 176, 104 190, 98 204" />
                <path d="M 242 165 C 238 176, 236 190, 242 204" />
              </g>

              <g
                className="cursor-pointer"
                onClick={() => onSelectMuscle('forearms')}
                stroke={isSelected('forearms') ? selectedStroke : isSynergist('forearms') ? synergistStroke : isLight ? '#94A3B8' : '#475569'}
                strokeWidth="1.3"
                opacity={isLight ? 0.85 : 0.75}
              >
                <path d="M 86 210 L 68 266 M 98 208 L 82 268" />
                <path d="M 254 210 L 272 266 M 242 208 L 258 268" />
              </g>

              {/* CORE: ABDOMINALS & OBLIQUES */}
              <g
                className="cursor-pointer"
                onClick={() => onSelectMuscle('abs')}
                stroke={isSelected('abs') ? selectedStroke : isLight ? '#94A3B8' : '#475569'}
                strokeWidth="1.2"
                opacity={isLight ? 0.9 : 0.85}
              >
                <line x1="170" y1="172" x2="170" y2="254" stroke={isSelected('abs') ? selectedStroke : isLight ? '#CBD5E1' : '#64748B'} strokeDasharray="2 2" />
                <rect x="156" y="180" width="12" height="15" rx="2" fill={isSelected('abs') ? 'url(#pecGlow)' : isLight ? '#F1F5F9' : '#0C101A'} fillOpacity={isLight ? 0.8 : 0.5} stroke={isLight ? '#CBD5E1' : undefined} />
                <rect x="172" y="180" width="12" height="15" rx="2" fill={isSelected('abs') ? 'url(#pecGlow)' : isLight ? '#F1F5F9' : '#0C101A'} fillOpacity={isLight ? 0.8 : 0.5} stroke={isLight ? '#CBD5E1' : undefined} />
                <rect x="156" y="200" width="12" height="16" rx="2" fill={isSelected('abs') ? 'url(#pecGlow)' : isLight ? '#F1F5F9' : '#0C101A'} fillOpacity={isLight ? 0.8 : 0.5} stroke={isLight ? '#CBD5E1' : undefined} />
                <rect x="172" y="200" width="12" height="16" rx="2" fill={isSelected('abs') ? 'url(#pecGlow)' : isLight ? '#F1F5F9' : '#0C101A'} fillOpacity={isLight ? 0.8 : 0.5} stroke={isLight ? '#CBD5E1' : undefined} />
                <rect x="157" y="222" width="11" height="16" rx="2" fill={isSelected('abs') ? 'url(#pecGlow)' : isLight ? '#F1F5F9' : '#0C101A'} fillOpacity={isLight ? 0.8 : 0.5} stroke={isLight ? '#CBD5E1' : undefined} />
                <rect x="172" y="222" width="11" height="16" rx="2" fill={isSelected('abs') ? 'url(#pecGlow)' : isLight ? '#F1F5F9' : '#0C101A'} fillOpacity={isLight ? 0.8 : 0.5} stroke={isLight ? '#CBD5E1' : undefined} />
                <path d="M 134 176 C 138 200, 142 226, 148 248 M 206 176 C 202 200, 198 226, 192 248" />
                <path d="M 144 246 L 170 262 L 196 246" stroke={isLight ? '#94A3B8' : '#64748B'} strokeWidth="1.4" />
              </g>

              {/* LOWER BODY: QUADS, KNEES & CALVES */}
              <g
                className="cursor-pointer"
                onClick={() => onSelectMuscle('quads')}
                stroke={isSelected('quads') ? selectedStroke : isLight ? '#94A3B8' : '#334155'}
                strokeWidth="1.3"
                opacity={isLight ? 0.85 : 0.8}
              >
                <path
                  d="M 144 266 C 136 295, 128 335, 134 372 M 166 266 L 156 370"
                  fill={isSelected('quads') ? 'url(#pecGlow)' : 'none'}
                />
                <path
                  d="M 196 266 C 204 295, 212 335, 206 372 M 174 266 L 184 370"
                  fill={isSelected('quads') ? 'url(#pecGlow)' : 'none'}
                />
                <circle cx="145" cy="384" r="5" stroke={kneeStroke} strokeWidth="1.3" opacity="0.85" />
                <circle cx="195" cy="384" r="5" stroke={kneeStroke} strokeWidth="1.3" opacity="0.85" />
              </g>

              {/* CALVES */}
              <g
                className="cursor-pointer"
                onClick={() => onSelectMuscle('calves')}
                stroke={isSelected('calves') ? selectedStroke : isLight ? '#94A3B8' : '#334155'}
                strokeWidth="1.3"
                opacity={isLight ? 0.85 : 0.8}
              >
                <path
                  d="M 140 395 C 134 415, 132 440, 136 465 M 150 395 L 148 465"
                  fill={isSelected('calves') ? 'url(#pecGlow)' : 'none'}
                />
                <path
                  d="M 200 395 C 206 415, 208 440, 204 465 M 190 395 L 192 465"
                  fill={isSelected('calves') ? 'url(#pecGlow)' : 'none'}
                />
              </g>

              {/* Synergist Callout Badges */}
              {isSynergist('shoulders') && (
                <>
                  <g transform="translate(24, 136)">
                    <rect
                      width="60"
                      height="20"
                      rx="6"
                      fill={isLight ? '#FFE4E6' : '#090D15'}
                      stroke={isLight ? '#FDA4AF' : '#F43F5E'}
                      strokeWidth="1"
                      strokeOpacity={isLight ? 1 : 0.6}
                    />
                    <text
                      x="30"
                      y="14"
                      fill={isLight ? '#BE123C' : '#F43F5E'}
                      fontFamily="JetBrains Mono"
                      fontSize="9"
                      fontWeight="700"
                      textAnchor="middle"
                    >
                      +32% DELT
                    </text>
                  </g>
                  <g transform="translate(256, 136)">
                    <rect
                      width="60"
                      height="20"
                      rx="6"
                      fill={isLight ? '#FFE4E6' : '#090D15'}
                      stroke={isLight ? '#FDA4AF' : '#F43F5E'}
                      strokeWidth="1"
                      strokeOpacity={isLight ? 1 : 0.6}
                    />
                    <text
                      x="30"
                      y="14"
                      fill={isLight ? '#BE123C' : '#F43F5E'}
                      fontFamily="JetBrains Mono"
                      fontSize="9"
                      fontWeight="700"
                      textAnchor="middle"
                    >
                      +32% DELT
                    </text>
                  </g>
                </>
              )}

              {isSynergist('triceps') && (
                <>
                  <g transform="translate(20, 190)">
                    <rect
                      width="56"
                      height="19"
                      rx="6"
                      fill={isLight ? '#FFE4E6' : '#090D15'}
                      stroke={isLight ? '#FDA4AF' : '#F43F5E'}
                      strokeWidth="1"
                      strokeOpacity={isLight ? 1 : 0.6}
                    />
                    <text
                      x="28"
                      y="13.5"
                      fill={isLight ? '#BE123C' : '#F43F5E'}
                      fontFamily="JetBrains Mono"
                      fontSize="8.5"
                      fontWeight="700"
                      textAnchor="middle"
                    >
                      +28% TRI
                    </text>
                  </g>
                  <g transform="translate(264, 190)">
                    <rect
                      width="56"
                      height="19"
                      rx="6"
                      fill={isLight ? '#FFE4E6' : '#090D15'}
                      stroke={isLight ? '#FDA4AF' : '#F43F5E'}
                      strokeWidth="1"
                      strokeOpacity={isLight ? 1 : 0.6}
                    />
                    <text
                      x="28"
                      y="13.5"
                      fill={isLight ? '#BE123C' : '#F43F5E'}
                      fontFamily="JetBrains Mono"
                      fontSize="8.5"
                      fontWeight="700"
                      textAnchor="middle"
                    >
                      +28% TRI
                    </text>
                  </g>
                </>
              )}
            </g>
          )}

          {/* ============================================================== */}
          {/* POSTERIOR (BACK) VIEW                                          */}
          {/* ============================================================== */}
          {viewMode === 'back' && (
            <g id="posterior-view">
              {/* Head & Occiput */}
              <ellipse cx="170" cy="54" rx="20" ry="24" fill="none" stroke={isLight ? '#94A3B8' : '#475569'} strokeWidth="1.4" />

              {/* Traps & Upper Back */}
              <path
                d="M 158 80 L 182 80 L 200 108 L 170 135 L 140 108 Z"
                fill={isSelected('neck') ? 'url(#pecGlow)' : 'none'}
                stroke={isSelected('neck') ? selectedStroke : isLight ? '#94A3B8' : '#475569'}
                strokeWidth="1.8"
                onClick={() => onSelectMuscle('neck')}
              />

              {/* Rear Deltoids */}
              <path
                d="M 140 108 C 126 112, 118 126, 122 140 C 130 140, 140 130, 144 116 Z"
                fill={isSelected('shoulders') ? 'url(#pecGlow)' : isSynergist('shoulders') ? 'url(#synergistGlow)' : 'none'}
                stroke={isSelected('shoulders') ? selectedStroke : isSynergist('shoulders') ? synergistStroke : isLight ? '#94A3B8' : '#475569'}
                strokeWidth="1.6"
                onClick={() => onSelectMuscle('shoulders')}
              />
              <path
                d="M 200 108 C 214 112, 222 126, 218 140 C 210 140, 200 130, 196 116 Z"
                fill={isSelected('shoulders') ? 'url(#pecGlow)' : isSynergist('shoulders') ? 'url(#synergistGlow)' : 'none'}
                stroke={isSelected('shoulders') ? selectedStroke : isSynergist('shoulders') ? synergistStroke : isLight ? '#94A3B8' : '#475569'}
                strokeWidth="1.6"
                onClick={() => onSelectMuscle('shoulders')}
              />

              {/* Triceps Horseshoe */}
              <path
                d="M 120 142 C 112 154, 110 178, 120 190 C 126 186, 128 162, 126 146 Z"
                fill={isSelected('triceps') ? 'url(#pecGlow)' : isSynergist('triceps') ? 'url(#synergistGlow)' : 'none'}
                stroke={isSelected('triceps') ? selectedStroke : isSynergist('triceps') ? synergistStroke : isLight ? '#94A3B8' : '#475569'}
                strokeWidth="1.8"
                onClick={() => onSelectMuscle('triceps')}
              />
              <path
                d="M 220 142 C 228 154, 230 178, 220 190 C 214 186, 212 162, 214 146 Z"
                fill={isSelected('triceps') ? 'url(#pecGlow)' : isSynergist('triceps') ? 'url(#synergistGlow)' : 'none'}
                stroke={isSelected('triceps') ? selectedStroke : isSynergist('triceps') ? synergistStroke : isLight ? '#94A3B8' : '#475569'}
                strokeWidth="1.8"
                onClick={() => onSelectMuscle('triceps')}
              />

              {/* LATS & RHOMBOIDS */}
              <g className="cursor-pointer" onClick={() => onSelectMuscle('back')}>
                <path
                  d="M 168 135 L 142 112 C 132 130, 130 162, 146 200 L 168 210 Z"
                  fill={isSelected('back') ? 'url(#pecGlow)' : 'none'}
                  stroke={isSelected('back') ? selectedStroke : isLight ? '#64748B' : '#475569'}
                  strokeWidth="2"
                />
                <path
                  d="M 172 135 L 198 112 C 208 130, 210 162, 194 200 L 172 210 Z"
                  fill={isSelected('back') ? 'url(#pecGlow)' : 'none'}
                  stroke={isSelected('back') ? selectedStroke : isLight ? '#64748B' : '#475569'}
                  strokeWidth="2"
                />
              </g>

              {/* GLUTES */}
              <g className="cursor-pointer" onClick={() => onSelectMuscle('glutes')}>
                <path
                  d="M 168 220 C 146 220, 136 238, 140 262 C 146 276, 160 276, 168 268 Z"
                  fill={isSelected('glutes') ? 'url(#pecGlow)' : 'none'}
                  stroke={isSelected('glutes') ? selectedStroke : isLight ? '#94A3B8' : '#334155'}
                  strokeWidth="1.8"
                />
                <path
                  d="M 172 220 C 194 220, 204 238, 200 262 C 194 276, 180 276, 172 268 Z"
                  fill={isSelected('glutes') ? 'url(#pecGlow)' : 'none'}
                  stroke={isSelected('glutes') ? selectedStroke : isLight ? '#94A3B8' : '#334155'}
                  strokeWidth="1.8"
                />
              </g>

              {/* HAMSTRINGS */}
              <g className="cursor-pointer" onClick={() => onSelectMuscle('hamstrings')}>
                <path
                  d="M 144 276 C 134 295, 132 340, 144 372 C 152 374, 160 362, 162 334 C 164 304, 160 279, 154 276 Z"
                  fill={isSelected('hamstrings') ? 'url(#pecGlow)' : 'none'}
                  stroke={isSelected('hamstrings') ? selectedStroke : isLight ? '#94A3B8' : '#334155'}
                  strokeWidth="1.8"
                />
                <path
                  d="M 196 276 C 206 295, 208 340, 196 372 C 188 374, 180 362, 178 334 C 176 304, 180 279, 186 276 Z"
                  fill={isSelected('hamstrings') ? 'url(#pecGlow)' : 'none'}
                  stroke={isSelected('hamstrings') ? selectedStroke : isLight ? '#94A3B8' : '#334155'}
                  strokeWidth="1.8"
                />
              </g>

              {/* POSTERIOR CALVES */}
              <g className="cursor-pointer" onClick={() => onSelectMuscle('calves')}>
                <path
                  d="M 144 395 C 130 410, 128 445, 138 475 C 144 475, 152 450, 152 425 Z"
                  fill={isSelected('calves') ? 'url(#pecGlow)' : 'none'}
                  stroke={isSelected('calves') ? selectedStroke : isLight ? '#94A3B8' : '#334155'}
                  strokeWidth="1.6"
                />
                <path
                  d="M 196 395 C 210 410, 212 445, 202 475 C 196 475, 188 450, 188 425 Z"
                  fill={isSelected('calves') ? 'url(#pecGlow)' : 'none'}
                  stroke={isSelected('calves') ? selectedStroke : isLight ? '#94A3B8' : '#334155'}
                  strokeWidth="1.6"
                />
              </g>
            </g>
          )}
        </svg>
      </div>

      {/* ============================================================== */}
      {/* Minimal Docked Summary Card (from Stitch Design)              */}
      {/* ============================================================== */}
      <footer
        className={`relative z-10 shrink-0 rounded-xl p-3.5 backdrop-blur-md transition-colors ${
          isLight
            ? 'bg-slate-50/80 border border-slate-200/90'
            : 'bg-white/[0.03] border border-white/[0.08]'
        }`}
      >
        <div
          className={`flex items-center justify-between pb-2 mb-2 ${
            isLight ? 'border-b border-slate-200' : 'border-b border-white/[0.06]'
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isLight
                  ? 'bg-blue-600 shadow-[0_0_6px_rgba(37,99,235,0.4)]'
                  : 'bg-cyan-400 shadow-[0_0_8px_#00E5FF]'
              }`}
            />
            <span
              className={`text-xs font-bold tracking-wide font-sans ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}
            >
              {activeGroup ? activeGroup.name : 'All Systems'}
            </span>
          </div>

          <span
            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
              isLight
                ? 'text-blue-700 bg-blue-50 border border-blue-200'
                : 'text-cyan-300 bg-cyan-500/10 border border-cyan-400/20'
            }`}
          >
            {selectedMuscleId === 'all' ? 'FULL GRID' : 'PRIMARY TARGET'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 py-1 text-center font-mono">
          <div
            className={`flex flex-col rounded-lg p-1.5 ${
              isLight
                ? 'bg-white border border-slate-200/80 shadow-xs'
                : 'bg-black/30 border border-white/[0.04]'
            }`}
          >
            <span className={`text-[10px] uppercase ${isLight ? 'text-slate-500 font-sans font-medium' : 'text-slate-400'}`}>
              Volume
            </span>
            <span
              className={`text-xs font-bold ${
                isLight ? 'text-blue-600' : 'text-cyan-300'
              }`}
            >
              {selectedVolume.toLocaleString()} kg
            </span>
          </div>

          <div
            className={`flex flex-col rounded-lg p-1.5 ${
              isLight
                ? 'bg-white border border-slate-200/80 shadow-xs'
                : 'bg-black/30 border border-white/[0.04]'
            }`}
          >
            <span className={`text-[10px] uppercase ${isLight ? 'text-slate-500 font-sans font-medium' : 'text-slate-400'}`}>
              {syn1 ? syn1.shortName : 'Deltoids'}
            </span>
            <span
              className={`text-xs font-bold ${
                isLight ? 'text-rose-600' : 'text-rose-300'
              }`}
            >
              +{syn1Load} kg
            </span>
          </div>

          <div
            className={`flex flex-col rounded-lg p-1.5 ${
              isLight
                ? 'bg-white border border-slate-200/80 shadow-xs'
                : 'bg-black/30 border border-white/[0.04]'
            }`}
          >
            <span className={`text-[10px] uppercase ${isLight ? 'text-slate-500 font-sans font-medium' : 'text-slate-400'}`}>
              {syn2 ? syn2.shortName : 'Triceps'}
            </span>
            <span
              className={`text-xs font-bold ${
                isLight ? 'text-rose-600' : 'text-rose-300'
              }`}
            >
              +{syn2Load} kg
            </span>
          </div>
        </div>
      </footer>
    </aside>
  );
};
