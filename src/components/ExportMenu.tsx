import { useRef, useState, useEffect } from "react";
import { Upload, Network, FileJson } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { useClickOutside } from "../hooks/useClickOutside";

export function ExportMenu() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  return (
    <div ref={menuRef} className="relative hidden sm:block">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`hidden sm:flex bg-app-card border border-app-border/50 hover:bg-app-card-hover hover:border-app-border w-8 h-8 rounded transition-colors items-center justify-center ${
          open
            ? "text-app-text-primary bg-app-card-hover border-app-border"
            : "text-app-text-secondary"
        }`}
        title="Export"
        aria-label="Export"
        aria-expanded={open}
      >
        <Upload size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-[90] mt-2 w-56 overflow-hidden rounded border border-app-border bg-app-panel shadow-xl">
          <button
            onClick={() => {
              exportToMarkdown();
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-app-text-secondary hover:bg-app-card-hover hover:text-app-text-primary"
          >
            <Upload size={14} />
            Flat Markdown
          </button>
          <button
            onClick={() => {
              exportToStructuredMarkdown();
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-app-text-secondary hover:bg-app-card-hover hover:text-app-text-primary"
          >
            <Network size={14} />
            Structured Markdown
          </button>
          <button
            onClick={() => {
              exportToJson();
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-app-text-secondary hover:bg-app-card-hover hover:text-app-text-primary"
          >
            <FileJson size={14} />
            Lossless JSON
          </button>
        </div>
      )}
    </div>
  );
}
