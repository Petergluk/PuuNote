import type { ReactNode, ComponentType } from "react";
import { useState, useEffect, useMemo } from "react";
import { PuuNode } from "../types";
import { useAppStore } from "../store/useAppStore";

export interface PluginHooks {
  onBeforeContentChange?: (nodeId: string, newContent: string) => string | undefined;
  onNodeCreated?: (node: PuuNode) => void;
  onNodeUpdated?: (node: PuuNode) => void;
  onNodeDeleted?: (nodeId: string) => void;
}

export interface CardActionHook {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick: (nodeId: string, node: PuuNode) => void;
  isVisible?: (nodeId: string, node: PuuNode) => boolean;
}

export interface CommandHook {
  id: string;
  label: string;
  icon?: ComponentType<{ size?: number; className?: string }>;
  destructive?: boolean;
  hotkey?: string;
  run?: () => void | Promise<void>;
  execute?: () => void | Promise<void>; // Alias for run, used by some agents
}

export interface GlobalActionHook {
  id: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  onClick?: () => void;
  dropdownItems?: {
    id: string;
    label: string | ReactNode;
    icon?: ComponentType<{ size?: number; className?: string }>;
    onClick: () => void;
  }[];
}

export interface PluginDefinition {
  id: string;
  name: string;
  version: string;
  description?: string;
  hooks?: PluginHooks;
  cardActions?: CardActionHook[];
  commands?: CommandHook[];
  headerActions?: GlobalActionHook[];
  footerActions?: GlobalActionHook[];
  settingsComponent?: ComponentType;
  sidebarComponent?: ComponentType;
  init?: (api: PluginAPI) => void | Promise<void>;
  unload?: () => void | Promise<void>;
}

export interface PluginAPI {
  getState: () => import("../store/appStoreTypes").AppStore;
  addJob: (title: string, onCancel?: () => void) => string;
  updateJobProgress: (id: string, progress: number, statusText?: string) => void;
  completeJob: (id: string, resultLabel: string, onClick?: () => void) => void;
  failJob: (id: string, error: string) => void;
  cancelJob: (id: string) => void;
  toast: (msg: string, type?: "success" | "error" | "warning" | "info") => void;
  events?: {
    on: (eventName: "nodeSelected" | "nodeChanged" | "treeChanged" | "beforeUnload" | "nodeDeleted" | "selectionChanged" | "jobCancelled", callback: (data: any) => void) => void;
    off: (eventName: string, callback: Function) => void;
  };
  document?: {
    addNode: (content: string, parentId?: string | null) => string;
    deleteNode: (id: string) => void;
    getNode?: (id: string) => PuuNode | null;
    updateNodeContent?: (id: string, content: string) => void;
    // Advanced: Metadata & Batch Ops
    getActiveNodeId?: () => string | null;
    setNodeMetadata?: <K extends keyof import("../types").PuuNodeMetadata>(id: string, key: K | string, value: import("../types").PuuNodeMetadata[K] | any) => void;
    getNodeMetadata?: <K extends keyof import("../types").PuuNodeMetadata>(id: string, key: K | string) => import("../types").PuuNodeMetadata[K] | any;
    resolveContext?: (id: string, scope: "card" | "document" | "level_branch" | "level_all" | "branch_parent" | "branch_children" | string) => string;
    batchUpdate?: (updates: {id: string, content?: string, metadata?: Record<string,any>}[]) => void;
    // Attachments
    addAttachment?: (id: string, file: File | {name: string, type: string, url: string}) => void;
    getAttachments?: (id: string) => {id: string; name: string; type: string; url: string}[];
    removeAttachment?: (nodeId: string, attachmentId: string) => void;
  };
  editor?: {
    getActiveSelection: () => { nodeId: string; start: number; end: number; text: string } | null;
    insertTextAtCursor: (text: string) => void;
    replaceSelection: (text: string) => void;
  };
  settings?: {
    get: (key: string, defaultValue?: any) => any;
    set: (key: string, value: any) => void;
    getGlobal: (key: string) => any;
  };
  llm?: {
    generateText: (prompt: string, options?: any) => Promise<{text: string, usedModel: string}>;
    generateTextStream?: (prompt: string, options?: any, onChunk?: (chunk: string) => void) => Promise<{text: string, usedModel: string}>;
  };
  ui?: {
    components?: {
      Button: React.ComponentType<React.ButtonHTMLAttributes<HTMLButtonElement>>;
      Input: React.ComponentType<React.InputHTMLAttributes<HTMLInputElement>>;
    };
    renderOverlay: (id: string, Component: React.ComponentType<any>, position?: any, pluginId?: string) => void;
    closeOverlay: (id: string) => void;
    renderInlineWidget?: (id: string, Component: React.ComponentType<any>, pluginId?: string) => void;
    registerCardWidget?: (widgetId: string, Component: React.ComponentType<{node: PuuNode}>, position?: "top" | "bottom" | "replace", pluginId?: string) => void;
    openSidebar: (pluginId?: string) => void;
    closeSidebar: () => void;
  };
}

