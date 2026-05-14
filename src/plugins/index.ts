import type { PluginDefinition } from './registry';
import { voiceFixerPlugin } from './voice-fixer/index';

export const CUSTOM_PLUGINS: PluginDefinition[] = [
  voiceFixerPlugin
];
