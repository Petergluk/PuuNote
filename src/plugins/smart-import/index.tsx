import { DEFAULT_SYSTEM_PROMPT, buildSmartImportPrompt } from './prompts';
import React from "react";
import type { PluginDefinition } from "../registry";
import { FileUp, MessageSquareDiff } from "lucide-react";
import { manifest } from "./manifest";
import { MyPluginSettings } from "./settings";
import { commands } from "./commands";
import { setPluginApi, pluginApi } from "./api";
import { generateContentFallback } from "../../utils/aiModels";
import { usePluginUiStore } from "../uiRegistry";

import { ImportModal } from "./ImportModal";

async function executeImport(files: File[]) {
  const globalAbortController = new AbortController();
  const jobId = pluginApi?.addJob?.(`Умный импорт (${files.length} файлов)...`, () => {
      globalAbortController.abort();
  }) || "";

  try {
    const maxDepth = pluginApi?.settings?.get('max_depth', 0);
    const detailLevel = pluginApi?.settings?.get('detail_level', 'brief');
    const customPrompt = pluginApi?.settings?.get('custom_prompt', '');
    
    const systemPrompt = pluginApi?.settings?.get('system_prompt', DEFAULT_SYSTEM_PROMPT);
    const createNewDoc = pluginApi?.settings?.get('create_new_document', true);

    const nodesToCreate: any[] = [];
    let idCounter = 1;

    const docTitle = files.length === 1 ? "Импорт: " + files[0].name : `Пакетный импорт (${files.length})`;
    
    if (createNewDoc) {
       nodesToCreate.push({ id: 'imported-root', content: docTitle, parentId: null });
    }

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const text = await file.text();
        pluginApi?.updateJobProgress?.(jobId, Math.round((i / files.length) * 100), `Обработка (${i+1}/${files.length}): ${file.name}`);

        const prompt = buildSmartImportPrompt({
          systemPrompt,
          detailLevel,
          maxDepth,
          customPrompt,
          text
        });

        const { text: jsonText } = await generateContentFallback(prompt, undefined, {
          signal: globalAbortController.signal,
          timeoutMs: 300000,
          onStatusChange: (msg) => {
             pluginApi?.updateJobProgress?.(jobId, Math.round((i / files.length) * 100), `Обработка ${file.name}: ${msg}`);
          }
        });

        let parsed = [];
        try {
          parsed = JSON.parse(jsonText || "[]");
        } catch {
           const cleaned = (jsonText || "[]").replace(/^```json\n?/, '').replace(/```$/, '').trim();
           parsed = JSON.parse(cleaned);
        }

        const rootParentId = createNewDoc ? 'imported-root' : null;
        let fileRootId = rootParentId;
        
        if (files.length > 1) {
            if (createNewDoc) {
                fileRootId = `file-root-${i}`;
                nodesToCreate.push({ id: fileRootId, content: file.name, parentId: rootParentId });
            } else {
                fileRootId = pluginApi?.document?.addNode(`Импорт: ${file.name}`, null) || null;
            }
        } else if (!createNewDoc) {
            fileRootId = pluginApi?.document?.addNode(`Импорт: ${file.name}`, null) || null;
        }

        function buildNodesList(items: unknown[], parentId: string | null) {
          for (const item of items) {
            const typedItem = item as Record<string, unknown>;
            const content = String(typedItem.title || typedItem.content || "Без темы");
            const nodeId = `imported-${idCounter++}-${i}`;
            nodesToCreate.push({ id: nodeId, content, parentId });
            
            if (typedItem.children && Array.isArray(typedItem.children)) {
              buildNodesList(typedItem.children, nodeId);
            }
          }
        }

        function buildTreeDirect(items: unknown[], parentId: string | null) {
          for (const item of items) {
            const typedItem = item as Record<string, unknown>;
            const content = String(typedItem.title || typedItem.content || "Без темы");
            const nodeId = pluginApi?.document?.addNode(content, parentId);
            if (nodeId && typedItem.children && Array.isArray(typedItem.children)) {
              buildTreeDirect(typedItem.children, nodeId);
            }
          }
        }

        if (createNewDoc) {
            if (Array.isArray(parsed)) {
               buildNodesList(parsed, fileRootId);
            }
        } else {
            if (Array.isArray(parsed)) {
               buildTreeDirect(parsed, fileRootId);
            }
        }
    }

    if (createNewDoc) {
       if (pluginApi?.document?.createDocument) {
           await pluginApi.document.createDocument(docTitle, nodesToCreate);
       }
    }

    pluginApi?.completeJob?.(jobId, `Успешно импортировано ${files.length} файлов`);
    pluginApi?.toast?.("Импорт завершен", "success");
  } catch (err: unknown) {
    console.error(err);
    let message = err instanceof Error ? err.message : String(err);
    try {
       const parsed = JSON.parse(message);
       if (parsed.error && parsed.error.message) {
           message = parsed.error.message;
       }
    } catch {
       // ignore
    }
    
    if (message.toLowerCase().includes('key not valid') || message.toLowerCase().includes('api key not valid')) {
        message = "Недействительный API ключ (API key not valid). Пожалуйста, проверьте настройки ключей в плагинах.";
    }
    
    pluginApi?.failJob?.(jobId, message);
    pluginApi?.toast?.("Ошибка импорта: " + message, "error");
  }
}

export async function handleAIdialogImport() {
  if (!pluginApi?.document) return;

  // Create file input
  const input = document.createElement("input");
  input.type = "file";
  input.multiple = true;
  input.accept = ".txt,.log,.md";
  input.onchange = async (e) => {
    const files = Array.from((e.target as HTMLInputElement).files || []);
    if (files.length === 0) return;

    const showDialog = pluginApi?.settings?.get('show_import_dialog', true);
    if (showDialog) {
      usePluginUiStore.getState().addOverlay({
        id: "smart-import-modal",
        component: () => <ImportModal files={files} onClose={() => usePluginUiStore.getState().removeOverlay("smart-import-modal")} onImport={executeImport} />
      });
    } else {
      executeImport(files);
    }
  };
  input.click();
}

const myPlugin: PluginDefinition = {
  ...manifest,
  
  // 1. Жизненный цикл плагина
  init: (api) => {
    setPluginApi(api);
    console.log("🛠️ Plugin Init: Плагин Smart_Import успешно загружен!");
  },
  unload: () => {
    console.log("🧹 Plugin Unload: Плагин Smart_Import выключен.");
  },

  // 2. Кнопки в Header (Шапке)
  headerActions: [
    {
      id: "import-data",
      label: "Import Data",
      icon: FileUp,
      dropdownItems: [
        {
          id: "import-ai-dialog",
          label: "Smart AI Import",
          icon: MessageSquareDiff,
          onClick: handleAIdialogImport
        }
      ]
    }
  ],

  commands,
  
  // 6. UI настроек в панели плагинов
  settingsComponent: MyPluginSettings
};

export default myPlugin;

