import React, { useState, useEffect } from "react";
import { X, Keyboard } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation();
  const [os, setOs] = useState<"mac" | "win">("mac");

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isMac = os === "mac";

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-app-panel border border-app-border rounded-xl shadow-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto flex flex-col p-6 relative"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-app-text-secondary hover:text-app-text-primary transition-colors bg-app-card p-1.5 rounded-full hover:bg-app-card-hover"
          >
            <X size={16} />
          </button>

          <div className="flex items-center gap-3 mb-4">
            <Keyboard className="text-app-accent" size={20} />
            <h2 className="text-lg font-medium text-app-text-primary tracking-tight">
              {t("Shortcuts")}
            </h2>
          </div>

          <div className="flex bg-app-card p-1 rounded-lg border border-app-border mb-4">
            <button
              onClick={() => setOs("mac")}
              className={`flex-1 py-1 text-sm rounded-md transition-colors ${isMac ? "bg-app-panel shadow-sm text-app-text-primary" : "text-app-text-secondary hover:text-app-text-primary"}`}
            >
              Mac
            </button>
            <button
              onClick={() => setOs("win")}
              className={`flex-1 py-1 text-sm rounded-md transition-colors ${!isMac ? "bg-app-panel shadow-sm text-app-text-primary" : "text-app-text-secondary hover:text-app-text-primary"}`}
            >
              Windows
            </button>
          </div>

          <div className="w-full space-y-2 text-sm">
            <div className="flex justify-between items-center py-1.5">
              <span className="text-app-text-secondary">{t("Move focus")}</span>
              <span className="font-mono text-app-text-primary">↑ ↓ ← →</span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="text-app-text-secondary">
                {t("Clear focus")}
              </span>
              <span className="font-mono text-app-text-primary">Esc</span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="text-app-text-secondary">
                {t("Edit selected")}
              </span>
              <span className="font-mono text-app-text-primary">Enter</span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="text-app-text-secondary">
                {t("Save changes")}
              </span>
              <span className="font-mono text-app-text-primary">
                {isMac ? "⌘ + Enter" : "Ctrl + Enter"}
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="text-app-text-secondary">
                {t("Undo shortcut")}
              </span>
              <span className="font-mono text-app-text-primary">
                {isMac ? "⌘Z" : "Ctrl+Z"}
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="text-app-text-secondary">
                {t("Redo shortcut")}
              </span>
              <span className="font-mono text-app-text-primary">
                {isMac ? "⇧⌘Z" : "Ctrl+Shift+Z"}
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-t border-app-border/50 pt-2 mt-2">
              <span className="text-app-text-secondary">
                {t("Add Sibling")}
              </span>
              <span className="font-mono text-app-text-primary">
                Shift + Enter
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="text-app-text-secondary">{t("Add Child")}</span>
              <span className="font-mono text-app-text-primary">Tab</span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="text-app-text-secondary">
                {t("Command Palette")}
              </span>
              <span className="font-mono text-app-text-primary">
                {isMac ? "⌘K" : "Ctrl+K"}
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
