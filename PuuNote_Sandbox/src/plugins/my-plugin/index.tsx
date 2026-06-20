import type { PluginDefinition } from "../registry";
import { Sparkles, FileUp, Settings } from "lucide-react";
import { manifest } from "./manifest";
import { MyPluginSettings } from "./settings";
import { commands } from "./commands";
import { setPluginApi, pluginApi } from "./api";

const myPlugin: PluginDefinition = {
  ...manifest,
  
  // 1. Жизненный цикл плагина
  init: (api) => {
    setPluginApi(api);
    console.log("🛠️ Plugin Init: Плагин успешно загружен!");
  },
  unload: () => {
    console.log("🧹 Plugin Unload: Плагин выключен.");
  },

  // 2. Кнопки в Header (Шапке)
  headerActions: [
    {
      id: "test-header-action",
      label: "Import Data",
      icon: FileUp,
      dropdownItems: [
        {
          id: "import-pdf",
          label: "Import PDF Document",
          icon: FileUp,
          onClick: () => alert("Имитация: импорт PDF файла...")
        }
      ]
    }
  ],

  // 3. Кнопки на конкретной карточке (Node)
  cardActions: [
    {
      id: "test-card-action",
      label: "Magic Edit",
      icon: Sparkles,
      onClick: (id, node) => {
        alert(`Применение Magic Edit к карточке: ID "${id}" с текстом: "${node.title}"`);
      }
    }
  ],

  // 4. Кнопки в Footer (Подвале)
  footerActions: [
    {
      id: "test-footer-action",
      label: "System Status",
      icon: Settings,
      onClick: () => alert("Статус: Все системы работают нормально.")
    }
  ],

  // 5. Команды для Command Palette (Cmd/Ctrl + K)
  commands,

  // 6. UI настроек в панели плагинов
  settingsComponent: MyPluginSettings,

  // 7. Хуки обработки данных
  hooks: {
    onNodeCreated: (node) => console.log("Событие: Создана новая нода", node),
    onNodeUpdated: (nodeId, node) => console.log("Событие: Нода обновлена", nodeId),
    onNodeDeleted: (nodeId) => console.log("Событие: Нода удалена", nodeId),
  }
};

export default myPlugin;

