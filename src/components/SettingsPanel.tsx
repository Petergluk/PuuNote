import { X } from "lucide-react";
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

export function SettingsPanel() {
  const { t, i18n } = useTranslation();
  const settingsOpen = useAppStore((state) => state.settingsOpen);
  const setSettingsOpen = useAppStore((state) => state.setSettingsOpen);
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
