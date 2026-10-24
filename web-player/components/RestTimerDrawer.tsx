'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Timer, ChevronUp, ChevronDown, Volume2 } from 'lucide-react';

interface RestTimerDrawerProps {
  onTimerToggle?: (isRunning: boolean) => void;
}

export const RestTimerDrawer: React.FC<RestTimerDrawerProps> = ({ onTimerToggle }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [totalSeconds, setTotalSeconds] = useState(90);
  const [remainingSeconds, setRemainingSeconds] = useState(90);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Play soft glassmorphic Web Audio chime upon timer completion
  const playChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();

      // Double-harmonic chime: 880Hz (A5) -> 1760Hz (A6)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1760, ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.8);
      osc2.stop(ctx.currentTime + 0.8);

      // Trigger soft vibration on supported mobile devices
      if ('vibrate' in navigator) {
        navigator.vibrate([150, 80, 200]);
      }
    } catch (e) {
      console.warn('Audio chime playback error:', e);
    }
  };

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setRemainingSeconds(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            setIsRunning(false);
            onTimerToggle?.(false);
            playChime();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, onTimerToggle]);

  const toggleTimer = () => {
    const nextState = !isRunning;
    setIsRunning(nextState);
    onTimerToggle?.(nextState);
  };

  const resetTimer = (newDuration?: number) => {
    setIsRunning(false);
    onTimerToggle?.(false);
    const duration = newDuration ?? totalSeconds;
    setTotalSeconds(duration);
    setRemainingSeconds(duration);
  };

  const selectPreset = (secs: number) => {
    resetTimer(secs);
    setIsRunning(true);
    onTimerToggle?.(true);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = totalSeconds > 0 ? ((totalSeconds - remainingSeconds) / totalSeconds) * 100 : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none flex flex-col items-center">
      {/* Floating Compact Rest Pill (Thumb Zone) */}
      <div className="pointer-events-auto mb-3">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-3 px-5 py-2.5 rounded-full glass-panel border transition-all shadow-2xl backdrop-blur-2xl ${
            isRunning
              ? 'border-[#FF7A00]/60 bg-[#FF7A00]/15 text-[#FF7A00] shadow-[0_0_25px_rgba(255,122,0,0.3)]'
              : 'border-white/10 hover:border-white/25 text-white/90'
          }`}
        >
          <Timer className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
          <span className="font-mono-numbers text-sm font-extrabold tracking-wider">
            {formatTime(remainingSeconds)}
          </span>
          <span className="text-[10px] font-semibold text-white/60 tracking-wider uppercase">
            REST
          </span>
          {isOpen ? <ChevronDown className="w-3.5 h-3.5 opacity-60" /> : <ChevronUp className="w-3.5 h-3.5 opacity-60" />}
        </button>
      </div>

      {/* Expanded Glass Bottom Sheet */}
      {isOpen && (
        <div className="pointer-events-auto w-full max-w-md mx-auto glass-panel border-t border-x border-white/10 rounded-t-3xl p-5 shadow-2xl backdrop-blur-3xl animate-in slide-in-from-bottom duration-300">
          <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-4" />

          {/* Large Time Display with Circular Progress Bar */}
          <div className="flex flex-col items-center justify-center my-2">
            <div className="text-4xl font-black font-mono-numbers text-white tracking-tight">
              {formatTime(remainingSeconds)}
            </div>
            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mt-3 max-w-xs">
              <div
                className="bg-gradient-to-r from-[#FF7A00] to-[#FFA800] h-full transition-all duration-1000 ease-linear rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Quick Preset Buttons (60s, 90s, 120s) */}
          <div className="grid grid-cols-3 gap-2 my-4">
            {[60, 90, 120].map((preset) => (
              <button
                key={preset}
                onClick={() => selectPreset(preset)}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                  totalSeconds === preset
                    ? 'bg-[#FF7A00] text-black shadow-lg shadow-[#FF7A00]/30 font-extrabold'
                    : 'bg-white/5 hover:bg-white/10 text-white/80 border border-white/5'
                }`}
              >
                {preset}s Rest
              </button>
            ))}
          </div>

          {/* Action Controls */}
          <div className="flex items-center justify-center gap-4 mt-2">
            <button
              onClick={() => resetTimer()}
              className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 transition-all"
              title="Reset Timer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={toggleTimer}
              className={`px-8 py-3.5 rounded-full font-bold text-sm flex items-center gap-2 transition-all ${
                isRunning
                  ? 'bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30'
                  : 'btn-neon-orange'
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-4 h-4 fill-current" /> Pause Rest
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" /> Start Rest
                </>
              )}
            </button>

            <button
              onClick={playChime}
              className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 transition-all"
              title="Test Chime Sound"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
