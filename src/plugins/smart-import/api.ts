import { PluginAPI } from "../registry";

export let pluginApi: PluginAPI | null = null;

export const setPluginApi = (api: PluginAPI) => {
  pluginApi = api;
};
