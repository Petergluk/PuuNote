import { Sparkles, TerminalSquare } from "lucide-react";
import type { CommandHook } from "../registry";
import { pluginApi } from "./api";

// Команды для Command Palette (Cmd/Ctrl + K)
export const commands: CommandHook[] = [
  {
    id: "test-command-1",
    label: "Run Global Diagnostics",
    icon: TerminalSquare,
    execute: () => {
      alert("Запущена глобальная диагностика из Command Palette!");
    }
  },
  {
    id: "test-command-add-node",
    label: "Create Child Node via API",
    icon: Sparkles,
    execute: () => {
      if (!pluginApi || !pluginApi.getState) return;
      const state = pluginApi.getState();
      // Используем mock API для добавления дочерней карточки
      state.addChild("test-node-1", "Новая дочерняя карточка, созданная плагином! ✨");
      pluginApi.toast?.("Новая карточка добавлена", "success");
    }
  },
  {
    id: "test-command-uppercase",
    label: "Uppercase Selected Text",
    icon: Sparkles,
    execute: () => {
      if (!pluginApi || !pluginApi.editor) return;
      const selection = pluginApi.editor.getActiveSelection();
      if (selection && selection.text) {
        pluginApi.editor.replaceSelection(selection.text.toUpperCase());
        pluginApi.toast?.("Text updated!", "success");
      } else {
        alert("Пожалуйста, сначала выделите текст в карточке.");
      }
    }
  }
];
