import type { PluginDefinition } from "../registry";

export const manifest: Omit<PluginDefinition, "init" | "unload" | "settingsComponent" | "commands" | "headerActions" | "cardActions" | "footerActions" | "hooks"> & Partial<PluginDefinition> = {
  id: "smart-import",
  name: "Smart_Import",
  version: "1.0.0",
  description: "A plugin that intelligently imports and structures AI dialogue logs using an LLM.",
};