class PluginRegistryClass {
  private plugins: Map<string, PluginDefinition> = new Map();
  private api!: PluginAPI;

  initialize(api: PluginAPI) {
    this.api = api;
  }

  private emitHook<T extends keyof PluginHooks>(
    hookName: T,
    ...args: Parameters<NonNullable<PluginHooks[T]>>
  ) {
    const disabledPlugins = this.api?.getState().disabledPlugins || [];
    for (const plugin of this.plugins.values()) {
      if (disabledPlugins.includes(plugin.id)) continue;
      const hook = plugin.hooks?.[hookName];
      if (!hook) continue;
      try {
        (hook as (...hookArgs: typeof args) => void)(...args);
      } catch (err) {
        console.error(`[PluginRegistry] ${plugin.id}.${hookName} failed`, err);
      }
    }
  }

  async register(plugin: PluginDefinition) {
    if (this.plugins.has(plugin.id)) {
      console.warn(`Plugin ${plugin.id} is already registered. Overwriting.`);
      await this.unregister(plugin.id);
    }
    this.plugins.set(plugin.id, plugin);
    if (plugin.init && this.api) {
      try {
        const apiProxy = { ...this.api };
        if (apiProxy.ui) {
          apiProxy.ui = {
            ...apiProxy.ui,
            renderOverlay: (id, Component, position) => this.api.ui?.renderOverlay(id, Component, position, plugin.id),
            renderInlineWidget: (id, Component) => this.api.ui?.renderInlineWidget?.(id, Component, plugin.id),
            registerCardWidget: (widgetId, Component, position) => this.api.ui?.registerCardWidget?.(widgetId, Component, position, plugin.id),
            openSidebar: () => this.api.ui?.openSidebar(plugin.id),
            closeSidebar: () => this.api.ui?.closeSidebar()
          };
        }
        await plugin.init(apiProxy);
      } catch (err) {
        console.error(`[PluginRegistry] ${plugin.id}.init failed`, err);
      }
    }
    window.dispatchEvent(new CustomEvent('plugin-actions-updated'));
  }

  async unregister(pluginId: string) {
    const plugin = this.plugins.get(pluginId);
    if (plugin?.unload) {
      try {
        await plugin.unload();
      } catch (err) {
        console.error(`[PluginRegistry] ${pluginId}.unload failed`, err);
      }
    }
    this.plugins.delete(pluginId);
    window.dispatchEvent(new CustomEvent('plugin-actions-updated'));
  }

  getPlugins() {
    return Array.from(this.plugins.values());
  }

  getCardActions(nodeId: string): CardActionHook[] {
    const actions: CardActionHook[] = [];
    const disabledPlugins = this.api?.getState().disabledPlugins || [];
    const node = this.api?.document?.getNode?.(nodeId);
    
    for (const plugin of this.plugins.values()) {
      if (disabledPlugins.includes(plugin.id)) continue;
      if (plugin.cardActions) {
        for (const action of plugin.cardActions) {
           // Provide fallback to null if node not found
          if (!action.isVisible || action.isVisible(nodeId, node as PuuNode)) {
            actions.push(action);
          }
        }
      }
    }
    return actions;
  }

