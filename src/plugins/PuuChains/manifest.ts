import { PluginDefinition } from "../registry";

export const manifest: Partial<PluginDefinition> = {
  id: "puu-chains",
  name: "PuuChains (Agent)",
  version: "1.0.0",
  description:
    "Агентные цепочки задач. Позволяет создавать последовательности обработки(пайплайны) промптов, где результат одного шага передаётся в следующий шаг.",
};
