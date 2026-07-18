import { useRef, useState, useEffect } from "react";
import { Download } from "lucide-react";
import { useClickOutside } from "../hooks/useClickOutside";
import { usePluginHeaderActions } from "../plugins/registry";
import { useTranslation } from "react-i18next";

export function ImportMenu({ handleImport }: { handleImport: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  const headerActions = usePluginHeaderActions();
  const pluginImportActions = headerActions.find(a => a.id === "import-data")?.dropdownItems || [];

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
        title={t("Import")}
        aria-label={t("Import")}
        aria-expanded={open}
      >
        <Download size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-[90] mt-2 w-56 overflow-hidden rounded border border-app-border bg-app-panel shadow-xl">
          <label
            className="flex w-full items-center cursor-pointer gap-2 px-3 py-2 text-left text-sm text-app-text-secondary hover:bg-app-card-hover hover:text-app-text-primary"
            onClick={(e) => {
              // file dialog opens automatically
            }}
          >
            <Download size={14} className="text-app-text-muted" />
            <span>{t("Import")} (.md, .json)</span>
            <input
              type="file"
              accept=".md,.markdown,.json"
              className="hidden"
              onChange={(e) => {
                setOpen(false);
                handleImport(e);
                // reset input value so we can select same file again
                e.target.value = "";
              }}
            />
          </label>
          
          {pluginImportActions.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-app-text-secondary hover:bg-app-card-hover hover:text-app-text-primary"
            >
              {item.icon && <item.icon size={14} className="text-app-text-muted" />}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
