import React from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "motion/react";
import { useAppStore } from "../store/useAppStore";

export const ConfirmDialog: React.FC = () => {
  const { t } = useTranslation();
  const confirmDialog = useAppStore((s) => s.confirmDialog);
  const closeConfirm = useAppStore((s) => s.closeConfirm);

  if (!confirmDialog.isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-app-panel border border-app-border rounded-xl shadow-2xl p-6 max-w-sm w-full relative"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-6">
            <h3 className="text-lg font-medium text-app-text-primary mb-2">
              {t("Please confirm")}
            </h3>
            <p className="text-sm text-app-text-secondary">
              {confirmDialog.message}
            </p>
          </div>
          <div className="flex gap-3 justify-end">
            <button
              onClick={closeConfirm}
              className="px-4 py-2 text-sm font-medium text-app-text-secondary bg-app-card hover:bg-app-card-hover border border-app-border rounded transition-colors"
            >
              {t("Cancel")}
            </button>
            <button
              onClick={() => {
                if (confirmDialog.onConfirm) {
                  confirmDialog.onConfirm();
                }
                closeConfirm();
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded transition-colors"
            >
              {t("Confirm")}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
