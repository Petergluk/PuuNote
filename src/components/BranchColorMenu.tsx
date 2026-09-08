import { useRef, useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Paintbrush, RotateCcw } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { useClickOutside } from "../hooks/useClickOutside";
import {
  adjustBranchColorRgb,
  getBranchColor,
  getBranchColorId,
  getBranchColorSettings,
  getBranchPalette,
} from "../utils/branchColors";
import { buildTreeIndex } from "../utils/tree";
import { MiniSlider } from "./MiniSlider";

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Math.round(value)));

const branchMixPercent = (value: number) =>
  Math.min(100, Math.max(0, Math.round(value)));

interface BranchColorMenuProps {
  isSettingsUnlocked: boolean;
  onBeautifulClick: () => void;
}

export function BranchColorMenu({
  isSettingsUnlocked,
  onBeautifulClick,
}: BranchColorMenuProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const activeId = useAppStore((s) => s.activeId);
  const nodes = useAppStore((s) => s.nodes);
  const theme = useAppStore((s) => s.theme);
  const branchColorIntensity = useAppStore((s) => s.branchColorIntensity);
  const branchColorSpread = useAppStore((s) => s.branchColorSpread);
  const branchColorTone = useAppStore((s) => s.branchColorTone);
  const branchColorOpacity = useAppStore((s) => s.branchColorOpacity);
  const branchColorGradient = useAppStore((s) => s.branchColorGradient);
  const branchColorSolid = useAppStore((s) => s.branchColorSolid);
  const cardRadius = useAppStore((s) => s.cardRadius);
  const branchColorSettingsById = useAppStore(
    (s) => s.branchColorSettingsById,
  );
  const branchColorTuningTargetId = useAppStore(
    (s) => s.branchColorTuningTargetId,
  );
  const branchColorBorderWidth = useAppStore(
    (s) => s.branchColorBorderWidth,
  );
  const branchColorBorderBrightness = useAppStore(
    (s) => s.branchColorBorderBrightness,
  );
  const setActiveBranchColor = useAppStore((s) => s.setActiveBranchColor);
  const clearAllBranchColors = useAppStore((s) => s.clearAllBranchColors);
  const autoColorRootBranches = useAppStore((s) => s.autoColorRootBranches);
  const setBranchColorIntensity = useAppStore(
    (s) => s.setBranchColorIntensity,
  );
  const setBranchColorSpread = useAppStore((s) => s.setBranchColorSpread);
  const setBranchColorTone = useAppStore((s) => s.setBranchColorTone);
  const setBranchColorOpacity = useAppStore((s) => s.setBranchColorOpacity);
  const setBranchColorGradient = useAppStore(
    (s) => s.setBranchColorGradient,
  );
  const setBranchColorSolid = useAppStore((s) => s.setBranchColorSolid);
  const setCardRadius = useAppStore((s) => s.setCardRadius);
  const setBranchColorBorderWidth = useAppStore(
    (s) => s.setBranchColorBorderWidth,
  );
  const setBranchColorBorderBrightness = useAppStore(
    (s) => s.setBranchColorBorderBrightness,
  );
  const setBranchColorSettingsForId = useAppStore(
    (s) => s.setBranchColorSettingsForId,
  );
  const resetBranchColorSettingsForId = useAppStore(
    (s) => s.resetBranchColorSettingsForId,
  );
  const setBranchColorTuningTargetId = useAppStore(
    (s) => s.setBranchColorTuningTargetId,
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

  useEffect(() => {
    if (!open) {
      setBranchColorTuningTargetId(null);
    }
  }, [open, setBranchColorTuningTargetId]);

  // --- Computed values ---
  const activeBranchColorId = useMemo(() => {
    if (!activeId) return null;
    return getBranchColorId(buildTreeIndex(nodes), activeId);
  }, [activeId, nodes]);

  const globalBranchColorSettings = useMemo(
    () => ({
      intensity: branchColorIntensity,
      fill: branchColorSpread,
      opacity: branchColorOpacity,
      gradient: branchColorGradient,
      solid: branchColorSolid,
      tone: branchColorTone,
      borderWidth: branchColorBorderWidth,
      borderBrightness: branchColorBorderBrightness,
    }),
    [
      branchColorGradient,
      branchColorIntensity,
      branchColorOpacity,
      branchColorSolid,
      branchColorSpread,
      branchColorTone,
      branchColorBorderWidth,
      branchColorBorderBrightness,
    ],
  );

  const tuningBranchColorId =
    activeBranchColorId ?? branchColorTuningTargetId ?? null;
  const currentBranchColorSettings = getBranchColorSettings(
    globalBranchColorSettings,
    branchColorSettingsById,
    tuningBranchColorId,
  );
  const activeBranchColorSettings = getBranchColorSettings(
    globalBranchColorSettings,
    branchColorSettingsById,
    activeBranchColorId,
  );
  const activeBranchColor = getBranchColor(
    theme,
    activeBranchColorId,
    activeBranchColorSettings.tone,
    activeBranchColorSettings,
  );
  const branchPalette = getBranchPalette(theme);
  const tuningBranchRgb = tuningBranchColorId
    ? adjustBranchColorRgb(
        branchPalette[tuningBranchColorId].rgb,
        currentBranchColorSettings.tone,
      )
    : null;
  const branchSliderColor = tuningBranchRgb
    ? `rgb(${tuningBranchRgb})`
    : "var(--app-accent)";
  const branchIntensityMix = branchMixPercent(
    currentBranchColorSettings.intensity * 0.34,
  );
  const branchFillMix = branchMixPercent(
    currentBranchColorSettings.fill * 0.24,
  );
  const branchGradientMidPos =
    26 + currentBranchColorSettings.gradient * 0.45;
  const branchGradientMidMix =
    7 + currentBranchColorSettings.gradient * 0.1;
  const branchGradientEndMix = currentBranchColorSettings.gradient * 0.1;

  // --- Setters ---
  const setBranchSetting = (
    key:
      | "intensity"
      | "fill"
      | "opacity"
      | "gradient"
      | "tone"
      | "borderWidth"
      | "borderBrightness",
    value: number,
  ) => {
    const ranges = {
      intensity: [0, 300],
      fill: [0, 100],
      opacity: [0, 100],
      gradient: [0, 100],
      tone: [-100, 100],
      borderWidth: [0, 8],
      borderBrightness: [0, 100],
    } as const;
    const [min, max] = ranges[key];
    const nextValue = clamp(value, min, max);
    if (tuningBranchColorId) {
      setBranchColorSettingsForId(tuningBranchColorId, { [key]: nextValue });
      return;
    }
    if (key === "intensity") setBranchColorIntensity(nextValue);
    if (key === "fill") setBranchColorSpread(nextValue);
    if (key === "opacity") setBranchColorOpacity(nextValue);
    if (key === "gradient") setBranchColorGradient(nextValue);
    if (key === "tone") setBranchColorTone(nextValue);
    if (key === "borderWidth") setBranchColorBorderWidth(nextValue);
    if (key === "borderBrightness") setBranchColorBorderBrightness(nextValue);
  };

  const setBranchSolid = (solid: boolean) => {
    if (tuningBranchColorId) {
      setBranchColorSettingsForId(tuningBranchColorId, { solid });
      return;
    }
    setBranchColorSolid(solid);
  };

  const setBranchIntensity = (value: number) =>
    setBranchSetting("intensity", value);
  const setBranchSpread = (value: number) => setBranchSetting("fill", value);
  const setBranchTone = (value: number) => setBranchSetting("tone", value);

  return (
    <div ref={menuRef} className="relative hidden sm:block">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`hidden sm:flex bg-app-card border border-app-border/50 hover:bg-app-card-hover hover:border-app-border w-8 h-8 rounded transition-colors items-center justify-center ${
          open
            ? "text-app-text-primary bg-app-card-hover border-app-border"
            : "text-app-text-secondary"
        }`}
        title={t("Branch color")}
        aria-label={t("Branch color")}
        aria-expanded={open}
      >
        <Paintbrush
          className="branch-color-paint"
          size={16}
          style={{
            color: activeBranchColor
              ? `rgb(${activeBranchColor.rgb})`
              : undefined,
          }}
        />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-[90] mt-2 grid w-[206px] grid-cols-5 gap-2 rounded border border-app-border bg-app-panel p-2 shadow-xl">
          <button
            type="button"
            
            onClick={() => {
              if (activeId) {
                setActiveBranchColor(null);
              } else {
                clearAllBranchColors();
                setBranchColorTuningTargetId(null);
              }
              setOpen(false);
            }}
            className={`flex h-8 w-8 items-center justify-center rounded border transition-colors ${
              theme === "mono"
                ? "border-app-border bg-app-card text-app-text-muted opacity-40 cursor-not-allowed"
                : activeBranchColorId === null
                ? "border-app-text-primary bg-app-card-hover text-app-text-primary"
                : "border-app-border bg-app-card text-app-text-muted hover:bg-app-card-hover hover:text-app-text-primary"
            }`}
            title={
              activeId ? t("Reset branch color") : t("Reset all branch colors")
            }
            aria-label={
              activeId ? t("Reset branch color") : t("Reset all branch colors")
            }
          >
            <RotateCcw size={14} />
          </button>
          {Object.values(branchPalette).map((color) => {
            const colorSettings = getBranchColorSettings(
              globalBranchColorSettings,
              branchColorSettingsById,
              color.id,
            );
            const rgb = adjustBranchColorRgb(color.rgb, colorSettings.tone);
            const isCurrentColor =
              activeBranchColorId === color.id ||
              (!activeId && tuningBranchColorId === color.id);
            return (
              <button
                key={color.id}
                type="button"
                data-branch-color-swatch
                
                onClick={() => {
                  if (tuningBranchColorId === color.id) {
                    setBranchColorTuningTargetId(null);
                    if (activeId && activeBranchColorId === color.id) {
                      setActiveBranchColor(null);
                    }
                  } else {
                    setBranchColorTuningTargetId(color.id);
                    if (activeId) {
                      setActiveBranchColor(color.id);
                    }
                  }
                }}
                onContextMenu={(event) => {
                  event.preventDefault();
                  if (theme === "mono") return;
                  resetBranchColorSettingsForId(color.id);
                  setBranchColorTuningTargetId(color.id);
                }}
                className={`h-8 w-8 rounded border transition-transform ${
                  theme === "mono"
                    ? "border-app-border opacity-40 cursor-not-allowed"
                    : isCurrentColor
                    ? "border-app-text-primary"
                    : "border-app-border hover:scale-105"
                }`}
                style={{
                  background: `linear-gradient(135deg, color-mix(in srgb, rgb(${rgb}) 76%, var(--app-card)), rgb(${rgb}))`,
                  boxShadow:
                    isCurrentColor && theme !== "mono"
                      ? `0 0 0 2px color-mix(in srgb, rgb(${rgb}) 34%, transparent)`
                      : undefined,
                }}
                title={theme === "mono" ? undefined : color.label}
                aria-label={
                  activeId
                    ? `Set and tune branch color: ${color.label}`
                    : `Tune branch color: ${color.label}`
                }
              />
            );
          })}
          {/* Always-visible: intensity slider + solid checkbox in one row */}
          <div className="col-span-5 mt-0.5 flex items-center gap-1.5 border-t border-app-border pt-2">
            <div className="min-w-0 flex-1">
              <MiniSlider
                label={t("Brightness")}
                hideLabel
                min={0}
                max={300}
                step={5}
                value={currentBranchColorSettings.intensity}
                fillStyle={{
                  background: `color-mix(in srgb, ${branchSliderColor} ${branchIntensityMix}%, var(--app-card))`,
                }}
                onChange={setBranchIntensity}
                
              />
            </div>
            <label
              className={`flex shrink-0 items-center gap-1.5 rounded bg-app-card${
                theme === "mono"
                  ? " opacity-40 cursor-not-allowed pointer-events-none"
                  : " cursor-pointer"
              }`}
              title={t("Solid fill")}
            >
              <span className="text-[10px] text-app-text-dimmer uppercase tracking-wider">{t("Solid fill")}</span>
              <div className="flex h-[18px] w-[18px] items-center justify-center rounded border border-app-border">
                <input
                  type="checkbox"
                  checked={currentBranchColorSettings.solid}
                  onChange={(event) => setBranchSolid(event.target.checked)}
                  className="h-3 w-3 accent-app-accent"
                  aria-label={t("Solid fill")}
                />
              </div>
            </label>
          </div>
          <div className="col-span-5 mt-2">
            <MiniSlider
              label={t("Corner radius")}
              min={0}
              max={100}
              value={cardRadius * 100}
              fillStyle={{
                borderRadius: `${cardRadius * 100}px`
              }}
              onChange={(value) => setCardRadius(clamp(value, 0, 100) / 100)}
            />
          </div>
          {/* Advanced sliders — visible only when unlocked */}
          {isSettingsUnlocked && (
            <div className="col-span-5 grid gap-2">
              <MiniSlider
                label={t("Fill")}
                min={0}
                max={100}
                step={5}
                value={currentBranchColorSettings.fill}
                fillStyle={{
                  background: `color-mix(in srgb, ${branchSliderColor} ${branchFillMix}%, var(--app-card))`,
                }}
                onChange={setBranchSpread}
                
              />
              <MiniSlider
                label={t("Opacity")}
                min={0}
                max={100}
                step={5}
                value={currentBranchColorSettings.opacity}
                fillStyle={{
                  background: branchSliderColor,
                  opacity: currentBranchColorSettings.opacity / 100,
                }}
                onChange={(value) => setBranchSetting("opacity", value)}
              />
              <MiniSlider
                label={t("Gradient")}
                min={0}
                max={100}
                step={5}
                value={currentBranchColorSettings.gradient}
                fillStyle={{
                  background: `linear-gradient(90deg, color-mix(in srgb, ${branchSliderColor} ${branchFillMix}%, var(--app-card)) 0%, color-mix(in srgb, ${branchSliderColor} ${branchGradientMidMix}%, var(--app-card)) ${branchGradientMidPos}%, color-mix(in srgb, ${branchSliderColor} ${branchGradientEndMix}%, var(--app-card)) 100%)`,
                }}
                onChange={(value) => setBranchSetting("gradient", value)}
              />
              <MiniSlider
                label={t("Tone")}
                min={-100}
                max={100}
                step={5}
                value={currentBranchColorSettings.tone}
                fillStyle={{ background: branchSliderColor }}
                onChange={setBranchTone}
              />
              <MiniSlider
                label={t("Border brightness")}
                min={0}
                max={100}
                step={2}
                value={currentBranchColorSettings.borderBrightness}
                fillStyle={{ background: branchSliderColor }}
                onChange={(value) =>
                  setBranchSetting("borderBrightness", value)
                }
              />
              <MiniSlider
                label={t("Border width")}
                min={0}
                max={8}
                step={1}
                value={currentBranchColorSettings.borderWidth}
                fillStyle={{ background: branchSliderColor }}
                onChange={(value) => setBranchSetting("borderWidth", value)}
              />
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              autoColorRootBranches();
              onBeautifulClick();
            }}
            className="col-span-5 flex h-8 items-center justify-center rounded border border-app-border bg-app-card px-3 text-xs font-medium text-app-text-secondary transition-colors hover:bg-app-card-hover hover:text-app-text-primary"
            title={t("Make it beautiful")}
            aria-label={t("Make it beautiful")}
          >
            {t("Make it beautiful")}
          </button>
        </div>
      )}
    </div>
  );
}
