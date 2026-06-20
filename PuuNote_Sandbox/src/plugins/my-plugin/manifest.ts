import type { PluginDefinition } from "../registry";

export const manifest: Omit<PluginDefinition, "init" | "unload" | "settingsComponent" | "commands" | "headerActions" | "cardActions" | "footerActions" | "hooks"> & Partial<PluginDefinition> = {
  id: "my-test-plugin",
  name: "My Full Test Plugin",
  version: "1.0.0",
  description: "A comprehensive sample plugin to test all UI hooks in the sandbox. Demonstrates multi-file structure.",
};
