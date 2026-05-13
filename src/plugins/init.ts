import { useAppStore } from "../store/useAppStore";
import { useJobStore } from "../store/useJobStore";
import { PluginRegistry, type PluginAPI } from "./registry";
import { toast } from "sonner";
import { CUSTOM_PLUGINS } from "./custom";

// Create the unified API object for plugins
export const pluginApi: PluginAPI = {
  getState: () => useAppStore.getState(),

  addJob: (title) => {
    return useJobStore.getState().addJob(title);
  },

  updateJobProgress: (id, progress, statusText) => {
    useJobStore.getState().updateJob(id, { progress, message: statusText });
  },

  completeJob: (id, resultLabel, onClick) => {
    useJobStore.getState().updateJob(id, {
      progress: 100,
      status: "completed",
    });
    if (onClick) {
       toast.success(resultLabel, {
         action: { label: "View", onClick }
       });
    }
  },

  failJob: (id, error) => {
    useJobStore.getState().updateJob(id, {
      status: "failed",
      error
    });
  },

  toast: (msg, type = "info") => {
    if (type === "success") toast.success(msg);
    else if (type === "error") toast.error(msg);
    else if (type === "warning") toast.warning(msg);
    else toast(msg);
  }
};

export async function initializePlugins() {
  PluginRegistry.initialize(pluginApi);
  for (const plugin of CUSTOM_PLUGINS) {
    await PluginRegistry.register(plugin);
  }
}


