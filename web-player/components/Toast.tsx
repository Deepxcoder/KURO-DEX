'use client';

import React from 'react';
import { CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'syncing';
  text: string;
}

interface ToastProps {
  toast: ToastMessage | null;
}

export const Toast: React.FC<ToastProps> = ({ toast }) => {
  if (!toast) return null;

  return (
    <aside
      aria-label="Notifications"
      className="fixed bottom-20 md:bottom-8 right-1/2 translate-x-1/2 md:translate-x-0 md:right-8 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-full glass-panel border border-white/10 shadow-2xl backdrop-blur-xl animate-bounce-in"
    >
      {toast.type === 'syncing' && (
        <RefreshCw className="w-4 h-4 text-[#FF7A00] animate-spin" />
      )}
      {toast.type === 'success' && (
        <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
      )}
      {toast.type === 'error' && (
        <AlertCircle className="w-4 h-4 text-[#EF4444]" />
      )}
      <span className="text-xs font-semibold text-white tracking-wide">
        {toast.text}
      </span>
    </aside>
  );
};
