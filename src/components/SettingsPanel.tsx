import { X } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import type {
  EditorMode,
  EditorEnterMode,
  FocusModeScope,
  InactiveBranchesMode,
  PasteSplitMode,
} from "../store/appStoreTypes";

const branchModes: Array<{
  value: InactiveBranchesMode;
  label: string;
}> = [
  { value: "dim", label: "Dim" },
  { value: "hide", label: "Hide" },
];

const focusScopes: Array<{
  value: FocusModeScope;
  label: string;
}> = [
  { value: "single", label: "Single" },
  { value: "branchLevel", label: "Level" },
  { value: "column", label: "Column" },
];

const editorModes: Array<{
  value: EditorMode;
  label: string;
}> = [
  { value: "markdown", label: "Markdown" },
  { value: "visual", label: "Visual" },
];

const editorEnterModes: Array<{
  value: EditorEnterMode;
  label: string;
}> = [
  { value: "enterNewline", label: "Enter = Line" },
  { value: "enterCard", label: "Enter = Card" },
];

const pasteSplitModes: Array<{
  value: PasteSplitMode;
  label: string;
}> = [
  { value: "separator", label: "Separators" },
  { value: "paragraph", label: "Paragraphs" },
];

export function SettingsPanel() {
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

  if (!settingsOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[95]"
      onClick={() => setSettingsOpen(false)}
    >
      <section
        className="absolute right-2 top-14 sm:right-6 w-[min(340px,calc(100vw-1rem))] rounded border border-app-border bg-app-panel shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-app-border px-4 py-3">
          <h2 className="text-sm font-semibold text-app-text-primary">
            Settings
          </h2>
          <button
            onClick={() => setSettingsOpen(false)}
            className="rounded p-1.5 text-app-text-muted hover:bg-app-card-hover hover:text-app-text-primary"
            title="Close settings"
          >
            <X size={16} />
          </button>
        </header>

        <div className="flex flex-col gap-4 p-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-app-text-secondary">
              Inactive branches
            </span>
            <div className="flex shrink-0 rounded border border-app-border bg-app-card p-0.5">
              {branchModes.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => setInactiveBranchesMode(mode.value)}
                  className={`rounded px-3 py-1.5 text-xs transition-colors ${
                    inactiveBranchesMode === mode.value
                      ? "bg-app-accent text-white"
                      : "text-app-text-muted hover:bg-app-card-hover hover:text-app-text-primary"
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-app-text-secondary">Focus mode</span>
            <div className="flex shrink-0 rounded border border-app-border bg-app-card p-0.5">
              {focusScopes.map((scope) => (
                <button
                  key={scope.value}
                  onClick={() => setFocusModeScope(scope.value)}
                  className={`rounded px-2.5 py-1.5 text-xs transition-colors ${
                    focusModeScope === scope.value
                      ? "bg-app-accent text-white"
                      : "text-app-text-muted hover:bg-app-card-hover hover:text-app-text-primary"
                  }`}
                >
                  {scope.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-app-text-secondary">Editor</span>
            <div className="flex shrink-0 rounded border border-app-border bg-app-card p-0.5">
              {editorModes.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => setEditorMode(mode.value)}
                  className={`rounded px-2.5 py-1.5 text-xs transition-colors ${
                    editorMode === mode.value
                      ? "bg-app-accent text-white"
                      : "text-app-text-muted hover:bg-app-card-hover hover:text-app-text-primary"
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-app-text-secondary">
              Editor Enter
            </span>
            <div className="flex shrink-0 rounded border border-app-border bg-app-card p-0.5">
              {editorEnterModes.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => setEditorEnterMode(mode.value)}
                  className={`rounded px-2.5 py-1.5 text-xs transition-colors ${
                    editorEnterMode === mode.value
                      ? "bg-app-accent text-white"
                      : "text-app-text-muted hover:bg-app-card-hover hover:text-app-text-primary"
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-app-text-secondary">Paste split</span>
            <div className="flex shrink-0 rounded border border-app-border bg-app-card p-0.5">
              {pasteSplitModes.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => setPasteSplitMode(mode.value)}
                  className={`rounded px-2.5 py-1.5 text-xs transition-colors ${
                    pasteSplitMode === mode.value
                      ? "bg-app-accent text-white"
                      : "text-app-text-muted hover:bg-app-card-hover hover:text-app-text-primary"
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
