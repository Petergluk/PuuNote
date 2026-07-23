import React, { useState } from "react";
import { pluginApi } from "./api";
import { Trash2 } from "lucide-react";

export function MyPluginSettings({ isModal = false }: { isModal?: boolean } = {}) {
  const [maxDepth, setMaxDepth] = useState(() => pluginApi?.settings?.get('max_depth', 0));
  const [detailLevel, setDetailLevel] = useState(() => pluginApi?.settings?.get('detail_level', 'brief'));
  const [customPrompt, setCustomPrompt] = useState(() => pluginApi?.settings?.get('custom_prompt', ''));
  const [promptHistory, setPromptHistory] = useState<string[]>(() => {
    const hist = pluginApi?.settings?.get('custom_prompt_history', []);
    return Array.isArray(hist) ? hist : [];
  });
  const [createNewDocument, setCreateNewDocument] = useState(() => pluginApi?.settings?.get('create_new_document', true));
  const [showImportDialog, setShowImportDialog] = useState(() => pluginApi?.settings?.get('show_import_dialog', true));
  const defaultSystemPrompt = 'Твоя задача — преобразовать линейный текст в иерархическую древовидную структуру. Это необходимо для того, чтобы пользователь мог нелинейно перемещаться по материалу. Раздели текст на логические блоки, темы или хронологические этапы и выстрой их в виде вложенного дерева.';
  const [systemPrompt, setSystemPrompt] = useState(() => pluginApi?.settings?.get('system_prompt', defaultSystemPrompt));

  const saveToHistory = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    
    setPromptHistory(prev => {
      const filtered = prev.filter(p => p !== trimmed);
      const next = [trimmed, ...filtered].slice(0, 30);
      pluginApi?.settings?.set('custom_prompt_history', next);
      return next;
    });
  };

  const removeFromHistory = (text: string) => {
    setPromptHistory(prev => {
      const next = prev.filter(p => p !== text);
      pluginApi?.settings?.set('custom_prompt_history', next);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <label className="flex items-center gap-2 text-sm text-app-text-primary cursor-pointer font-medium">
          <input 
            type="checkbox" 
            checked={createNewDocument}
            onChange={(e) => {
              setCreateNewDocument(e.target.checked);
              pluginApi?.settings?.set('create_new_document', e.target.checked);
            }}
            className="rounded border-app-border bg-app-input-bg text-app-accent focus:ring-app-accent" 
          />
          Создавать новый документ при импорте
        </label>
      </div>

      {!isModal && (
        <div className="flex flex-col gap-1">
          <label className="flex items-center gap-2 text-sm text-app-text-primary cursor-pointer font-medium">
            <input 
              type="checkbox" 
              checked={showImportDialog}
              onChange={(e) => {
                setShowImportDialog(e.target.checked);
                pluginApi?.settings?.set('show_import_dialog', e.target.checked);
              }}
              className="rounded border-app-border bg-app-input-bg text-app-accent focus:ring-app-accent" 
            />
            Показывать этот диалог настроек перед импортом
          </label>
        </div>
      )}

      <div className="h-px w-full bg-app-border" />

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-app-text-primary">Уровень детализации импорта</label>
        <select 
          value={detailLevel}
          onChange={(e) => {
            setDetailLevel(e.target.value);
            pluginApi?.settings?.set('detail_level', e.target.value);
          }}
          className="rounded-md border border-app-border bg-app-input-bg px-3 py-2 text-sm text-app-text-primary focus:border-app-accent focus:outline-none"
        >
          <option value="brief">Кратко и тезисно (выжимка)</option>
          <option value="optimized">Оптимизированный импорт (без смысловых повторов)</option>
          <option value="full">Максимально полно (бережный импорт)</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-app-text-primary">Максимальная глубина древа</label>
        <div className="flex items-center gap-3">
          <input 
            type="number"
            min="0"
            max="20"
            value={maxDepth}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              const num = isNaN(val) ? 0 : val;
              setMaxDepth(num);
              pluginApi?.settings?.set('max_depth', num);
            }}
            className="w-20 rounded-md border border-app-border bg-app-input-bg px-3 py-2 text-sm text-app-text-primary focus:border-app-accent focus:outline-none"
          />
          <span className="text-xs text-app-text-secondary">
            {maxDepth === 0 ? "(0 — ИИ решает сам)" : ""}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-app-text-primary">Дополнительные инструкции (prompt)</label>
        <textarea 
          value={customPrompt}
          onChange={(e) => {
            setCustomPrompt(e.target.value);
            pluginApi?.settings?.set('custom_prompt', e.target.value);
          }}
          onBlur={(e) => saveToHistory(e.target.value)}
          placeholder="Например: Обязательно укажи имена участников..." 
          className="w-full rounded-md border border-app-border bg-app-input-bg px-3 py-2 text-sm text-app-text-primary focus:border-app-accent focus:outline-none min-h-[80px] resize-y"
        />
        {promptHistory.length > 0 ? (
          <div className="flex flex-col gap-1 mt-1">
            <div className="flex flex-col gap-1 max-h-32 overflow-y-auto pr-1">
              {promptHistory.map((histPrompt, idx) => {
                const firstLine = histPrompt.split('\n')[0].trim();
                const displayTitle = firstLine.length > 60 ? firstLine.substring(0, 60) + '...' : firstLine;
                return (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between gap-2 p-1.5 px-2 rounded-md border border-transparent hover:border-app-border hover:bg-app-bg group cursor-pointer transition-colors" 
                    onClick={() => {
                       setCustomPrompt(histPrompt);
                       pluginApi?.settings?.set('custom_prompt', histPrompt);
                    }}
                  >
                    <span className="text-sm text-app-text-secondary group-hover:text-app-text-primary truncate flex-1" title={histPrompt}>
                      {displayTitle}
                    </span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromHistory(histPrompt);
                      }}
                      className="p-1 rounded text-app-text-secondary hover:text-red-500 hover:bg-app-input-bg opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Удалить"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-xs text-app-text-secondary">
            Эти инструкции будут добавлены к основному запросу к нейросети. Введенный текст сохранится автоматически при снятии фокуса.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-app-text-primary">Основной системный промпт</label>
        <textarea 
          value={systemPrompt}
          onChange={(e) => {
            setSystemPrompt(e.target.value);
            pluginApi?.settings?.set('system_prompt', e.target.value);
          }}
          className="w-full rounded-md border border-app-border bg-app-input-bg px-3 py-2 text-sm text-app-text-primary font-mono focus:border-app-accent focus:outline-none min-h-[120px] resize-y"
        />
        <p className="text-xs text-app-text-secondary">
          Базовые инструкции для нейросети при импорте. Можно кастомизировать или вернуть к исходному состоянию.
        </p>
      </div>
    </div>
  );
}