  getCommands(): CommandHook[] {
    const commands: CommandHook[] = [];
    const disabledPlugins = this.api?.getState().disabledPlugins || [];
    for (const plugin of this.plugins.values()) {
      if (disabledPlugins.includes(plugin.id)) continue;
      if (plugin.commands) {
        commands.push(...plugin.commands);
      }
    }
    return commands;
  }

  getHeaderActions(): GlobalActionHook[] {
    const actions: GlobalActionHook[] = [];
    const disabledPlugins = this.api?.getState().disabledPlugins || [];
    for (const plugin of this.plugins.values()) {
      if (disabledPlugins.includes(plugin.id)) continue;
      if (plugin.headerActions) {
        actions.push(...plugin.headerActions);
      }
    }
    return actions;
  }

  getFooterActions(): GlobalActionHook[] {
    const actions: GlobalActionHook[] = [];
    const disabledPlugins = this.api?.getState().disabledPlugins || [];
    for (const plugin of this.plugins.values()) {
      if (disabledPlugins.includes(plugin.id)) continue;
      if (plugin.footerActions) {
        actions.push(...plugin.footerActions);
      }
    }
    return actions;
  }

  emitNodeCreated(node: PuuNode) {
    this.emitHook("onNodeCreated", node);
  }

  emitNodeUpdated(node: PuuNode) {
    this.emitHook("onNodeUpdated", node);
  }

  emitNodeDeleted(nodeId: string) {
    this.emitHook("onNodeDeleted", nodeId);
    window.dispatchEvent(new CustomEvent('sandbox:nodeDeleted', { detail: { nodeId } }));
  }

  invokeBeforeContentChange(nodeId: string, content: string): string {
    let finalContent = content;
    const disabledPlugins = this.api?.getState().disabledPlugins || [];
    for (const plugin of this.plugins.values()) {
      if (disabledPlugins.includes(plugin.id)) continue;
      const hook = plugin.hooks?.["onBeforeContentChange"];
      if (hook) {
        try {
          const modified = hook(nodeId, finalContent);
          if (typeof modified === "string") {
            finalContent = modified;
          }
        } catch (err) {
          console.error(`[PluginRegistry] ${plugin.id}.onBeforeContentChange failed`, err);
        }
      }
    }
    return finalContent;
  }
}

export const PluginRegistry = new PluginRegistryClass();

export function usePluginCardActions(nodeId: string) {
  const storeDisabledPlugins = useAppStore(state => state.disabledPlugins);
  const [stamp, setStamp] = useState(0);

  useEffect(() => {
    const update = () => setStamp(s => s + 1);
    window.addEventListener('plugin-actions-updated', update);
    return () => window.removeEventListener('plugin-actions-updated', update);
  }, []);

  return useMemo(() => {
    void stamp;
    const disabledPlugins = storeDisabledPlugins || [];
    void disabledPlugins;
    return PluginRegistry.getCardActions(nodeId);
  }, [nodeId, storeDisabledPlugins, stamp]);
}

export function usePluginHeaderActions() {
  const storeDisabledPlugins = useAppStore(state => state.disabledPlugins);
  const [stamp, setStamp] = useState(0);

  useEffect(() => {
    const update = () => setStamp(s => s + 1);
    window.addEventListener('plugin-actions-updated', update);
    return () => window.removeEventListener('plugin-actions-updated', update);
  }, []);

  return useMemo(() => {
    void stamp;
    const disabledPlugins = storeDisabledPlugins || [];
    void disabledPlugins;
    return PluginRegistry.getHeaderActions();
  }, [storeDisabledPlugins, stamp]);
}

export function usePluginFooterActions() {
  const storeDisabledPlugins = useAppStore(state => state.disabledPlugins);
  const [stamp, setStamp] = useState(0);

  useEffect(() => {
    const update = () => setStamp(s => s + 1);
    window.addEventListener('plugin-actions-updated', update);
    return () => window.removeEventListener('plugin-actions-updated', update);
  }, []);

  return useMemo(() => {
    void stamp;
    const disabledPlugins = storeDisabledPlugins || [];
    void disabledPlugins;
    return PluginRegistry.getFooterActions();
  }, [storeDisabledPlugins, stamp]);
}
