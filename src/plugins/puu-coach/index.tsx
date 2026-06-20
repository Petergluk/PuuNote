import type { PluginDefinition } from "../registry";
import { MessageSquare } from "lucide-react";
import { setPluginApi, pluginApi } from "./api";
import { CoachSettings } from "./settings";
import { ChatSidebar } from "./sidebar";

const puuCoachPlugin: PluginDefinition = {
  id: "puu-coach",
  name: "Strategic Coach",
  version: "1.0.0",
  description: "AI Coach session with dynamic tree structuring.",
  settingsComponent: CoachSettings as any,
  
  init: (api) => {
    setPluginApi(api);
    console.log("PuuCoach loaded");
  },
  
  sidebarComponent: ChatSidebar as any,

  headerActions: [
    {
      id: "toggle-coach",
      label: "Start Coach Session",
      icon: MessageSquare,
      onClick: () => {
        if (pluginApi?.ui?.openSidebar) {
           pluginApi.ui.openSidebar("puu-coach");
        }
      }
    }
  ]
};

export default puuCoachPlugin;
