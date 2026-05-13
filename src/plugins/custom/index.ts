// Import your custom plugins here
import type { PluginDefinition } from "../registry";
import { voiceFixerPlugin } from "./voice-fixer-plugin.tsx";

export const CUSTOM_PLUGINS: PluginDefinition[] = [
  // Add your plugins here
  voiceFixerPlugin,
];
