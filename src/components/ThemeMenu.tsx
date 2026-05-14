import { useState, useMemo, useRef } from "react";
import { Palette, Copy, RotateCcw, PaintBucket } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { useClickOutside } from "../hooks/useClickOutside";
import {
  getThemeId,
  getThemeTune,
  THEME_IDS,
  THEME_LABELS,
  type ThemeTune,
} from "../utils/themeTuning";

const themeTuneControls: Array<{
  key: keyof ThemeTune;
  label: string;
}> = [
  { key: "bg", label: "Фон" },
  { key: "card", label: "Карточка" },
  { key: "text", label: "Текст" },
];

export function ThemeMenu() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);
  const themeTuning = useAppStore((state) => state.themeTuning);
  const setThemeTuneValue = useAppStore((state) => state.setThemeTuneValue);
  const resetThemeTune = useAppStore((state) => state.resetThemeTune);
  const toggleTheme = useAppStore((s) => s.toggleTheme);

  const themeId = getThemeId(theme);
  const currentThemeTune = getThemeTune(themeTuning, themeId);
  const themeTuningJson = useMemo(
    () => JSON.stringify(themeTuning, null, 2),
    [themeTuning],
  );

  useClickOutside(menuRef, () => {
    if (open) setOpen(false);
  });

  const copyThemeTuning = async () => {
    try {
      await navigator.clipboard.writeText(themeTuningJson);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div ref={menuRef} className="relative hidden sm:flex items-center gap-1">
      <button
        onClick={toggleTheme}
        className="flex bg-app-card border border-app-border hover:bg-app-card-hover p-1.5 px-3 py-1.5 rounded transition-colors text-app-text-secondary font-medium items-center justify-center gap-2"
        title="Toggle theme"
        aria-label="Toggle theme"
      >
        <Palette size={16} />
      </button>

      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex bg-app-card border hover:bg-app-card-hover p-1.5 px-2 py-1.5 rounded transition-colors text-app-text-secondary font-medium items-center justify-center gap-2 ${open ? "border-app-text-primary text-app-text-primary bg-app-card-hover" : "border-app-border text-app-text-secondary"}`}
        title="Theme settings"
        aria-label="Theme settings"
        aria-expanded={open}
      >
        <PaintBucket size={14} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-[100] mt-2 w-72 rounded border border-app-border bg-app-panel shadow-xl p-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-app-text-primary">Тонкая настройка темы</span>
              <button
                type="button"
                onClick={() => resetThemeTune(theme)}
                className="flex h-7 items-center gap-1.5 rounded border border-app-border bg-app-card px-2 text-xs text-app-text-muted transition-colors hover:bg-app-card-hover hover:text-app-text-primary"
                title="Сбросить настройки текущей темы"
                aria-label="Сбросить настройки текущей темы"
              >
                <RotateCcw size={12} />
                Сброс
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-1.5">
              {THEME_IDS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setTheme(item)}
                  aria-pressed={themeId === item}
                  className={`rounded border px-2 py-1.5 text-left text-xs transition-colors ${
                    themeId === item
                      ? "border-app-text-primary bg-app-card-hover text-app-text-primary"
                      : "border-app-border bg-app-card text-app-text-muted hover:bg-app-card-hover hover:text-app-text-primary"
                  }`}
                >
                  {THEME_LABELS[item]}
                </button>
              ))}
            </div>

            <div className="grid gap-3 rounded border border-app-border bg-app-card/60 p-3 mt-1">
              {themeTuneControls.map((control) => (
                <label key={control.key} className="grid gap-1">
                  <span className="flex items-center justify-between gap-3 text-xs text-app-text-secondary">
                    <span>{control.label}</span>
                    <span className="tabular-nums text-app-text-muted">
                      {currentThemeTune[control.key]}
                    </span>
                  </span>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    step="1"
                    value={currentThemeTune[control.key]}
                    onChange={(event) =>
                      setThemeTuneValue(
                        theme,
                        control.key,
                        Number(event.target.value),
                      )
                    }
                    className="h-1 w-full cursor-pointer accent-app-accent"
                    aria-label={control.label}
                  />
                </label>
              ))}
            </div>

            <div className="grid gap-2 rounded border border-app-border bg-app-card/60 p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] text-app-text-muted">
                  Конфиг (json)
                </span>
                <button
                  type="button"
                  onClick={() => void copyThemeTuning()}
                  className="flex h-6 items-center gap-1.5 rounded border border-app-border bg-app-card px-2 text-[10px] text-app-text-muted transition-colors hover:bg-app-card-hover hover:text-app-text-primary"
                  title="Скопировать настройки тем"
                  aria-label="Скопировать настройки тем"
                >
                  <Copy size={10} />
                  {copied ? "Готово" : "Копия"}
                </button>
              </div>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
