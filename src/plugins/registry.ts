import type { ReactNode, ComponentType } from "react";
import { PuuNode } from "../types";

export interface PluginHooks {
  onNodeCreated?: (node: PuuNode) => void;
  onNodeUpdated?: (node: PuuNode) => void;
  onNodeDeleted?: (nodeId: string) => void;
}

export interface CardActionHook {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick: (nodeId: string) => void;
  isVisible?: (nodeId: string) => boolean;
}

export interface CommandHook {
  id: string;
  label: string;
  icon?: ComponentType<{ size?: number; className?: string }>;
  destructive?: boolean;
  run: () => void | Promise<void>;
}

export interface PluginDefinition {
  id: string;
  name: string;
  version: string;
  description?: string;
  hooks?: PluginHooks;
  cardActions?: CardActionHook[];
  commands?: CommandHook[];
  settingsComponent?: ComponentType;
  init?: (api: PluginAPI) => void | Promise<void>;
  unload?: () => void | Promise<void>;
}

export interface PluginAPI {
  getState: () => import("../store/appStoreTypes").AppStore;
  addJob: (title: string) => string;
  updateJobProgress: (id: string, progress: number, statusText?: string) => void;
  completeJob: (id: string, resultLabel: string, onClick?: () => void) => void;
  failJob: (id: string, error: string) => void;
  toast: (msg: string, type?: "success" | "error" | "warning" | "info") => void;
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
        await plugin.init(this.api);
      } catch (err) {
        console.error(`[PluginRegistry] ${plugin.id}.init failed`, err);
      }
    }
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
  }

  getPlugins() {
    return Array.from(this.plugins.values());
  }

  getCardActions(nodeId: string): CardActionHook[] {
    const actions: CardActionHook[] = [];
    const disabledPlugins = this.api?.getState().disabledPlugins || [];
    for (const plugin of this.plugins.values()) {
      if (disabledPlugins.includes(plugin.id)) continue;
      if (plugin.cardActions) {
        for (const action of plugin.cardActions) {
          if (!action.isVisible || action.isVisible(nodeId)) {
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

  emitNodeCreated(node: PuuNode) {
    this.emitHook("onNodeCreated", node);
  }

  emitNodeUpdated(node: PuuNode) {
    this.emitHook("onNodeUpdated", node);
  }

  emitNodeDeleted(nodeId: string) {
    this.emitHook("onNodeDeleted", nodeId);
  }
}

export const PluginRegistry = new PluginRegistryClass();
