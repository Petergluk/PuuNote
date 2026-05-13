import { useRef, useState, useEffect, useMemo } from "react";
import { Copy, RotateCcw, SlidersHorizontal } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { useClickOutside } from "../hooks/useClickOutside";
import {
  getThemeId,
  getThemeTune,
  THEME_IDS,
  THEME_LABELS,
} from "../utils/themeTuning";
import { MiniSlider } from "./MiniSlider";

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Math.round(value)));

export function ThemeTuneMenu() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const theme = useAppStore((s) => s.theme);
  const themeTuning = useAppStore((s) => s.themeTuning);
  const inactiveCardDim = useAppStore((s) => s.inactiveCardDim);
  const setTheme = useAppStore((s) => s.setTheme);
  const setThemeTuneValue = useAppStore((s) => s.setThemeTuneValue);
  const resetThemeTune = useAppStore((s) => s.resetThemeTune);
  const setInactiveCardDim = useAppStore((s) => s.setInactiveCardDim);

  const branchColorIntensity = useAppStore((s) => s.branchColorIntensity);
  const branchColorSpread = useAppStore((s) => s.branchColorSpread);
  const branchColorTone = useAppStore((s) => s.branchColorTone);
  const branchColorOpacity = useAppStore((s) => s.branchColorOpacity);
  const branchColorGradient = useAppStore((s) => s.branchColorGradient);
  const branchColorSolid = useAppStore((s) => s.branchColorSolid);
  const branchColorSettingsById = useAppStore(
    (s) => s.branchColorSettingsById,
  );

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

  const themeId = getThemeId(theme);
  const currentThemeTune = getThemeTune(themeTuning, themeId);
  const resolvedThemeTuning = useMemo(
    () =>
      Object.fromEntries(
        THEME_IDS.map((item) => [item, getThemeTune(themeTuning, item)]),
      ),
    [themeTuning],
  );
  const tuningExportJson = useMemo(
    () =>
      JSON.stringify(
        {
          theme,
          themeTuning: resolvedThemeTuning,
          branchColors: {
            intensity: branchColorIntensity,
            fill: branchColorSpread,
            opacity: branchColorOpacity,
            gradient: branchColorGradient,
            solid: branchColorSolid,
            tone: branchColorTone,
            byColor: branchColorSettingsById,
          },
          inactiveCardDim,
        },
        null,
        2,
      ),
    [
      branchColorGradient,
      branchColorIntensity,
      branchColorOpacity,
      branchColorSettingsById,
      branchColorSolid,
      branchColorSpread,
      branchColorTone,
      inactiveCardDim,
      resolvedThemeTuning,
      theme,
    ],
  );

  const copyThemeTuning = async () => {
    try {
      await navigator.clipboard.writeText(tuningExportJson);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div ref={menuRef} className="relative hidden sm:block">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`bg-app-card border border-app-border hover:bg-app-card-hover p-1.5 sm:px-3 sm:py-1.5 rounded transition-colors font-medium flex items-center gap-2 ${
          open
            ? "text-app-text-primary bg-app-card-hover"
            : "text-app-text-secondary"
        }`}
        title="Theme tuning"
        aria-label="Theme tuning"
        aria-expanded={open}
      >
        <SlidersHorizontal size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-[90] mt-2 grid w-[260px] gap-3 rounded border border-app-border bg-app-panel p-3 shadow-xl">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-app-text-secondary">
              Тема
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => resetThemeTune(theme)}
                className="flex h-7 w-7 items-center justify-center rounded border border-app-border bg-app-card text-app-text-muted transition-colors hover:bg-app-card-hover hover:text-app-text-primary"
                title="Сбросить настройки текущей темы"
                aria-label="Сбросить настройки текущей темы"
              >
                <RotateCcw size={12} />
              </button>
              <button
                type="button"
                onClick={() => void copyThemeTuning()}
                className="flex h-7 w-7 items-center justify-center rounded border border-app-border bg-app-card text-app-text-muted transition-colors hover:bg-app-card-hover hover:text-app-text-primary"
                title={
                  copied
                    ? "Настройки скопированы"
                    : "Скопировать все настройки темы"
                }
                aria-label="Скопировать все настройки темы"
              >
                <Copy size={12} />
              </button>
            </div>
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
          <MiniSlider
            label="Фон"
            min={-50}
            max={50}
            value={currentThemeTune.bg}
            fillStyle={{ background: "var(--app-bg)" }}
            onChange={(value) => setThemeTuneValue(theme, "bg", value)}
          />
          <MiniSlider
            label="Карточка"
            min={-50}
            max={50}
            value={currentThemeTune.card}
            fillStyle={{ background: "var(--app-card)" }}
            onChange={(value) => setThemeTuneValue(theme, "card", value)}
          />
          <MiniSlider
            label="Активная"
            min={-50}
            max={50}
            value={currentThemeTune.activeCard}
            fillStyle={{ background: "var(--app-card-active)" }}
            onChange={(value) =>
              setThemeTuneValue(theme, "activeCard", value)
            }
          />
          <MiniSlider
            label="Текст"
            min={-50}
            max={50}
            value={currentThemeTune.text}
            fillStyle={{ background: "var(--app-text-primary)" }}
            onChange={(value) => setThemeTuneValue(theme, "text", value)}
          />
          <MiniSlider
            label="Тепло / холод"
            min={-50}
            max={50}
            value={currentThemeTune.warmth}
            fillStyle={{
              background:
                "linear-gradient(90deg, #b9e4ff 0%, var(--app-card) 50%, #c98238 100%)",
            }}
            onChange={(value) => setThemeTuneValue(theme, "warmth", value)}
          />
          <MiniSlider
            label="Неактивные"
            min={-50}
            max={50}
            value={inactiveCardDim}
            fillStyle={{
              opacity: Math.max(0.08, (50 + inactiveCardDim) / 100),
            }}
            onChange={(value) => setInactiveCardDim(clamp(value, -50, 50))}
          />
          {copied && (
            <div className="rounded border border-app-border bg-app-card px-2 py-1.5 text-xs text-app-text-muted">
              Настройки скопированы
            </div>
          )}
        </div>
      )}
    </div>
  );
}
