'use client';

import React, { useState, useEffect } from 'react';
import { Save, X, Eye, FileCode, Check, RefreshCw } from 'lucide-react';

interface MarkdownEditorProps {
  initialMarkdown: string;
  onSave: (newMarkdown: string) => Promise<boolean>;
  onCancel: () => void;
  isSaving: boolean;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  initialMarkdown,
  onSave,
  onCancel,
  isSaving
}) => {
  const [content, setContent] = useState(initialMarkdown);
  const [showPreview, setShowPreview] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setContent(initialMarkdown);
  }, [initialMarkdown]);

  const handleSave = async () => {
    const success = await onSave(content);
    if (success) {
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  const lineCount = content.split('\n').length;

  return (
    <div className="w-full flex flex-col h-[calc(100vh-140px)] glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-2xl backdrop-blur-2xl animate-in fade-in duration-200">
      {/* Editor Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/40">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-[#FF7A00]" />
          <span className="text-xs font-bold uppercase tracking-wider text-white">
            Workout.md — Live Editor
          </span>
          <span className="text-[10px] font-mono-numbers px-2 py-0.5 rounded bg-white/5 text-white/40">
            {lineCount} lines
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Preview Toggle */}
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              showPreview
                ? 'bg-white/15 text-white border border-white/20'
                : 'bg-white/5 hover:bg-white/10 text-white/60'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{showPreview ? 'Raw' : 'Preview'}</span>
          </button>

          {/* Cancel */}
          <button
            onClick={onCancel}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-white/60 transition-all"
          >
            <X className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Close</span>
          </button>

          {/* Save & Sync Button */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              isSaved
                ? 'bg-emerald-500 text-black'
                : 'btn-neon-orange disabled:opacity-50'
            }`}
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Committing...</span>
              </>
            ) : isSaved ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Committed!</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save & Sync</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Code Editing Textarea */}
        <div className={`flex-1 relative flex h-full ${showPreview ? 'hidden md:flex' : 'flex'}`}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-full p-4 bg-transparent text-[#EDEDED] font-mono-numbers text-xs md:text-sm resize-none focus:outline-none leading-relaxed selection:bg-[#FF7A00]/30 custom-scrollbar"
            placeholder="Write workout log in Markdown syntax..."
            spellCheck={false}
          />
        </div>

        {/* Live Preview Pane */}
        {showPreview && (
          <div className="flex-1 border-l border-white/10 p-5 overflow-y-auto bg-black/20 text-xs md:text-sm font-mono-numbers leading-relaxed text-white/80 space-y-3">
            <div className="text-[11px] font-bold text-[#FF7A00] uppercase tracking-wider mb-2">
              Parsed Preview
            </div>
            <pre className="whitespace-pre-wrap font-sans text-xs text-white/70">
              {content}
            </pre>
          </div>
        )}
      </div>

      {/* Footer Helper Guide */}
      <div className="px-4 py-2 border-t border-white/5 bg-black/40 text-[11px] text-white/40 flex justify-between items-center">
        <span>Format: <code className="text-[#FF7A00]/80">9/14/26 6:15 AM</code> · <code className="text-[#FF7A00]/80">- [x] **Exercise** Got: 10x50 8_2x50</code></span>
        <span className="hidden sm:inline">Ctrl+S / Cmd+S ready · Auto-commits with SHA lock</span>
      </div>
    </div>
  );
};
