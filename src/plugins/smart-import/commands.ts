import { MessageSquareDiff } from "lucide-react";
import type { CommandHook } from "../registry";
import { handleAIdialogImport } from "./index";

// Команды для Command Palette (Cmd/Ctrl + K)
export const commands: CommandHook[] = [
  {
    id: "smart-import-dialog",
    label: "Smart AI Import: Диалог или текст",
    icon: MessageSquareDiff,
    execute: () => {
      handleAIdialogImport();
    }
  }
];
