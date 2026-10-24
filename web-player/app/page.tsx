'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { WorkoutSession, WorkoutApiResponse } from '@/lib/types';
import { MobileLayout } from '@/components/MobileLayout';
import { DesktopLayout } from '@/components/DesktopLayout';
import { MarkdownEditor } from '@/components/MarkdownEditor';
import { MuscleVolumeDashboard } from '@/components/MuscleVolumeDashboard';
import { AnalyticsPane } from '@/components/AnalyticsPane';
import { Toast, ToastMessage } from '@/components/Toast';
import {
  RefreshCw,
  X,
  TrendingUp,
  Dumbbell,
  Edit3,
  HardDrive,
  Github,
  Cpu,
  Layers,
  Sun,
  Moon
} from 'lucide-react';

export type DashboardTab = 'volume_matrix' | 'session_player' | 'markdown_editor';

export default function WorkoutPlayerPage() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [rawMarkdown, setRawMarkdown] = useState<string>('');
  const [sha, setSha] = useState<string | undefined>();
  const [source, setSource] = useState<'github' | 'local'>('local');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<DashboardTab>('volume_matrix'); // Defaults to Home / Volume Matrix
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isMobileAnalyticsOpen, setIsMobileAnalyticsOpen] = useState<boolean>(false);
  const [focusedExerciseIndex, setFocusedExerciseIndex] = useState<number>(0);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Theme State: 'light' (default selected) or 'dark'
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Load and apply theme
  useEffect(() => {
    const saved = localStorage.getItem('kurodex_theme') as 'light' | 'dark' | null;
    if (saved === 'dark' || saved === 'light') {
      setTheme(saved);
    }
  }, []);

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    }
    localStorage.setItem('kurodex_theme', theme);
  }, [theme]);

  // Responsive device detection
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const checkViewport = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  // Show Toast Helper
  const showToast = useCallback((type: 'success' | 'error' | 'syncing', text: string) => {
    setToast({ id: `${Date.now()}`, type, text });
    if (type !== 'syncing') {
      setTimeout(() => setToast(null), 3000);
    }
  }, []);

  // Fetch Workout data on mount
  const loadWorkoutData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/workout', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data: WorkoutApiResponse = await res.json();

      setRawMarkdown(data.rawMarkdown || '');
      setSessions(data.sessions || []);
      setSha(data.sha);
      setSource(data.source || 'local');

      if (data.sessions && data.sessions.length > 0) {
        // Default to the first (latest) session
        setCurrentSessionId(prev => prev || data.sessions[0].id);
      }
    } catch (err: unknown) {
      console.error('[Load Workout Error]', err);
      showToast('error', 'Failed to load workout from local vault or repository');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadWorkoutData();
  }, [loadWorkoutData]);

  // Selected session object
  const currentSession = sessions.find(s => s.id === currentSessionId) || sessions[0] || null;

  // Debounced Checkbox Sync Queue (500ms auto-commit debounce)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleToggleExercise = useCallback((exerciseId: string, newCompleted: boolean) => {
    // 1. Optimistic UI update
    setSessions(prevSessions => {
      return prevSessions.map(session => {
        if (session.id !== currentSessionId) return session;

        const updatedExercises = session.exercises.map(ex => {
          if (ex.id !== exerciseId) return ex;
          return {
            ...ex,
            completed: newCompleted,
            sets: ex.sets.map(s => ({ ...s, completed: newCompleted }))
          };
        });

        const totalSets = updatedExercises.reduce((sum, e) => sum + e.sets.length, 0);
        const completedSets = updatedExercises.reduce((sum, e) => sum + (e.completed ? e.sets.length : 0), 0);
        const completionRate = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;

        return {
          ...session,
          exercises: updatedExercises,
          totalSets,
          completedSets,
          completionRate
        };
      });
    });

    showToast('syncing', 'Syncing changes...');

    // 2. Debounce commit back to API
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const syncRes = await fetch('/api/workout/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'toggle',
            exerciseId,
            completed: newCompleted,
            sha
          })
        });

        if (!syncRes.ok) throw new Error('Sync commit failed');
        const data = await syncRes.json();

        if (data.sha) setSha(data.sha);
        if (data.rawMarkdown) setRawMarkdown(data.rawMarkdown);
        if (data.sessions) setSessions(data.sessions);

        showToast('success', 'Changes synced & persisted');
      } catch (e: unknown) {
        console.error('[Toggle Sync Error]', e);
        showToast('error', 'Sync failed. Will retry on next action.');
      }
    }, 500);
  }, [currentSessionId, sha, showToast]);

  // Handle Save Raw Markdown from Live Editor
  const handleSaveRawMarkdown = useCallback(async (newMarkdown: string): Promise<boolean> => {
    try {
      setIsSaving(true);
      showToast('syncing', 'Saving raw markdown...');

      const res = await fetch('/api/workout/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'raw',
          rawMarkdown: newMarkdown,
          sha
        })
      });

      if (!res.ok) throw new Error('Save failed');
      const data = await res.json();

      setRawMarkdown(newMarkdown);
      if (data.sha) setSha(data.sha);
      if (data.sessions) {
        setSessions(data.sessions);
        if (data.sessions.length > 0 && !data.sessions.some((s: WorkoutSession) => s.id === currentSessionId)) {
          setCurrentSessionId(data.sessions[0].id);
        }
      }

      showToast('success', 'Workout.md updated & parsed');
      setActiveTab('volume_matrix');
      return true;
    } catch (e: unknown) {
      console.error('[Raw Save Error]', e);
      showToast('error', 'Failed to commit changes');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [sha, currentSessionId, showToast]);

  // Jump from Volume Chart point to specific session in Player
  const handleSelectSessionDate = useCallback((dateStr: string) => {
    const match = sessions.find(s => s.dateStr === dateStr || s.rawDate.includes(dateStr));
    if (match) {
      setCurrentSessionId(match.id);
      setActiveTab('session_player');
      showToast('success', `Opened session for ${match.dateStr}`);
    }
  }, [sessions, showToast]);

  // Global Keyboard Shortcuts (1/2/3: tabs, E: edit, Escape: close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === 'Escape' && activeTab === 'markdown_editor') {
          setActiveTab('volume_matrix');
        }
        return;
      }

      if (e.key === '1') {
        setActiveTab('volume_matrix');
      } else if (e.key === '2') {
        setActiveTab('session_player');
      } else if (e.key === '3' || e.key === 'e' || e.key === 'E') {
        setActiveTab('markdown_editor');
      } else if (e.key === 'Escape') {
        if (activeTab === 'markdown_editor') setActiveTab('volume_matrix');
        setIsMobileAnalyticsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab]);

  if (isLoading) {
    return (
      <div className={`flex-1 min-h-screen flex flex-col items-center justify-center p-6 text-center ${theme === 'light' ? 'bg-[#F8FAFC] text-slate-800' : 'bg-[#08080C] text-[#EDEDED]'}`}>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white mb-4 shadow-xl animate-bounce ${theme === 'light' ? 'bg-gradient-to-tr from-[#2563EB] to-[#E11D48] shadow-blue-500/25' : 'bg-gradient-to-tr from-[#00F0FF] to-[#FF7A00] shadow-[#00F0FF]/30 text-black'}`}>
          <RefreshCw className="w-6 h-6 animate-spin" />
        </div>
        <h2 className="text-lg font-black tracking-tight mb-1 font-mono-numbers">
          INITIALIZING KURODEX BIOMETRIC HUD
        </h2>
        <p className={`text-xs max-w-xs font-mono-numbers ${theme === 'light' ? 'text-slate-500' : 'text-white/50'}`}>
          Reading Workout.md logs & mapping musculoskeletal kinetic chains...
        </p>
      </div>
    );
  }

  const isLight = theme === 'light';

  return (
    <div
      className={`relative min-h-screen flex flex-col transition-colors duration-200 ${
        isLight ? 'bg-[#F8FAFC] text-slate-800' : 'bg-[#08080C] text-[#EDEDED]'
      }`}
    >
      {/* Toast Notification */}
      <Toast toast={toast} />

      {/* ============================================================== */}
      {/* Top Persistent Navigation Bar with Light/Dark Mode Switcher    */}
      {/* ============================================================== */}
      <header
        className={`sticky top-0 z-40 px-4 md:px-6 py-2.5 backdrop-blur-2xl flex items-center justify-between transition-colors duration-200 ${
          isLight
            ? 'bg-white/95 border-b border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.03)] text-slate-800'
            : 'glass-panel border-b border-white/10 text-white'
        }`}
      >
        {/* Brand & HUD Title */}
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shadow-md ${
              isLight
                ? 'bg-gradient-to-tr from-[#2563EB] to-[#E11D48] text-white shadow-blue-500/20'
                : 'bg-gradient-to-tr from-[#00F0FF] via-[#0080FF] to-[#FF7A00] text-black shadow-[#00F0FF]/25'
            }`}
          >
            KD
          </div>
          <div>
            <h1 className={`text-sm font-extrabold tracking-tight flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              KURODEX HUD
              <span
                className={`text-[10px] font-mono-numbers font-bold px-2 py-0.5 rounded-full ${
                  isLight
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/25'
                }`}
              >
                v3.0 KINETIC
              </span>
            </h1>
            <p className={`text-[11px] hidden sm:block ${isLight ? 'text-slate-500' : 'text-white/40'}`}>
              Training Volume Trajectory & Biometric Skeleton HUD
            </p>
          </div>
        </div>

        {/* View Switcher Tabs (Volume 70/30 vs Session Player vs Editor) */}
        <nav
          className={`flex items-center gap-1 p-1 rounded-xl border ${
            isLight ? 'bg-slate-100/90 border-slate-200' : 'bg-black/50 border-white/10'
          }`}
          aria-label="Dashboard Views"
        >
          <button
            onClick={() => setActiveTab('volume_matrix')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'volume_matrix'
                ? isLight
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'bg-[#00F0FF] text-black shadow-lg shadow-[#00F0FF]/25'
                : isLight
                ? 'text-slate-600 hover:text-slate-900'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Volume Matrix & Skeleton</span>
            <span className="sm:hidden">Volume</span>
          </button>

          <button
            onClick={() => setActiveTab('session_player')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'session_player'
                ? isLight
                  ? 'bg-rose-600 text-white shadow-sm shadow-rose-500/20'
                  : 'bg-[#FF7A00] text-black shadow-lg shadow-[#FF7A00]/25'
                : isLight
                ? 'text-slate-600 hover:text-slate-900'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Dumbbell className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Workout Player</span>
            <span className="sm:hidden">Player</span>
          </button>

          <button
            onClick={() => setActiveTab('markdown_editor')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'markdown_editor'
                ? isLight
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-black shadow-lg shadow-white/20'
                : isLight
                ? 'text-slate-600 hover:text-slate-900'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Workout.md</span>
            <span className="sm:hidden">Edit</span>
          </button>
        </nav>

        {/* Right Controls: Theme Switcher & Status Pill */}
        <div className="flex items-center gap-2.5">
          {/* Light / Dark Mode Segmented Toggle */}
          <div
            className={`flex items-center p-1 rounded-xl border transition-all ${
              isLight ? 'bg-slate-100 border-slate-200' : 'bg-black/50 border-white/10'
            }`}
            role="group"
            aria-label="Theme Mode"
          >
            <button
              onClick={() => setTheme('light')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                theme === 'light'
                  ? 'bg-white text-blue-600 shadow-sm border border-slate-200/80'
                  : isLight
                  ? 'text-slate-500 hover:text-slate-900'
                  : 'text-white/50 hover:text-white'
              }`}
              title="Activate Light Mode"
            >
              <Sun className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">LIGHT</span>
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                theme === 'dark'
                  ? 'bg-white/15 text-cyan-300 shadow-sm border border-cyan-400/30'
                  : isLight
                  ? 'text-slate-500 hover:text-slate-900'
                  : 'text-white/50 hover:text-white'
              }`}
              title="Activate Dark Cyberpunk HUD"
            >
              <Moon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">DARK</span>
            </button>
          </div>

          {/* Vault Status Pill */}
          <div
            className={`hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono-numbers border ${
              isLight
                ? 'bg-slate-100 border-slate-200 text-slate-700'
                : 'bg-white/5 border-white/10 text-white'
            }`}
          >
            {source === 'github' ? (
              <>
                <Github className="w-3.5 h-3.5 text-emerald-500" />
                <span className={isLight ? 'text-emerald-700 font-semibold' : 'text-emerald-400 font-semibold'}>GitHub</span>
              </>
            ) : (
              <>
                <HardDrive className={`w-3.5 h-3.5 ${isLight ? 'text-blue-600' : 'text-amber-400'}`} />
                <span className={isLight ? 'text-slate-700 font-semibold' : 'text-amber-400 font-semibold'}>Local Vault</span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ============================================================== */}
      {/* Active Tab View Stage                                          */}
      {/* ============================================================== */}
      <main className="flex-1 flex flex-col min-h-0 h-[calc(100vh-60px)] overflow-hidden">
        {/* VIEW 1: HOME LANDING PAGE - 70% Volume Chart / 30% Skeleton  */}
        {activeTab === 'volume_matrix' && (
          <MuscleVolumeDashboard
            sessions={sessions}
            onSelectSessionDate={handleSelectSessionDate}
            onOpenPlayer={() => setActiveTab('session_player')}
            theme={theme}
          />
        )}

        {/* VIEW 2: WORKOUT SESSION PLAYER (Active Arnold Split logging) */}
        {activeTab === 'session_player' && (
          isMobile ? (
            <MobileLayout
              sessions={sessions}
              currentSession={currentSession}
              onSelectSession={(s) => setCurrentSessionId(s.id)}
              onToggleExercise={handleToggleExercise}
              onOpenEditor={() => setActiveTab('markdown_editor')}
              onOpenAnalytics={() => setIsMobileAnalyticsOpen(true)}
              focusedExerciseIndex={focusedExerciseIndex}
            />
          ) : (
            <DesktopLayout
              sessions={sessions}
              currentSession={currentSession}
              onSelectSession={(s) => setCurrentSessionId(s.id)}
              onToggleExercise={handleToggleExercise}
              onOpenEditor={() => setActiveTab('markdown_editor')}
              focusedExerciseIndex={focusedExerciseIndex}
              source={source}
            />
          )
        )}

        {/* VIEW 3: LIVE OBSIDIAN MARKDOWN EDITOR */}
        {activeTab === 'markdown_editor' && (
          <div className="max-w-6xl w-full mx-auto p-4 md:p-8 flex-1 flex flex-col justify-center">
            <MarkdownEditor
              initialMarkdown={rawMarkdown}
              onSave={handleSaveRawMarkdown}
              onCancel={() => setActiveTab('volume_matrix')}
              isSaving={isSaving}
            />
          </div>
        )}
      </main>

      {/* Mobile Analytics Drawer / Modal */}
      {isMobileAnalyticsOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex flex-col justify-end p-4 animate-in fade-in duration-200">
          <div className="glass-panel border border-white/15 rounded-3xl p-5 max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-sm font-black uppercase tracking-wider text-white">
                Session Analytics
              </h3>
              <button
                onClick={() => setIsMobileAnalyticsOpen(false)}
                className="p-1.5 rounded-lg bg-white/5 text-white/60 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <AnalyticsPane session={currentSession} />
          </div>
        </div>
      )}
    </div>
  );
}
