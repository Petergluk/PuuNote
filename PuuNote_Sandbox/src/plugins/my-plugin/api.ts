import type { PluginAPI } from "../registry";

export let pluginApi: PluginAPI | null = null;

export function setPluginApi(api: PluginAPI) {
  pluginApi = api;
}
