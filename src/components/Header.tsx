import React from "react";
import {
  Upload,
  Download,
  Undo2,
  Redo2,
  Network,
  ScrollText,
  FoldVertical,
  UnfoldVertical,
  Folder,
  Palette,
  Search,
} from "lucide-react";
import { useAppStore } from "../store/useAppStore";

interface HeaderProps {
  handleImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function Header({ handleImport }: HeaderProps) {
  const fileMenuOpen = useAppStore((s) => s.fileMenuOpen);
  const setFileMenuOpen = useAppStore((s) => s.setFileMenuOpen);
  const timelineOpen = useAppStore((s) => s.timelineOpen);
  const setTimelineOpen = useAppStore((s) => s.setTimelineOpen);
  const canUndo = useAppStore((s) => s.canUndo);
  const canRedo = useAppStore((s) => s.canRedo);
  const undo = useAppStore((s) => s.undo);
  const redo = useAppStore((s) => s.redo);
  const setActiveId = useAppStore((s) => s.setActiveId);
  const cardsCollapsed = useAppStore((s) => s.cardsCollapsed);
  const theme = useAppStore((s) => s.theme);
  const exportToMarkdown = useAppStore((s) => s.exportToMarkdown);
  const toggleCardsCollapsed = useAppStore((s) => s.toggleCardsCollapsed);
  const toggleTheme = useAppStore((s) => s.toggleTheme);

  return (
    <header className="h-14 border-b shrink-0 border-app-border flex items-center justify-between px-2 sm:px-6 bg-app-panel transition-colors duration-300">
      <div className="flex items-center gap-2 sm:gap-6">
        <span className="font-sans font-semibold text-lg sm:text-xl tracking-wide flex items-center gap-1 sm:gap-3 relative">
          <span
            className="cursor-pointer hidden sm:inline-block"
            onClick={() => setFileMenuOpen(!fileMenuOpen)}
            title="Open files menu"
          >
            <span className="text-app-text-muted">Puu</span>
            <span className="text-app-accent">Note.</span>
          </span>
          <span
            className="cursor-pointer sm:hidden flex items-center justify-center p-1"
            onClick={() => setFileMenuOpen(!fileMenuOpen)}
            title="Open files menu"
          >
            <span className="text-app-accent text-xl font-bold">P.</span>
          </span>
          <button
            onClick={() => setFileMenuOpen(!fileMenuOpen)}
            className="text-[10px] sm:text-xs tracking-wider bg-app-card hover:bg-app-card-hover border border-app-border px-1.5 sm:px-2 py-1 rounded text-app-text-muted font-medium transition-colors ml-0 sm:ml-2 flex items-center gap-1 sm:gap-2"
            title="Manage documents"
          >
            <span className="hidden sm:inline">FILES</span>
            <Folder size={14} className="sm:hidden" />
            <span className="opacity-50 hidden sm:inline">▾</span>
          </button>
        </span>
        <nav className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-app-text-muted">
          <button
            onClick={() => setTimelineOpen(!timelineOpen)}
            className="p-1.5 rounded transition-colors bg-app-card hover:bg-app-card-hover text-app-accent"
            title="Toggle View Mode"
          >
            {timelineOpen ? <Network size={16} /> : <ScrollText size={16} />}
          </button>
          <button
            onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
            className="p-1.5 rounded transition-colors bg-app-card hover:bg-app-card-hover text-app-accent"
            title="Command Palette (Cmd/Ctrl+K)"
          >
            <Search size={16} />
          </button>
        </nav>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-4 text-xs">
        <div className="flex items-center gap-0 sm:gap-1 border-r border-app-border pr-2 sm:pr-4">
          <button
            onClick={() => {
              undo();
              setActiveId(null);
            }}
            disabled={!canUndo()}
            className="p-1 sm:p-1.5 text-app-text-muted hover:text-app-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={16} />
          </button>
          <button
            onClick={() => {
              redo();
              setActiveId(null);
            }}
            disabled={!canRedo()}
            className="p-1 sm:p-1.5 text-app-text-muted hover:text-app-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 size={16} />
          </button>
        </div>
        <button
          onClick={toggleCardsCollapsed}
          className="bg-app-card border border-app-border hover:bg-app-card-hover p-1.5 sm:px-3 sm:py-1.5 rounded transition-colors text-app-text-secondary font-medium flex items-center justify-center gap-2"
          title="Toggle Expand/Collapse"
        >
          {cardsCollapsed ? (
            <UnfoldVertical size={14} />
          ) : (
            <FoldVertical size={14} />
          )}
        </button>
        <button
          onClick={toggleTheme}
          className="bg-app-card border border-app-border hover:bg-app-card-hover p-1.5 sm:px-3 sm:py-1.5 rounded transition-colors text-app-text-secondary font-medium flex items-center justify-center gap-2"
          title="Toggle theme"
        >
          <Palette size={14} />
          <span className="hidden sm:inline capitalize">{theme}</span>
        </button>
        <label
          className="cursor-pointer bg-app-card border border-app-border hover:bg-app-card-hover p-1.5 sm:px-3 sm:py-1.5 rounded transition-colors text-app-text-secondary font-medium flex items-center gap-2"
          title="Import .md"
        >
          <Download size={14} />
          <span className="hidden sm:inline font-mono tracking-wider">.md</span>
          <input
            type="file"
            accept=".md"
            className="hidden"
            onChange={handleImport}
          />
        </label>
        <button
          onClick={exportToMarkdown}
          className="bg-app-card border border-app-border hover:bg-app-card-hover p-1.5 sm:px-3 sm:py-1.5 rounded transition-colors text-app-text-secondary font-medium flex items-center gap-2"
          title="Export .md"
        >
          <Upload size={14} />
          <span className="hidden sm:inline font-mono tracking-wider">.md</span>
        </button>
      </div>
    </header>
  );
}
