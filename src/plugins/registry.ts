import { PuuNode } from "../types";

export interface PluginHooks {
  onNodeCreated?: (node: PuuNode) => void;
  onNodeUpdated?: (node: PuuNode) => void;
  onNodeDeleted?: (nodeId: string) => void;
}

export interface CardActionHook {
  id: string;
  label: string;
  icon?: React.ReactNode;
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

  register(plugin: PluginDefinition) {
    if (this.plugins.has(plugin.id)) {
      console.warn(`Plugin ${plugin.id} is already registered. Overwriting.`);
    }
    this.plugins.set(plugin.id, plugin);
    console.log(`[PluginRegistry] Registered: ${plugin.name} v${plugin.version}`);
  }

  unregister(pluginId: string) {
    this.plugins.delete(pluginId);
    console.log(`[PluginRegistry] Unregistered: ${pluginId}`);
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
}

export const PluginRegistry = new PluginRegistryClass();
