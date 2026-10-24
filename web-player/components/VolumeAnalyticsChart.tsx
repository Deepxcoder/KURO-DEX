'use client';

import React, { useState, useMemo } from 'react';
import { MuscleVolumeStats } from '@/lib/muscleTaxonomy';

interface VolumeAnalyticsChartProps {
  stats: MuscleVolumeStats;
  onSelectSessionDate?: (dateStr: string) => void;
  onResetToAll?: () => void;
  theme?: 'light' | 'dark';
}

export const VolumeAnalyticsChart: React.FC<VolumeAnalyticsChartProps> = ({
  stats,
  onSelectSessionDate,
  onResetToAll,
  theme = 'light'
}) => {
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);
  const [activeRange, setActiveRange] = useState<'7D' | '30D' | '3M' | '1Y'>('30D');

  const isLight = theme === 'light';

  const {
    selectedMuscle,
    synergists,
    dailySeries
  } = stats;

  const isAll = selectedMuscle.id === 'all';

  // Helper to parse date to timestamp (supports DD/MM/YYYY and YYYY-MM-DD)
  const parseDateToTime = (dStr: string): number => {
    const clean = dStr.replace(/\.$/, '').trim();
    const parts = clean.split(/[\/\-\.]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)).getTime();
      } else {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        let y = parseInt(parts[2], 10);
        if (y < 100) y += 2000;
        return new Date(y, m - 1, d).getTime();
      }
    }
    const t = new Date(clean).getTime();
    return isNaN(t) ? 0 : t;
  };

  // 1. Timeline filtering based on 7D, 30D, 3M, 1Y
  const filteredDailySeries = useMemo(() => {
    if (!dailySeries || dailySeries.length === 0) return [];

    // Filter strictly to sessions with logged training volume (excludes future unperformed days)
    const activePoints = dailySeries.filter(d =>
      d.primaryVolume > 0 ||
      d.synergistVolume > 0 ||
      (d.sessionRef && d.sessionRef.totalVolumeKg > 0)
    );

    if (activePoints.length === 0) return dailySeries;

    const timestamps = activePoints.map(p => parseDateToTime(p.dateStr));
    const maxTime = Math.max(...timestamps);

    let daysWindow = 30;
    if (activeRange === '7D') daysWindow = 7;
    else if (activeRange === '30D') daysWindow = 30;
    else if (activeRange === '3M') daysWindow = 90;
    else if (activeRange === '1Y') daysWindow = 365;

    const minTime = maxTime - daysWindow * 24 * 60 * 60 * 1000;
    const filtered = activePoints.filter(p => parseDateToTime(p.dateStr) >= minTime);

    // If 7D only captures 1 or 2 sessions, show the last 5 active sessions for an informative curve
    if (filtered.length <= 2 && activePoints.length >= 3) {
      const minCount = activeRange === '7D' ? 5 : activeRange === '30D' ? 10 : 20;
      return activePoints.slice(-Math.min(minCount, activePoints.length));
    }

    return filtered;
  }, [dailySeries, activeRange]);

  // Compute points for SVG Chart
  const chartData = useMemo(() => {
    return filteredDailySeries.map((point, index) => {
      return {
        ...point,
        index,
        displayVolume: point.primaryVolume,
        displaySynergist: point.synergistVolume
      };
    });
  }, [filteredDailySeries]);

  const maxVolumeVal = useMemo(() => {
    if (chartData.length === 0) return 4500;
    const maxVal = Math.max(...chartData.map(d => d.displayVolume + (d.displaySynergist || 0)));
    return Math.max(maxVal * 1.15, 1000);
  }, [chartData]);

  // High-Precision SVG Spline Viewport calibrated to expand top-to-bottom
  const svgWidth = 900;
  const svgHeight = 440;
  const padding = { top: 20, right: 30, bottom: 20, left: 60 };
  const graphWidth = svgWidth - padding.left - padding.right;
  const graphHeight = svgHeight - padding.top - padding.bottom;

  const points = useMemo(() => {
    if (chartData.length === 0) return [];

    return chartData.map((d, i) => {
      const x =
        chartData.length === 1
          ? padding.left + graphWidth / 2
          : padding.left + (i / (chartData.length - 1)) * graphWidth;
      const y = padding.top + graphHeight - (d.displayVolume / maxVolumeVal) * graphHeight;
      const ySyn =
        padding.top +
        graphHeight -
        ((d.displayVolume + (d.displaySynergist || 0)) / maxVolumeVal) * graphHeight;

      return { x, y, ySyn, data: d };
    });
  }, [chartData, maxVolumeVal, graphWidth, graphHeight, padding]);

  // Smooth Spline Curves
  const areaPath = useMemo(() => {
    if (points.length === 0) return '';
    if (points.length === 1) {
      const p = points[0];
      return `M ${p.x - 60} ${padding.top + graphHeight} L ${p.x - 60} ${p.y} L ${p.x + 60} ${p.y} L ${p.x + 60} ${padding.top + graphHeight} Z`;
    }

    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cp1x = p0.x + (p1.x - p0.x) / 2;
      const cp1y = p0.y;
      const cp2x = p0.x + (p1.x - p0.x) / 2;
      const cp2y = p1.y;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
    }
    const last = points[points.length - 1];
    const first = points[0];
    d += ` L ${last.x} ${padding.top + graphHeight} L ${first.x} ${padding.top + graphHeight} Z`;
    return d;
  }, [points, padding, graphHeight]);

  const linePath = useMemo(() => {
    if (points.length === 0) return '';
    if (points.length === 1) {
      const p = points[0];
      return `M ${p.x - 60} ${p.y} L ${p.x + 60} ${p.y}`;
    }

    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cp1x = p0.x + (p1.x - p0.x) / 2;
      const cp1y = p0.y;
      const cp2x = p0.x + (p1.x - p0.x) / 2;
      const cp2y = p1.y;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
    }
    return d;
  }, [points]);

  // Synergist Wave Curve
  const synergistLinePath = useMemo(() => {
    if (isAll || points.length === 0) return '';
    if (points.length === 1) {
      const p = points[0];
      return `M ${p.x - 60} ${p.ySyn} L ${p.x + 60} ${p.ySyn}`;
    }

    let d = `M ${points[0].x} ${points[0].ySyn}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cp1x = p0.x + (p1.x - p0.x) / 2;
      const cp1y = p0.ySyn;
      const cp2x = p0.x + (p1.x - p0.x) / 2;
      const cp2y = p1.ySyn;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.ySyn}`;
    }
    return d;
  }, [points, isAll]);

  const synergistAreaPath = useMemo(() => {
    if (isAll || points.length === 0) return '';
    if (points.length === 1) {
      const p = points[0];
      return `M ${p.x - 60} ${padding.top + graphHeight} L ${p.x - 60} ${p.ySyn} L ${p.x + 60} ${p.ySyn} L ${p.x + 60} ${padding.top + graphHeight} Z`;
    }

    let d = `M ${points[0].x} ${points[0].ySyn}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cp1x = p0.x + (p1.x - p0.x) / 2;
      const cp1y = p0.ySyn;
      const cp2x = p0.x + (p1.x - p0.x) / 2;
      const cp2y = p1.ySyn;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.ySyn}`;
    }
    const last = points[points.length - 1];
    const first = points[0];
    d += ` L ${last.x} ${padding.top + graphHeight} L ${first.x} ${padding.top + graphHeight} Z`;
    return d;
  }, [points, isAll, padding, graphHeight]);

  // Active or latest session point for focal inspection
  const defaultFocalIndex = points.length > 0 ? points.length - 1 : 0;
  const currentFocalIndex =
    activePointIndex !== null && activePointIndex < points.length
      ? activePointIndex
      : defaultFocalIndex;
  const focalPoint = points[currentFocalIndex] || null;

  // Format short date for X-axis (e.g. 9/14 or Sep 14)
  const formatXLabel = (dStr: string) => {
    const parts = dStr.split(/[\/\-\.]/);
    if (parts.length >= 2) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      return `${month}/${day}`;
    }
    return dStr;
  };

  return (
    <section
      className={`w-full h-full flex flex-col justify-between rounded-2xl transition-colors duration-200 relative overflow-hidden group select-none ${
        isLight
          ? 'bg-white border border-slate-200/90 p-4 md:p-5 shadow-[0_4px_24px_rgba(15,23,42,0.05),0_1px_3px_rgba(0,0,0,0.03)] text-slate-800'
          : 'bg-[#0C101A]/90 border border-white/[0.08] p-4 md:p-5 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] text-[#EDEDED]'
      }`}
    >
      {/* Subtle Ambient Glow Orbs */}
      <div
        className={`absolute -top-28 -left-28 w-96 h-96 rounded-full blur-3xl pointer-events-none ${
          isLight ? 'bg-blue-500/5' : 'bg-cyan-500/10'
        }`}
      />
      <div
        className={`absolute -bottom-28 right-1/4 w-80 h-80 rounded-full blur-3xl pointer-events-none ${
          isLight ? 'bg-rose-500/5' : 'bg-indigo-500/10'
        }`}
      />

      {/* ============================================================== */}
      {/* Graph Header & Clean Minimalist Controls                        */}
      {/* ============================================================== */}
      <header
        className={`w-full flex items-center justify-between z-10 shrink-0 pb-2.5 flex-wrap gap-2 ${
          isLight ? 'border-b border-slate-100' : 'border-b border-white/[0.06]'
        }`}
      >
        <div className="flex items-center gap-3 md:gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                isLight
                  ? 'bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]'
                  : 'bg-cyan-400 shadow-[0_0_12px_#00E5FF] animate-pulse'
              }`}
            />
            <h1
              className={`text-base font-bold tracking-tight uppercase font-sans ${
                isLight ? 'text-slate-900' : 'text-white/95'
              }`}
            >
              Training Volume Trajectory
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                isLight
                  ? 'bg-slate-100 border border-slate-200 text-slate-600'
                  : 'bg-white/[0.04] border border-white/[0.06] text-slate-300'
              }`}
            >
              {isAll ? 'Target: All Workouts' : `Target: ${selectedMuscle.name} Focus`}
            </span>

            {!isAll && onResetToAll && (
              <button
                onClick={onResetToAll}
                className={`text-[10px] font-mono uppercase hover:underline ${
                  isLight ? 'text-blue-600' : 'text-cyan-400'
                }`}
              >
                [Reset to All]
              </button>
            )}
          </div>
        </div>

        {/* Controls: Granular Time Pills & Metric Toggles */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Time Range Selector: 7D / 30D / 3M / 1Y */}
          <div
            className={`flex items-center p-1 rounded-xl ${
              isLight ? 'bg-slate-100/90 border border-slate-200' : 'bg-black/40 border border-white/[0.08]'
            }`}
          >
            {(['7D', '30D', '3M', '1Y'] as const).map(range => (
              <button
                key={range}
                onClick={() => {
                  setActiveRange(range);
                  setActivePointIndex(null);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeRange === range
                    ? isLight
                      ? 'bg-white text-blue-600 shadow-sm border border-slate-200/70 font-bold'
                      : 'bg-white/10 text-cyan-300 shadow-sm border border-cyan-400/20'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          {/* Series Indicator Pills */}
          <div className="flex items-center gap-2 pl-1">
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium ${
                isLight
                  ? 'bg-blue-50 border border-blue-200/80 text-blue-700'
                  : 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-300'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isLight ? 'bg-blue-600 shadow-[0_0_6px_rgba(37,99,235,0.4)]' : 'bg-cyan-400 shadow-[0_0_8px_#00E5FF]'
                }`}
              />
              Primary {selectedMuscle.shortName}
            </div>

            {!isAll && synergists.length > 0 && (
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium ${
                  isLight
                    ? 'bg-rose-50 border border-rose-200/80 text-rose-700'
                    : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
                }`}
              >
                <span
                  className={`w-2.5 h-0.5 ${
                    isLight ? 'bg-rose-500 shadow-[0_0_6px_rgba(225,29,72,0.3)]' : 'bg-rose-400 shadow-[0_0_8px_#F43F5E]'
                  }`}
                />
                Synergist Load
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ============================================================== */}
      {/* Active Session Inspection Strip (Positioned Above the Graph)    */}
      {/* ============================================================== */}
      {focalPoint && (
        <div
          className={`w-full shrink-0 mt-3 p-3 rounded-xl transition-all border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${
            isLight
              ? 'bg-slate-50/90 border-slate-200/80 shadow-xs'
              : 'bg-white/[0.03] border-white/[0.08] shadow-inner'
          }`}
        >
          {/* Left: Focal Session Meta & Volume KPI */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 font-mono text-xs font-bold">
              <span
                className={`w-2 h-2 rounded-full ${
                  isLight ? 'bg-blue-600 shadow-[0_0_6px_rgba(37,99,235,0.4)]' : 'bg-cyan-400 shadow-[0_0_8px_#00E5FF]'
                }`}
              />
              <span className={isLight ? 'text-slate-900' : 'text-white'}>
                {focalPoint.data.dateStr}
              </span>
            </div>

            <span
              className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                isLight
                  ? 'bg-blue-100/70 text-blue-800 border border-blue-200'
                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30'
              }`}
            >
              {focalPoint.data.sessionRef.muscleSplit || 'Session'}
            </span>

            <div className="flex items-baseline gap-1.5 pl-1">
              <span className={`text-xs ${isLight ? 'text-slate-500 font-medium' : 'text-slate-400'}`}>
                {isAll ? 'Total Work Volume:' : `Total ${selectedMuscle.shortName} Volume:`}
              </span>
              <span
                className={`font-mono text-base font-extrabold tracking-tight ${
                  isLight ? 'text-blue-600' : 'text-cyan-300'
                }`}
              >
                {focalPoint.data.displayVolume.toLocaleString()} <span className="text-xs font-semibold">kg</span>
              </span>
            </div>
          </div>

          {/* Right: Exercise Breakdown Chips (Horizontal scrollable pill list) */}
          <div className="flex items-center gap-2 overflow-x-auto max-w-full py-0.5 scrollbar-thin">
            {focalPoint.data.exercises.length === 0 ? (
              <span className={`italic text-[11px] ${isLight ? 'text-slate-400' : 'text-white/40'}`}>
                No individual movements logged
              </span>
            ) : (
              focalPoint.data.exercises.map((ex, ei) => (
                <div
                  key={ei}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 border transition-all ${
                    isLight
                      ? 'bg-white border-slate-200/90 text-slate-700 shadow-xs'
                      : 'bg-black/40 border-white/[0.08] text-slate-300'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isLight ? 'bg-blue-500' : 'bg-cyan-400'}`} />
                  <span className="font-medium">{ex.name}</span>
                  <span
                    className={`font-mono font-bold pl-0.5 ${
                      isLight ? 'text-blue-600' : 'text-cyan-300'
                    }`}
                  >
                    {ex.volume.toLocaleString()} kg
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* Expansive Interactive Graph Canvas Area (Edge-to-Edge Height)   */}
      {/* ============================================================== */}
      <div className="relative flex-1 w-full min-h-0 mt-3 mb-0 flex flex-col justify-between overflow-hidden">
        {/* Y-Axis Clean Baseline Guides (Fill vertical space) */}
        <div className="absolute inset-0 pl-14 pr-2 pt-2 pb-6 flex flex-col justify-between pointer-events-none">
          {[1, 0.75, 0.5, 0.25, 0].map((ratio, idx) => {
            const val = Math.round(maxVolumeVal * ratio);
            return (
              <div
                key={idx}
                className={`w-full flex items-center justify-between border-b ${
                  isLight ? (idx === 4 ? 'border-slate-200' : 'border-slate-100') : 'border-white/[0.04]'
                }`}
              >
                <span
                  className={`font-mono text-[11px] -ml-14 w-12 text-right ${
                    isLight ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  {val >= 1000 ? `${(val / 1000).toFixed(1)}k kg` : `${val} kg`}
                </span>
              </div>
            );
          })}
        </div>

        {/* SVG Splines Viewport (Expands top to bottom) */}
        <div className="relative flex-1 w-full h-full min-h-0 pl-14 pr-2 pt-1 pb-0">
          <svg
            className="w-full h-full overflow-visible"
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            preserveAspectRatio="none"
          >
            <defs>
              {/* Primary Volume Area Gradient */}
              <linearGradient id="primaryAreaGrad" x1="0" x2="0" y1="0" y2="1">
                {isLight ? (
                  <>
                    <stop offset="0%" stopColor="#2563EB" stopOpacity="0.22" />
                    <stop offset="65%" stopColor="#2563EB" stopOpacity="0.05" />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
                  </>
                ) : (
                  <>
                    <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.28" />
                    <stop offset="60%" stopColor="#00E5FF" stopOpacity="0.05" />
                    <stop offset="100%" stopColor="#00E5FF" stopOpacity="0.0" />
                  </>
                )}
              </linearGradient>

              {/* Synergist Area Gradient */}
              <linearGradient id="synergistAreaGrad" x1="0" x2="0" y1="0" y2="1">
                {isLight ? (
                  <>
                    <stop offset="0%" stopColor="#E11D48" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="#E11D48" stopOpacity="0.0" />
                  </>
                ) : (
                  <>
                    <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.16" />
                    <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.0" />
                  </>
                )}
              </linearGradient>

              {/* Soft Drop Shadow or Neon Glow Filters */}
              {isLight ? (
                <>
                  <filter id="softGlowPrimary" x="-25%" y="-25%" width="150%" height="150%">
                    <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#2563EB" floodOpacity="0.22" />
                  </filter>
                  <filter id="softGlowSynergist" x="-25%" y="-25%" width="150%" height="150%">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#E11D48" floodOpacity="0.20" />
                  </filter>
                </>
              ) : (
                <>
                  <filter id="softGlowPrimary" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="5" result="glow" />
                    <feMerge>
                      <feMergeNode in="glow" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <filter id="softGlowSynergist" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3.5" result="glow" />
                    <feMerge>
                      <feMergeNode in="glow" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </>
              )}
            </defs>

            {/* Vertical Guide Grids */}
            {points.map((pt, i) => {
              const isFocal = i === currentFocalIndex;
              const strokeColor = isLight
                ? isFocal
                  ? '#93C5FD'
                  : '#E2E8F0'
                : isFocal
                ? 'rgba(0,229,255,0.25)'
                : 'rgba(255,255,255,0.03)';
              return (
                <line
                  key={`vert-${i}`}
                  x1={pt.x}
                  x2={pt.x}
                  y1={padding.top}
                  y2={padding.top + graphHeight}
                  stroke={strokeColor}
                  strokeDasharray={isFocal ? '3 3' : '4 4'}
                />
              );
            })}

            {/* Synergist Area Fill & Dashed Spline */}
            {synergistAreaPath && (
              <path d={synergistAreaPath} fill="url(#synergistAreaGrad)" />
            )}
            {synergistLinePath && (
              <path
                d={synergistLinePath}
                fill="none"
                stroke={isLight ? '#E11D48' : '#F43F5E'}
                strokeWidth="2.5"
                strokeDasharray="6 5"
                filter="url(#softGlowSynergist)"
              />
            )}

            {/* Primary Volume Area Fill & Glowing Spline */}
            {areaPath && (
              <path d={areaPath} fill="url(#primaryAreaGrad)" />
            )}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke={isLight ? '#2563EB' : '#00E5FF'}
                strokeWidth="3.5"
                strokeLinecap="round"
                filter="url(#softGlowPrimary)"
              />
            )}

            {/* Data Nodes */}
            {points.map((pt, i) => {
              const isFocal = i === currentFocalIndex;

              return (
                <g
                  key={`node-${i}`}
                  className="cursor-pointer"
                  onClick={() => {
                    setActivePointIndex(i);
                    if (onSelectSessionDate) onSelectSessionDate(pt.data.dateStr);
                  }}
                  onMouseEnter={() => setActivePointIndex(i)}
                >
                  {isFocal ? (
                    <>
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="14"
                        fill={isLight ? '#2563EB' : '#00E5FF'}
                        fillOpacity={isLight ? 0.18 : 0.15}
                        className="animate-ping"
                        style={{ transformOrigin: `${pt.x}px ${pt.y}px` }}
                      />
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="8"
                        fill={isLight ? '#FFFFFF' : '#0C101A'}
                        stroke={isLight ? '#2563EB' : '#00E5FF'}
                        strokeWidth="3.5"
                        filter="url(#softGlowPrimary)"
                      />
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="3.5"
                        fill={isLight ? '#2563EB' : '#FFFFFF'}
                      />
                    </>
                  ) : (
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="5"
                      fill={isLight ? '#FFFFFF' : '#0C101A'}
                      stroke={isLight ? '#2563EB' : '#00E5FF'}
                      strokeWidth="2.5"
                      className="hover:scale-125 transition-transform"
                    />
                  )}
                </g>
              );
            })}

            {/* Focal Point Vertical Crosshair Guideline (Unobstructed Top-to-Bottom) */}
            {focalPoint && (
              <line
                x1={focalPoint.x}
                y1={padding.top}
                x2={focalPoint.x}
                y2={padding.top + graphHeight}
                stroke={isLight ? '#2563EB' : '#00E5FF'}
                strokeWidth="1.5"
                strokeDasharray="4 4"
                strokeOpacity={isLight ? 0.35 : 0.45}
              />
            )}
          </svg>
        </div>

        {/* ============================================================== */}
        {/* Clean Legible X-Axis Date Rail (Zero dead space underneath)    */}
        {/* ============================================================== */}
        <div
          className={`relative w-full pl-14 pr-2 pt-2 pb-0 flex items-center justify-between font-mono text-xs ${
            isLight
              ? 'border-t border-slate-100 text-slate-500'
              : 'border-t border-white/[0.08] text-slate-400'
          }`}
        >
          {points.map((pt, i) => {
            const isActive = i === currentFocalIndex;
            // For large datasets, stagger display or show all points
            const shouldShowLabel = points.length <= 12 || i === 0 || i === points.length - 1 || i % Math.ceil(points.length / 8) === 0 || isActive;

            return (
              <button
                key={`rail-${i}`}
                onClick={() => {
                  setActivePointIndex(i);
                  if (onSelectSessionDate) onSelectSessionDate(pt.data.dateStr);
                }}
                className={`transition-all text-center ${
                  isActive
                    ? isLight
                      ? 'text-blue-700 font-bold flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200'
                      : 'text-cyan-300 font-bold flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-cyan-400/10 border border-cyan-400/30 shadow-sm'
                    : isLight
                    ? 'hover:text-slate-800'
                    : 'hover:text-slate-200'
                } ${!shouldShowLabel && !isActive ? 'opacity-0 pointer-events-none w-0 overflow-hidden' : ''}`}
              >
                {isActive && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isLight ? 'bg-blue-600' : 'bg-cyan-400'
                    }`}
                  />
                )}
                {formatXLabel(pt.data.dateStr)}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
