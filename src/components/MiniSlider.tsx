import { useState } from "react";
import type { CSSProperties, KeyboardEvent } from "react";

type MiniSliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  fillStyle?: CSSProperties;
  disabled?: boolean;
  hideLabel?: boolean;
  onChange: (value: number) => void;
  onStepDown?: () => void;
  onStepUp?: () => void;
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Math.round(value)));

export function MiniSlider({
  label,
  value,
  min,
  max,
  step = 1,
  fillStyle,
  disabled = false,
  hideLabel = false,
  onChange,
  onStepDown,
  onStepUp,
}: MiniSliderProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const safeRange = max - min || 1;
  const safeValue = clamp(value, min, max);
  const progress = ((safeValue - min) / safeRange) * 100;
  const updateValue = (nextValue: number) => {
    onChange(clamp(nextValue, min, max));
  };
  const commitDraft = () => {
    if (draft.trim() !== "") updateValue(Number(draft));
    setEditing(false);
  };
  const handleDraftKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") commitDraft();
    if (event.key === "Escape") setEditing(false);
  };

  return (
    <div className={`grid gap-1${disabled ? " opacity-35 pointer-events-none select-none" : ""}`}>
      {!hideLabel && (
        <span className="text-[10px] font-medium uppercase tracking-wide text-app-text-muted">
          {label}
        </span>
      )}
      <div className="flex h-[18px] w-full select-none overflow-hidden rounded-[7px] border border-app-border bg-app-card">
        <button
          type="button"
          onClick={() =>
            onStepDown ? onStepDown() : updateValue(safeValue - step)
          }
          className="flex w-6 shrink-0 items-center justify-center border-r border-app-border text-xs font-semibold text-app-text-secondary transition-colors hover:bg-app-card-hover hover:text-app-text-primary"
          aria-label={`${label}: уменьшить`}
        >
          -
        </button>
        <div className="relative min-w-0 flex-1 bg-app-bg">
          <div
            className="absolute inset-y-0 left-0 bg-app-accent/55"
            style={{ width: `${progress}%`, ...fillStyle }}
          />
          <div
            className="absolute top-0 z-20 flex h-full w-10 -translate-x-1/2 items-center justify-center border-x border-app-border bg-app-panel/85 text-[10px] font-semibold tabular-nums text-app-text-primary shadow-sm"
            style={{
              left: `clamp(1.25rem, ${progress}%, calc(100% - 1.25rem))`,
            }}
            title="Двойной клик: ввести значение"
          >
            {editing ? (
              <input
                type="number"
                autoFocus
                min={min}
                max={max}
                step={step}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onBlur={commitDraft}
                onKeyDown={handleDraftKeyDown}
                className="h-full w-full bg-transparent text-center text-[10px] font-semibold text-app-text-primary outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                aria-label={`${label}: значение`}
              />
            ) : (
              safeValue
            )}
          </div>
          {!editing && (
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={safeValue}
              onChange={(event) => updateValue(Number(event.target.value))}
              onDoubleClick={() => {
                setDraft(String(safeValue));
                setEditing(true);
              }}
              className="absolute inset-0 z-30 h-full w-full cursor-pointer opacity-0"
              aria-label={label}
              title="Двойной клик: ввести значение"
            />
          )}
        </div>
        <button
          type="button"
          onClick={() =>
            onStepUp ? onStepUp() : updateValue(safeValue + step)
          }
          className="flex w-6 shrink-0 items-center justify-center border-l border-app-border text-xs font-semibold text-app-text-secondary transition-colors hover:bg-app-card-hover hover:text-app-text-primary"
          aria-label={`${label}: увеличить`}
        >
          +
        </button>
      </div>
    </div>
  );
}
