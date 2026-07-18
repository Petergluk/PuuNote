import React from "react";
import { MyPluginSettings } from "./settings";

export const ImportModal = ({ files, onClose, onImport }: { files: File[], onClose: () => void, onImport: (files: File[]) => void }) => {
  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4 pointer-events-auto"
      onClick={onClose}
    >
      <div 
        className="bg-app-card rounded-lg shadow-lg max-w-lg w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-app-border flex justify-between items-center">
          <h2 className="text-lg font-semibold text-app-text-primary">Настройки умного импорта</h2>
        </div>
        <div className="p-4 overflow-y-auto">
          <MyPluginSettings isModal={true} />
        </div>
        <div className="p-4 border-t border-app-border flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded text-app-text-secondary hover:bg-app-input-bg transition-colors text-sm font-medium">
            Отмена
          </button>
          <button onClick={() => {
            onClose();
            onImport(files);
          }} className="px-4 py-2 rounded bg-app-accent text-white hover:bg-app-accent/90 transition-colors text-sm font-medium">
            Начать импорт
          </button>
        </div>
      </div>
    </div>
  );
};
