import type { ReactNode } from "react";
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

export interface PluginDefinition {
  id: string;
  name: string;
  version: string;
  hooks?: PluginHooks;
  cardActions?: CardActionHook[];
}

class PluginRegistryClass {
  private plugins: Map<string, PluginDefinition> = new Map();
  private emitHook<T extends keyof PluginHooks>(
    hookName: T,
    ...args: Parameters<NonNullable<PluginHooks[T]>>
  ) {
    for (const plugin of this.plugins.values()) {
      const hook = plugin.hooks?.[hookName];
      if (!hook) continue;
      try {
        (hook as (...hookArgs: typeof args) => void)(...args);
      } catch (err) {
        console.error(`[PluginRegistry] ${plugin.id}.${hookName} failed`, err);
      }
    }
  }

  register(plugin: PluginDefinition) {
    if (this.plugins.has(plugin.id)) {
      console.warn(`Plugin ${plugin.id} is already registered. Overwriting.`);
    }
    this.plugins.set(plugin.id, plugin);
  }

  unregister(pluginId: string) {
    this.plugins.delete(pluginId);
  }

  getPlugins() {
    return Array.from(this.plugins.values());
  }

  getCardActions(nodeId: string): CardActionHook[] {
    const actions: CardActionHook[] = [];
    for (const plugin of this.plugins.values()) {
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
