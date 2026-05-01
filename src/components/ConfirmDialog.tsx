import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "motion/react";
import { useAppStore } from "../store/useAppStore";
import { useFocusTrap } from "../hooks/useFocusTrap";

export const ConfirmDialog: React.FC = () => {
  const { t } = useTranslation();
  const confirmDialog = useAppStore((s) => s.confirmDialog);
  const closeConfirm = useAppStore((s) => s.closeConfirm);
  const [isLoading, setIsLoading] = useState(false);
  const dialogRef = useFocusTrap<HTMLDivElement>(
    confirmDialog.isOpen,
    closeConfirm,
  );

  if (!confirmDialog.isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          aria-describedby="confirm-dialog-message"
          tabIndex={-1}
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-app-panel border border-app-border rounded-xl shadow-2xl p-6 max-w-sm w-full relative"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-6">
            <h3
              id="confirm-dialog-title"
              className="text-lg font-medium text-app-text-primary mb-2"
            >
              {t("Please confirm")}
            </h3>
            <p
              id="confirm-dialog-message"
              className="text-sm text-app-text-secondary"
            >
              {confirmDialog.message}
            </p>
          </div>
          <div className="flex gap-3 justify-end">
            <button
              onClick={closeConfirm}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-app-text-secondary bg-app-card hover:bg-app-card-hover border border-app-border rounded transition-colors disabled:opacity-50"
            >
              {t("Cancel")}
            </button>
            <button
              disabled={isLoading}
              onClick={async () => {
                if (confirmDialog.onConfirm) {
                  setIsLoading(true);
                  try {
                    await confirmDialog.onConfirm();
                  } finally {
                    setIsLoading(false);
                    closeConfirm();
                  }
                } else {
                  closeConfirm();
                }
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded transition-colors disabled:opacity-50"
            >
              {isLoading ? t("Wait...") : t("Confirm")}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
