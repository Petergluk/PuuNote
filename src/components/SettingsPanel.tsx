import { Copy, RotateCcw, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../store/useAppStore";
import { useFocusTrap } from "../hooks/useFocusTrap";
import type {
  EditorEnterMode,
  FocusModeScope,
  EditorMode,
  InactiveBranchesMode,
  PasteSplitMode,
} from "../store/appStoreTypes";
import {
  getThemeId,
  getThemeTune,
  THEME_IDS,
  THEME_LABELS,
  type ThemeTune,
} from "../utils/themeTuning";

const branchModes: Array<{
  value: InactiveBranchesMode;
  labelKey: string;
}> = [
  { value: "dim", labelKey: "settings.dim" },
  { value: "hide", labelKey: "settings.hide" },
];

const focusModes: Array<{
  value: FocusModeScope;
  labelKey: string;
}> = [
  { value: "single", labelKey: "settings.single" },
  { value: "branchLevel", labelKey: "settings.branchLevel" },
  { value: "column", labelKey: "settings.column" },
];

const editorModes: Array<{
  value: EditorMode;
  labelKey: string;
}> = [
  { value: "markdown", labelKey: "settings.markdown" },
  { value: "visual", labelKey: "settings.visual" },
];

const editorEnterModes: Array<{
  value: EditorEnterMode;
  labelKey: string;
}> = [
  { value: "enterNewline", labelKey: "settings.enterNewline" },
  { value: "enterCard", labelKey: "settings.enterCard" },
];

const pasteSplitModes: Array<{
  value: PasteSplitMode;
  labelKey: string;
}> = [
  { value: "separator", labelKey: "settings.separators" },
  { value: "paragraph", labelKey: "settings.paragraphs" },
];

const themeTuneControls: Array<{
  key: keyof ThemeTune;
  label: string;
}> = [
  { key: "bg", label: "Фон" },
  { key: "card", label: "Карточка" },
  { key: "activeCard", label: "Активная" },
  { key: "text", label: "Текст" },
];

export function SettingsPanel() {
  const { t, i18n } = useTranslation();
  const [copied, setCopied] = useState(false);
  const settingsOpen = useAppStore((state) => state.settingsOpen);
  const setSettingsOpen = useAppStore((state) => state.setSettingsOpen);
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);
  const themeTuning = useAppStore((state) => state.themeTuning);
  const setThemeTuneValue = useAppStore((state) => state.setThemeTuneValue);
  const resetThemeTune = useAppStore((state) => state.resetThemeTune);
  const inactiveBranchesMode = useAppStore(
    (state) => state.inactiveBranchesMode,
  );
  const setInactiveBranchesMode = useAppStore(
    (state) => state.setInactiveBranchesMode,
  );
  const focusModeScope = useAppStore((state) => state.focusModeScope);
  const setFocusModeScope = useAppStore((state) => state.setFocusModeScope);
  const editorMode = useAppStore((state) => state.editorMode);
  const setEditorMode = useAppStore((state) => state.setEditorMode);
  const editorEnterMode = useAppStore((state) => state.editorEnterMode);
  const setEditorEnterMode = useAppStore((state) => state.setEditorEnterMode);
  const pasteSplitMode = useAppStore((state) => state.pasteSplitMode);
  const setPasteSplitMode = useAppStore((state) => state.setPasteSplitMode);

  const language = i18n.resolvedLanguage?.startsWith("ru") ? "ru" : "en";
  const panelRef = useFocusTrap<HTMLElement>(settingsOpen, () =>
    setSettingsOpen(false),
  );
  const themeId = getThemeId(theme);
  const currentThemeTune = getThemeTune(themeTuning, themeId);
  const themeTuningJson = useMemo(
    () => JSON.stringify(themeTuning, null, 2),
    [themeTuning],
  );

  const copyThemeTuning = async () => {
    try {
      await navigator.clipboard.writeText(themeTuningJson);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  if (!settingsOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[95]"
      onClick={() => setSettingsOpen(false)}
    >
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-panel-title"
        tabIndex={-1}
        className="absolute right-2 top-14 max-h-[calc(100vh-4rem)] w-[min(420px,calc(100vw-1rem))] overflow-y-auto rounded border border-app-border bg-app-panel shadow-2xl sm:right-6"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-app-border px-4 py-3">
          <h2
            id="settings-panel-title"
            className="text-sm font-semibold text-app-text-primary"
          >
            {t("settings.title")}
          </h2>
          <button
            onClick={() => setSettingsOpen(false)}
            className="rounded p-1.5 text-app-text-muted hover:bg-app-card-hover hover:text-app-text-primary"
            title={t("settings.close")}
            aria-label={t("settings.close")}
          >
            <X size={16} />
          </button>
        </header>

        <div className="flex flex-col gap-4 p-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-app-text-secondary">
              {t("settings.language")}
            </span>
            <div className="flex shrink-0 rounded border border-app-border bg-app-card p-0.5">
              {(["ru", "en"] as const).map((lng) => (
                <button
                  key={lng}
                  onClick={() => void i18n.changeLanguage(lng)}
                  aria-pressed={language === lng}
                  className={`rounded px-3 py-1.5 text-xs transition-colors ${
                    language === lng
                      ? "bg-app-accent text-white"
                      : "text-app-text-muted hover:bg-app-card-hover hover:text-app-text-primary"
                  }`}
                >
                  {lng.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 border-t border-app-border pt-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-app-text-secondary">Тема</span>
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
            <div className="grid gap-3 rounded border border-app-border bg-app-card/60 p-3">
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
                <span className="text-xs text-app-text-secondary">
                  Значения для фиксации
                </span>
                <button
                  type="button"
                  onClick={() => void copyThemeTuning()}
                  className="flex h-7 items-center gap-1.5 rounded border border-app-border bg-app-card px-2 text-xs text-app-text-muted transition-colors hover:bg-app-card-hover hover:text-app-text-primary"
                  title="Скопировать настройки тем"
                  aria-label="Скопировать настройки тем"
                >
                  <Copy size={12} />
                  {copied ? "Готово" : "Копия"}
                </button>
              </div>
              <pre className="max-h-28 overflow-auto whitespace-pre-wrap rounded bg-app-bg p-2 text-[10px] leading-snug text-app-text-muted">
                {themeTuningJson}
              </pre>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-app-text-secondary">
              {t("settings.inactiveBranches")}
            </span>
            <div className="flex shrink-0 rounded border border-app-border bg-app-card p-0.5">
              {branchModes.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => setInactiveBranchesMode(mode.value)}
                  aria-pressed={inactiveBranchesMode === mode.value}
                  className={`rounded px-3 py-1.5 text-xs transition-colors ${
                    inactiveBranchesMode === mode.value
                      ? "bg-app-accent text-white"
                      : "text-app-text-muted hover:bg-app-card-hover hover:text-app-text-primary"
                  }`}
                >
                  {t(mode.labelKey)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-app-text-secondary">
              {t("settings.focusMode")}
            </span>
            <div className="flex shrink-0 rounded border border-app-border bg-app-card p-0.5">
              {focusModes.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => setFocusModeScope(mode.value)}
                  aria-pressed={focusModeScope === mode.value}
                  className={`rounded px-2 py-1.5 text-xs transition-colors ${
                    focusModeScope === mode.value
                      ? "bg-app-accent text-white"
                      : "text-app-text-muted hover:bg-app-card-hover hover:text-app-text-primary"
                  }`}
                >
                  {t(mode.labelKey)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-app-text-secondary">
              {t("settings.editorMode")}
            </span>
            <div className="flex shrink-0 rounded border border-app-border bg-app-card p-0.5">
              {editorModes.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => setEditorMode(mode.value)}
                  aria-pressed={editorMode === mode.value}
                  className={`rounded px-3 py-1.5 text-xs transition-colors ${
                    editorMode === mode.value
                      ? "bg-app-accent text-white"
                      : "text-app-text-muted hover:bg-app-card-hover hover:text-app-text-primary"
                  }`}
                >
                  {t(mode.labelKey)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-app-text-secondary">
              {t("settings.editorEnter")}
            </span>
            <div className="flex shrink-0 rounded border border-app-border bg-app-card p-0.5">
              {editorEnterModes.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => setEditorEnterMode(mode.value)}
                  aria-pressed={editorEnterMode === mode.value}
                  className={`rounded px-2.5 py-1.5 text-xs transition-colors ${
                    editorEnterMode === mode.value
                      ? "bg-app-accent text-white"
                      : "text-app-text-muted hover:bg-app-card-hover hover:text-app-text-primary"
                  }`}
                >
                  {t(mode.labelKey)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-app-text-secondary">
              {t("settings.pasteSplit")}
            </span>
            <div className="flex shrink-0 rounded border border-app-border bg-app-card p-0.5">
              {pasteSplitModes.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => setPasteSplitMode(mode.value)}
                  aria-pressed={pasteSplitMode === mode.value}
                  className={`rounded px-2.5 py-1.5 text-xs transition-colors ${
                    pasteSplitMode === mode.value
                      ? "bg-app-accent text-white"
                      : "text-app-text-muted hover:bg-app-card-hover hover:text-app-text-primary"
                  }`}
                >
                  {t(mode.labelKey)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
