import { useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Upload,
  Download,
  FileJson,
  Menu,
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
import { useClickOutside } from "../hooks/useClickOutside";

interface MobileMenuProps {
  handleImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleUndo: () => void;
  handleRedo: () => void;
}

export function MobileMenu({
  handleImport,
  handleUndo,
  handleRedo,
}: MobileMenuProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const fileMenuOpen = useAppStore((s) => s.fileMenuOpen);
  const setFileMenuOpen = useAppStore((s) => s.setFileMenuOpen);
  const timelineOpen = useAppStore((s) => s.timelineOpen);
  const setTimelineOpen = useAppStore((s) => s.setTimelineOpen);
  const canUndo = useAppStore((s) => s.past.length > 0);
  const canRedo = useAppStore((s) => s.future.length > 0);
  const cardsCollapsed = useAppStore((s) => s.cardsCollapsed);
  const toggleCardsCollapsed = useAppStore((s) => s.toggleCardsCollapsed);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const exportToMarkdown = useAppStore((s) => s.exportToMarkdown);
  const exportToStructuredMarkdown = useAppStore(
    (s) => s.exportToStructuredMarkdown,
  );
  const exportToJson = useAppStore((s) => s.exportToJson);

  useClickOutside(menuRef, () => {
    if (open) setOpen(false);
  });

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open]);

  const close = () => setOpen(false);
  const viewModeLabel = timelineOpen ? t("Tree mode") : t("Line mode");

  const openCommandPalette = () => {
    useAppStore.getState().setCommandPaletteOpen(true);
  };

  return (
    <div ref={menuRef} className="relative sm:hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex h-9 w-9 items-center justify-center rounded border transition-colors ${
          open
            ? "border-app-border bg-app-card-hover text-app-text-primary"
            : "border-transparent text-app-text-muted hover:border-app-border hover:bg-app-card-hover hover:text-app-text-primary"
        }`}
        title="Menu"
        aria-label="Menu"
        aria-expanded={open}
      >
        <Menu size={20} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-[90] mt-2 w-64 overflow-hidden rounded border border-app-border bg-app-panel shadow-xl">
          <button
            onClick={() => {
              setFileMenuOpen(!fileMenuOpen);
              close();
            }}
            className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-app-text-secondary hover:bg-app-card-hover hover:text-app-text-primary"
          >
            <Folder size={16} />
            {t("Documents")}
          </button>
          <button
            onClick={() => {
              setTimelineOpen(!timelineOpen);
              close();
            }}
            className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-app-text-secondary hover:bg-app-card-hover hover:text-app-text-primary"
          >
            {timelineOpen ? (
              <Network size={16} />
            ) : (
              <ScrollText size={16} />
            )}
            {viewModeLabel}
          </button>
          <button
            onClick={() => {
              openCommandPalette();
              close();
            }}
            className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-app-text-secondary hover:bg-app-card-hover hover:text-app-text-primary"
          >
            <Search size={16} />
            {t("Command Palette")}
          </button>
          <div className="border-t border-app-border" />
          <button
            onClick={() => {
              handleUndo();
              close();
            }}
            disabled={!canUndo}
            className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-app-text-secondary hover:bg-app-card-hover hover:text-app-text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Undo2 size={16} />
            Undo
          </button>
          <button
            onClick={() => {
              handleRedo();
              close();
            }}
            disabled={!canRedo}
            className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-app-text-secondary hover:bg-app-card-hover hover:text-app-text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Redo2 size={16} />
            Redo
          </button>
          <div className="border-t border-app-border" />
          {!timelineOpen && (
            <button
              onClick={() => {
                toggleCardsCollapsed();
                close();
              }}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-app-text-secondary hover:bg-app-card-hover hover:text-app-text-primary"
            >
              {cardsCollapsed ? (
                <UnfoldVertical size={16} />
              ) : (
                <FoldVertical size={16} />
              )}
              {t("Collapse cards")}
            </button>
          )}
          <button
            onClick={() => {
              toggleTheme();
              close();
            }}
            className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-app-text-secondary hover:bg-app-card-hover hover:text-app-text-primary"
          >
            <Palette size={16} />
            {t("Theme")}
          </button>
          <label className="flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-sm text-app-text-secondary hover:bg-app-card-hover hover:text-app-text-primary">
            <Download size={16} />
            {t("Import")}
            <input
              type="file"
              accept=".md,.markdown,.json"
              className="hidden"
              onChange={(event) => {
                handleImport(event);
                close();
              }}
            />
          </label>
          <div className="border-t border-app-border" />
          <button
            onClick={() => {
              exportToMarkdown();
              close();
            }}
            className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-app-text-secondary hover:bg-app-card-hover hover:text-app-text-primary"
          >
            <Upload size={14} />
            Flat Markdown
          </button>
          <button
            onClick={() => {
              exportToStructuredMarkdown();
              close();
            }}
            className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-app-text-secondary hover:bg-app-card-hover hover:text-app-text-primary"
          >
            <Network size={14} />
            Structured Markdown
          </button>
          <button
            onClick={() => {
              exportToJson();
              close();
            }}
            className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-app-text-secondary hover:bg-app-card-hover hover:text-app-text-primary"
          >
            <FileJson size={14} />
            Lossless JSON
          </button>
        </div>
      )}
    </div>
  );
}
