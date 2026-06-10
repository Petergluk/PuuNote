import { useAppStore } from "../store/useAppStore";
import { useJobStore } from "../store/useJobStore";
import React from "react";
import { PluginRegistry, type PluginAPI } from "./registry";
import { toast } from "sonner";
import { CUSTOM_PLUGINS } from "./index";
import { generateContentFallback } from "../utils/aiModels";
import { usePluginUiStore } from "./uiRegistry";
import { resolveNodeContext, ContextScope } from "../utils/pluginContextResolver";
import { editorFocusTracker } from "./focusTracker";

// Create the unified API object for plugins
export const pluginApi: PluginAPI = {
  events: {
    on: (eventName, callback) => {
      // @ts-ignore
      callback._wrappedListener = (e: any) => callback(e.detail || e);
      // @ts-ignore
      window.addEventListener(`sandbox:${eventName}`, callback._wrappedListener);
      
      if (eventName === 'beforeUnload') {
         // @ts-ignore
         window.addEventListener('beforeunload', callback._wrappedListener);
      }
    },
    off: (eventName, callback) => {
      // @ts-ignore
      const listener = callback._wrappedListener || callback;
      window.removeEventListener(`sandbox:${eventName}`, listener);
      if (eventName === 'beforeUnload') {
         window.removeEventListener('beforeunload', listener);
      }
    }
  },
  getState: () => useAppStore.getState(),

  addJob: (title) => {
    return useJobStore.getState().addJob(title);
  },

  updateJobProgress: (id, progress, statusText) => {
    useJobStore.getState().updateJob(id, { progress, message: statusText });
  },

  completeJob: (id, resultLabel, onClick) => {
    useJobStore.getState().updateJob(id, {
      progress: 100,
      status: "completed",
    });
    if (onClick) {
       toast.success(resultLabel, {
         action: { label: "View", onClick }
       });
    }
  },

  failJob: (id, error) => {
    useJobStore.getState().updateJob(id, {
      status: "failed",
      error
    });
  },

  cancelJob: (id) => {
    import("../domain/jobRunner").then(({ JobRunner }) => {
       JobRunner.cancelJob(id);
    });
    useJobStore.getState().updateJob(id, { status: "cancelled" });
    window.dispatchEvent(new CustomEvent('sandbox:jobCancelled', { detail: { id } }));
  },

  toast: (msg, type = "info") => {
    if (type === "success") toast.success(msg);
    else if (type === "error") toast.error(msg);
    else if (type === "warning") toast.warning(msg);
    else toast(msg);
  },

  document: {
    addNode: (content, parentId) => {
      const store = useAppStore.getState();
      store.addChild(parentId || null);
      const newId = useAppStore.getState().activeId;
      
      if (newId && content) {
         useAppStore.getState().updateContent(newId, content);
      }
      return newId || "new-node"; 
    },
    deleteNode: (id) => {
       useAppStore.getState().deleteNode(id);
    },
    getNode: (id) => {
       const findNode = (nodes: any[]): any => {
         for (const n of nodes) {
           if (n.id === id) return n;
           if (n.children) {
             const found = findNode(n.children);
             if (found) return found;
           }
         }
         return null;
       };
       return findNode(useAppStore.getState().nodes);
    },
    updateNodeContent: (id, content) => {
       useAppStore.getState().updateContent(id, content);
    },
    getActiveNodeId: () => {
      return useAppStore.getState().activeId;
    },
    setNodeMetadata: (id, key, value) => {
       useAppStore.getState().updateNodeMetadata(id, { [key]: value });
    },
    getNodeMetadata: (id, key) => {
       const node = pluginApi.document?.getNode?.(id);
       return node?.metadata?.[key] ?? null;
    },
    resolveContext: (id, scope) => {
       const nodes = useAppStore.getState().nodes;
       // @ts-ignore (Assuming ContextScope casting for strictness here)
       return resolveNodeContext(nodes, id, scope as ContextScope);
    },
    batchUpdate: (updates) => {
       updates.forEach(u => {
          if (u.content !== undefined) pluginApi.document?.updateNodeContent?.(u.id, u.content);
          if (u.metadata !== undefined) {
             Object.entries(u.metadata).forEach(([k, v]) => pluginApi.document?.setNodeMetadata?.(u.id, k, v));
          }
       });
    },
    addAttachment: (id, file) => {
       const node = pluginApi.document?.getNode?.(id);
       if (!node) return;
       const attachments = Array.isArray(node.metadata?.attachments) ? [...node.metadata.attachments] : [];
       let fileData: Record<string, any> = file as any;
       if (file instanceof File) {
          // For now, since storing large files via object URL or base64 needs proper architecture,
          // we fallback to objectURL for session-only viewing, or plugin-handled string.
          fileData = { name: file.name, type: file.type, url: URL.createObjectURL(file), id: Date.now().toString() };
       } else if (file && typeof file === 'object' && !('id' in file)) {
          fileData = { ...file, id: Date.now().toString() };
       }
       attachments.push(fileData);
       useAppStore.getState().updateNodeMetadata(id, { attachments });
    },
    getAttachments: (id) => {
       const node = pluginApi.document?.getNode?.(id);
       return Array.isArray(node?.metadata?.attachments) ? node.metadata.attachments : [];
    },
    removeAttachment: (nodeId, attachmentId) => {
       const node = pluginApi.document?.getNode?.(nodeId);
       if (!node || !Array.isArray(node.metadata?.attachments)) return;
       const attachments = node.metadata.attachments.filter((a: any) => a.id !== attachmentId);
       useAppStore.getState().updateNodeMetadata(nodeId, { attachments });
    }
  },

  editor: {
    getActiveSelection: () => {
      let activeEl = document.activeElement as HTMLElement | null;
      let isEditor = false;
      
      if (activeEl instanceof HTMLTextAreaElement && activeEl.hasAttribute('data-node-id')) isEditor = true;
      if (activeEl?.closest('.ProseMirror')) isEditor = true;
      
      if (!isEditor) {
        activeEl = editorFocusTracker.lastFocusedElement as HTMLElement | null;
      }
      
      if (!activeEl) return null;

      if (activeEl instanceof HTMLTextAreaElement) {
        const nodeId = activeEl.getAttribute('data-node-id');
        if (!nodeId) return null;
        return {
          nodeId,
          start: activeEl.selectionStart,
          end: activeEl.selectionEnd,
          text: activeEl.value.substring(activeEl.selectionStart, activeEl.selectionEnd)
        };
      }

      const tiptapContainer = activeEl.closest('.ProseMirror');
      if (tiptapContainer) {
        const nodeId = tiptapContainer.getAttribute('data-node-id');
        if (!nodeId) return null;
        // This is a naive polyfill. Better implemented in Main Editor's scope.
        const sel = window.getSelection();
        if (!sel) return null;
        return {
          nodeId,
          start: 0,
          end: sel.toString().length,
          text: sel.toString()
        };
      }
      return null;
    },
    insertTextAtCursor: (text: string) => {
      let activeEl = document.activeElement as HTMLElement | null;
      let isEditor = false;
      
      if (activeEl instanceof HTMLTextAreaElement && activeEl.hasAttribute('data-node-id')) isEditor = true;
      if (activeEl?.closest('.ProseMirror')) isEditor = true;
      
      if (!isEditor) {
        activeEl = editorFocusTracker.lastFocusedElement as HTMLElement | null;
      }
      if (!activeEl) return;

      if (activeEl instanceof HTMLTextAreaElement) {
        const start = activeEl.selectionStart;
        const end = activeEl.selectionEnd;
        activeEl.setRangeText(text, start, end, "end");
        // Dispatching React-compatible event
        const ev = new Event('input', { bubbles: true });
        // @ts-ignore (React internal hack for native setter)
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
        if (nativeInputValueSetter) nativeInputValueSetter.call(activeEl, activeEl.value);
        activeEl.dispatchEvent(ev);
        // Dispatch nodeChanged for plugins
        const nodeId = activeEl.getAttribute('data-node-id');
        if (nodeId) window.dispatchEvent(new CustomEvent('sandbox:nodeChanged', { detail: { id: nodeId, content: activeEl.value } }));
      } else if (activeEl.closest('.ProseMirror')) {
        document.execCommand('insertText', false, text);
      }
    },
    replaceSelection: (text: string) => {
      pluginApi.editor?.insertTextAtCursor(text);
    }
  },

  settings: {
    get: (key: string, defaultValue?: any) => {
      const val = localStorage.getItem(`plugin_setting_${key}`);
      if (!val) return defaultValue;
      try {
        return JSON.parse(val);
      } catch {
        return val;
      }
    },
    set: (key: string, value: any) => {
      localStorage.setItem(`plugin_setting_${key}`, typeof value === 'string' ? value : JSON.stringify(value));
    },
    getGlobal: (key: string) => {
      if (key === 'geminiApiKey') {
        const localUserKey = localStorage.getItem('GLOBAL_GEMINI_API_KEY');
        if (localUserKey && localUserKey.trim() !== '') return localUserKey;
        // @ts-ignore
        return import.meta.env.VITE_GLOBAL_GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY || '';
      }
      return null;
    }
  },

  llm: {
    generateText: async (prompt, options) => {
      // @ts-ignore
      return generateContentFallback(prompt, options?.model, options);
    },
    generateTextStream: async (prompt, options, onChunk) => {
      // Use fallback to get full text
      // @ts-ignore
      const result = await generateContentFallback(prompt, options?.model, options);
      
      if (onChunk) {
        // Simulate streaming word by word
        const words = result.text.split(/(\s+)/); // split but keep whitespace
        let currentText = "";
        
        for (const word of words) {
          if (options?.signal?.aborted) {
            throw new Error('AbortError');
          }
          currentText += word;
          onChunk(currentText);
          await new Promise(r => setTimeout(r, 30 + Math.random() * 20)); // 30-50ms delay
        }
      }
      return result;
    }
  },

  ui: {
    components: {
      Button: (props: any) => {
         const { className, ...rest } = props;
         return React.createElement('button', {
           className: `px-4 py-2 bg-app-accent text-white rounded hover:opacity-90 ${className || ''}`,
           ...rest
         });
      },
      Input: (props: any) => {
         const { className, ...rest } = props;
         return React.createElement('input', {
           className: `w-full bg-app-input-bg border-app-border rounded px-3 py-2 text-app-text focus:outline-none focus:ring-1 focus:ring-app-accent ${className || ''}`,
           ...rest
         });
      }
    },
    renderOverlay: (id, Component, position, pluginId) => {
      usePluginUiStore.getState().addOverlay({
        id,
        pluginId,
        component: Component,
        position
      });
    },
    closeOverlay: (id) => {
      usePluginUiStore.getState().removeOverlay(id);
    },
    renderInlineWidget: (id, Component, pluginId) => {
      // In a real editor this would compute exact text coordinates (e.g. using get-textarea-caret-position).
      // Here we just attach it near the active element's bounding rect
      setTimeout(() => {
        const activeEl = document.activeElement as HTMLElement;
        let rect = { top: window.innerHeight / 2, left: window.innerWidth / 2, height: 0 };
        if (activeEl instanceof HTMLTextAreaElement || activeEl?.closest('.ProseMirror')) {
           rect = activeEl.getBoundingClientRect();
        }
        usePluginUiStore.getState().addOverlay({
          id,
          pluginId,
          component: Component,
          position: {
            top: `${rect.top + rect.height + window.scrollY}px`,
            left: `${rect.left + window.scrollX}px`,
            position: 'absolute'
          }
        });
      }, 0);
    },
    registerCardWidget: (widgetId, Component, position, pluginId) => {
       usePluginUiStore.getState().registerCardWidget({
          id: widgetId,
          pluginId,
          component: Component,
          position: position || "bottom"
       });
    },
    openSidebar: (pluginId) => {
       const store = useAppStore.getState();
       if (pluginId) store.setActiveSidebarPluginId(pluginId);
       store.setSidebarOpen(true);
    },
    closeSidebar: () => {
       useAppStore.getState().setSidebarOpen(false);
    }
  }
};

