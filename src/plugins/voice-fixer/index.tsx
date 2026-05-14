import { Mic } from 'lucide-react';
import type { PluginAPI, PluginDefinition } from '../registry';
import { voiceFixerManifest } from './manifest';
import { openRecordingModal, unmountModal } from './modalManager';

let pluginApi: PluginAPI | null = null;

export const voiceFixerPlugin: PluginDefinition = {
  ...voiceFixerManifest,

  async init(api: PluginAPI) {
    pluginApi = api;
    console.log("Voice Fixer plugin initialized!");
  },

  async unload() {
    unmountModal();
  },

  commands: [
    {
      id: "voice-fixer-record",
      label: "Start Voice Recording (Root Node)",
      icon: Mic,
      run: async () => {
        if (pluginApi) {
          openRecordingModal(null, pluginApi);
        }
      }
    }
  ],

  cardActions: [
    {
      id: "voice-fixer-card-record",
      label: "Записать аудио в карточку (Voice Fixer)",
      icon: <Mic size={14} />,
      isVisible: (_nodeId: string) => true,
      onClick: (nodeId: string) => {
        if (pluginApi) {
          openRecordingModal(nodeId, pluginApi);
        }
      }
    }
  ]
};