export async function initializePlugins() {
  // Setup global focus tracker for editor nodes
  document.addEventListener("focusin", (e) => {
    const target = e.target as HTMLElement;
    if (target instanceof HTMLTextAreaElement && target.hasAttribute('data-node-id')) {
      const nodeId = target.getAttribute('data-node-id');
      if (nodeId) {
        import("./focusTracker").then(({ editorFocusTracker }) => {
          editorFocusTracker.update(target, nodeId, target.selectionStart, target.selectionEnd, target.value);
        });
      }
    } else if (target.closest('.ProseMirror')) {
       // Support for rich text editors if they have ProseMirror class
       const pm = target.closest('.ProseMirror') as HTMLElement;
       const nodeId = pm.getAttribute('data-node-id');
       if (nodeId) {
         import("./focusTracker").then(({ editorFocusTracker }) => {
            editorFocusTracker.update(pm, nodeId, 0, 0, pm.textContent || "");
         });
       }
    }
  });

  document.addEventListener("selectionchange", () => {
    const activeEl = document.activeElement as HTMLElement | null;
    if (activeEl instanceof HTMLTextAreaElement && activeEl.hasAttribute('data-node-id')) {
      const nodeId = activeEl.getAttribute('data-node-id');
      if (nodeId) {
        import("./focusTracker").then(({ editorFocusTracker }) => {
          editorFocusTracker.update(activeEl, nodeId, activeEl.selectionStart, activeEl.selectionEnd, activeEl.value);
        });
        window.dispatchEvent(new CustomEvent('sandbox:selectionChanged', {
           detail: {
             nodeId,
             start: activeEl.selectionStart,
             end: activeEl.selectionEnd,
             text: activeEl.value.substring(activeEl.selectionStart, activeEl.selectionEnd)
           }
        }));
      }
    }
  });

  PluginRegistry.initialize(pluginApi);
  for (const plugin of CUSTOM_PLUGINS) {
    await PluginRegistry.register(plugin);
  }
}

// force update 2
