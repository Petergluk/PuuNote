/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect } from "react";
import type { PluginDefinition, PluginAPI, CardActionHook } from "../registry";
import {
  Plus,
  Trash2,
  Edit2,
  GripVertical,
  Link,
  X,
  Check,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { manifest as puuChainsManifest } from "./manifest";
import { generateContentFallback } from "../../utils/aiModels";
import { createRoot } from "react-dom/client";

export interface ChainStep {
  id: string;
  instruction: string;
  systemPrompt?: string;
  modelOverride?: string;
  isInteractive?: boolean;
}

export interface TaskChain {
  id: string;
  name: string;
  enabled: boolean;
  steps: ChainStep[];
  actionType:
    | "child"
    | "sibling"
    | "replace"
    | "append"
    | "multiple_children"
    | "json_tree";
  contextScope: string;
  iconName: string;
}

const DEFAULT_CHAINS: TaskChain[] = [
  {
    id: "1",
    name: "Юмористический рерайт (Дерево)",
    enabled: true,
    actionType: "json_tree",
    contextScope: "level_branch",
    iconName: "Mic",
    steps: [
      {
        id: "1-1",
        instruction: `Проанализируй следующий текст и найди парадокс/конфликт/противоречие каждого абзаца. Определи наиболее перспективное направление для каждого:
1. Вниз - сделать страдание героя максимально эпичным.
2. В сторону - максимально внезапная метафора, неожиданный пример-аналогия из максимально далекой области, или сравнение доводящее мысль до полного абсурда.
3. В лоб - то что обычно не говорят: дать прямое и неожиданное, рвущее шаблоны и приличия определение, чем это вообще-то является на самом деле, если честно.

Исходный текст:
{{step_0}}`,
      },
      {
        id: "1-2",
        instruction: `Напиши по 10 вариантов рерайта каждого абзаца в стиле юмористических писателей (Ильф и Петров, Ерофеев, Пелевин, Довлатов, Кэролл, Аверченко, О.Генри и тд.), сохраняя полный смысл абзаца, или, при необходимости, развивая мысль, чуть увеличивая длину изложения (поскольку добавляются метафоры, сравнения и тд).

Используй исходный текст параграфов:
{{step_0}}

Ориентируйся на найденные парадоксы и направления:
{{step_1}}`,
      },
      {
        id: "1-3",
        instruction: `Проанализируй каждую 10-ку шуток (по каждому абзацу) и сделай ранжированные чеклисты. Самые смешные и оригинальные шутки/варианты расположи первыми, неудачные последними.

Варианты для анализа:
{{step_2}}`,
      },
      {
        id: "1-4",
        instruction: `Собери целостный финальный текст (итоговый юмористический рерайт списка исходных абзацев), комбинируя наиболее яркие и удачные находки из ранжированного списка. Рассказ должен быть складным и целостным.

Выведи ТОЛЬКО финальный текст.

Ранжированные варианты для сборки:
{{step_3}}`,
      },
      {
        id: "1-5",
        systemPrompt:
          "Ты редактор-юморист. Возвращай только валидный JSON, без маркдаун-оболочек.",
        instruction: `Теперь собери все наработки в виде древовидной структуры JSON.
Для каждого исходного абзаца должен быть свой корневой элемент. Внутри него — массив "children" из 10 придуманных вариантов.
Последним элементом массива должен быть финальный целостный текст.

Формат (строго массив объектов):
[
  {
    "content": "[Исходный абзац] -> [Парадокс и выбранное направление из шага 1]",
    "children": [
      { "content": "Вариант 1 (из шага 3)" },
      { "content": "Вариант 2 (из шага 3)" },
      { "content": "..." }
    ]
  },
  {
    "content": "ФИНАЛЬНЫЙ ЦЕЛОСТНЫЙ ТЕКСТ:\\n\\n[Текст из шага 4]",
    "children": []
  }
]

Вот все материалы, которые тебе понадобятся для сборки:

ИСХОДНЫЕ АБЗАЦЫ (Шаг 0):
{{step_0}}

ПАРАДОКСЫ (Шаг 1):
{{step_1}}

РАНЖИРОВАННЫЕ ВАРИАНТЫ 10шт (Шаг 3):
{{step_3}}

ФИНАЛЬНЫЙ ТЕКСТ (Шаг 4):
{{step_4}}`,
      },
    ],
  },
  {
    id: "2",
    name: "Проектирование онлайн-курса",
    enabled: true,
    actionType: "json_tree",
    contextScope: "card",
    iconName: "BookOpen",
    steps: [
      {
        id: "2-1",
        instruction: `Привет! Твоя задача — создать подробную структуру онлайн-курса на основе темы, переданной пользователем.

Сгенерируй названия модулей и уроков в виде простого текстового списка (по одной строке на урок/модуль).
Например:
Модуль 1: Введение
Урок 1.1: Что такое X
Урок 1.2: Зачем нужен X
Модуль 2: Основные концепции...

Тема курса: 
{{input}}`
      },
      {
        id: "2-2",
        instruction: `Вот черновик структуры онлайн-курса:
{{step_1}}`,
        isInteractive: true
      },
      {
        id: "2-3",
        instruction: `На основе утвержденной структуры создай детальное содержание для КАЖДОГО урока. 

Верни результат СТРОГО в виде JSON массива. Каждый элемент массива — это Модуль с вложенными Уроками. Не используй маркдаун-обертку, только валидный JSON.

Формат:
[
  {
    "content": "Модуль 1: Название",
    "children": [
      { 
        "content": "Урок 1.1: Название", 
        "children": [
          { "content": "Подробный контент урока (развернутый концепт/текст)..." },
          { "content": "Практическое задание: ..." }
        ]
      }
    ]
  }
]

Утвержденная структура:
{{step_2}}`
      }
    ]
  }
];

// ----------- Interactive Modal --------------
const InteractiveStepDialog = ({
  title,
  initialContent,
  onComplete,
  onCancel,
}: any) => {
  const [content, setContent] = useState(initialContent);
  const [lines, setLines] = useState(() =>
    initialContent.split("\n").filter((l: string) => l.trim().length > 0),
  );
  const [mode, setMode] = useState<"edit" | "sort" | "select">("sort");

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-app-panel text-app-text-primary rounded-xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-app-border flex justify-between items-center bg-app-card rounded-t-xl">
          <h2 className="font-bold text-lg">{title}</h2>
          <button onClick={onCancel} className="p-1 hover:bg-app-bg rounded">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 border-b border-app-border flex gap-4 bg-app-bg text-sm">
          <button
            onClick={() => setMode("edit")}
            className={`px-3 py-1.5 rounded font-medium transition-colors ${mode === "edit" ? "bg-app-accent text-white" : "bg-app-card text-app-text-secondary hover:bg-app-border"}`}
          >
            Ручное редактирование
          </button>
          <button
            onClick={() => {
              setMode("sort");
              setLines(
                content.split("\n").filter((l: string) => l.trim().length > 0),
              );
            }}
            className={`px-3 py-1.5 rounded font-medium transition-colors ${mode === "sort" ? "bg-app-accent text-white" : "bg-app-card text-app-text-secondary hover:bg-app-border"}`}
          >
            Сортировка (Drag & Drop)
          </button>
          <button
            onClick={() => {
              setMode("select");
              setLines(
                content.split("\n").filter((l: string) => l.trim().length > 0),
              );
            }}
            className={`px-3 py-1.5 rounded font-medium transition-colors ${mode === "select" ? "bg-app-accent text-white" : "bg-app-card text-app-text-secondary hover:bg-app-border"}`}
          >
            Выбор / Удаление
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          {mode === "edit" ? (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-full min-h-[400px] p-3 rounded-lg border border-app-border bg-app-input-bg text-sm focus:outline-none focus:ring-1 focus:ring-app-accent font-mono resize-y"
            />
          ) : mode === "sort" ? (
            <div className="space-y-2">
              {lines.map((text: string, i: number) => (
                <div
                  key={i}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", i.toString());
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const fromStr = e.dataTransfer.getData("text/plain");
                    if (!fromStr) return;
                    const from = parseInt(fromStr);
                    const to = i;
                    if (from === to) return;
                    const newLines = [...lines];
                    const [moved] = newLines.splice(from, 1);
                    newLines.splice(to, 0, moved);
                    setLines(newLines);
                    setContent(newLines.join("\n"));
                  }}
                  className="p-3 bg-app-card border border-app-border rounded-lg cursor-grab active:cursor-grabbing flex gap-3 text-sm hover:border-app-accent hover:shadow-sm transition-all"
                >
                  <GripVertical
                    size={16}
                    className="text-app-text-secondary mt-1 shrink-0"
                  />
                  <div className="flex-1 whitespace-pre-wrap">{text}</div>
                </div>
              ))}
              {lines.length === 0 && (
                <div className="text-center text-app-text-secondary py-10">
                  Нет строк для сортировки
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {lines.map((text: string, i: number) => (
                <div
                  key={i}
                  className="p-3 bg-app-card border border-app-border rounded-lg flex items-start gap-3 text-sm transition-all"
                >
                  <div className="flex-1 whitespace-pre-wrap">{text}</div>
                  <button
                    onClick={() => {
                      const newLines = lines.filter((_: string, idx: number) => idx !== i);
                      setLines(newLines);
                      setContent(newLines.join("\n"));
                    }}
                    className="p-1.5 text-app-text-secondary hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {lines.length === 0 && (
                <div className="text-center text-app-text-secondary py-10">
                  Нет строк для выбора
                </div>
              )}
            </div>
          )}
        </div>
        <div className="p-4 border-t border-app-border bg-app-card rounded-b-xl flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-app-bg text-app-text-secondary border border-app-border hover:bg-app-border text-sm transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={() => {
              if (mode === "sort" || mode === "select") {
                onComplete(lines.join("\n"));
              } else {
                onComplete(content);
              }
            }}
            className="px-5 py-2 rounded-lg bg-app-accent text-white flex items-center gap-2 text-sm font-medium hover:bg-app-accent/90 shadow-lg shadow-app-accent/20 transition-all"
          >
            <Check size={16} /> Принять вариант
          </button>
        </div>
      </div>
    </div>
  );
};

function showInteractiveDialog(
  title: string,
  initialContent: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const div = document.createElement("div");
    document.body.appendChild(div);
    const root = createRoot(div);

    function cleanup() {
      setTimeout(() => {
        root.unmount();
        div.remove();
      }, 100);
    }

    root.render(
      <InteractiveStepDialog
        title={title}
        initialContent={initialContent}
        onComplete={(res: string) => {
          resolve(res);
          cleanup();
        }}
        onCancel={() => {
          reject(new Error("Отменено пользователем"));
          cleanup();
        }}
      />,
    );
  });
}

function getChains(): TaskChain[] {
  const data = localStorage.getItem("PuuChains_data");
  if (data) {
    try {
      const parsed = JSON.parse(data);
      // Auto-migrate to enable interactivity on the sorting step
      if (Array.isArray(parsed)) {
         parsed.forEach(c => {
            if (c.id === "1" || c.name.includes("Дерево")) {
                c.actionType = "json_tree";
            }
            if (c.steps && Array.isArray(c.steps)) {
               c.steps.forEach((s: any) => {
                  if (s.instruction && s.instruction.includes('ранжированные чеклисты') && typeof s.isInteractive === 'undefined') {
                     s.isInteractive = true;
                  }
               });
            }
         });
         
         // Merge any new default chains that the user doesn't have yet
         DEFAULT_CHAINS.forEach(dc => {
            if (!parsed.find((c: any) => c.id === dc.id)) {
               parsed.push(dc);
            }
         });
      }
      return parsed;
    } catch {}
  }
  return DEFAULT_CHAINS;
}

function saveChains(chains: TaskChain[]) {
  localStorage.setItem("PuuChains_data", JSON.stringify(chains));
}

let pluginApi: PluginAPI | null = null;
const cardActionsList: CardActionHook[] = [];

function updateCardActions() {
  cardActionsList.length = 0;
  const chains = getChains().filter((c) => c.enabled);

  chains.forEach((chain) => {
    let IconComponent = Link as any;
    if (chain.iconName && (LucideIcons as any)[chain.iconName]) {
      IconComponent = (LucideIcons as any)[chain.iconName];
    }

    cardActionsList.push({
      id: `puu-chains-${chain.id}`,
      label: chain.name,
      icon: IconComponent,
      onClick: async (nodeId: string, node: any) => {
        const api = pluginApi;
        if (!api) return;

        const scope = chain.contextScope || "card";
        let initialContext = "";
        try {
          initialContext =
            api.document?.resolveContext?.(nodeId, scope) || node.content || "";
        } catch {
          initialContext = node.content || "";
        }

        let jobId: string | undefined;
        try {
          jobId = api.addJob?.(`AI Chain: ${chain.name}`);

          let currentInput = initialContext;
          const stepOutputs: Record<string, string> = {
            step_0: initialContext,
          };

          // Execution of the chain
          for (let i = 0; i < chain.steps.length; i++) {
            const step = chain.steps[i];
            api.updateJobProgress?.(
              jobId!,
              Math.floor((i / chain.steps.length) * 100),
              `Шаг ${i + 1}/${chain.steps.length}...`,
            );

            let prompt = step.instruction || "";

            // Resolve {{input}} inside the instruction. If not found, append it.
            if (prompt.includes("{{input}}")) {
              prompt = prompt.replace(/\{\{input\}\}/g, currentInput);
            } else {
              prompt = prompt + "\n\nВходные данные:\n" + currentInput;
            }

            // We could also resolve other variables {{card}}, {{document}} if we want
            const resolveTemplate = (template: string) => {
              const varRegex = /\{\{([^}]+)\}\}/g;
              let match;
              const scopesToResolve = new Set<string>();
              while ((match = varRegex.exec(template)) !== null) {
                const val = match[1].trim();
                if (val !== "input" && !val.startsWith("step_")) {
                  scopesToResolve.add(val);
                }
              }

              const scopeResolutions: Record<string, string> = {};
              for (const s of scopesToResolve) {
                try {
                  scopeResolutions[s] =
                    api.document?.resolveContext?.(nodeId, s) || "";
                } catch {
                  scopeResolutions[s] = "";
                }
              }

              return template.replace(varRegex, (_, varName) => {
                const vn = varName.trim();
                if (vn === "input") return currentInput;
                if (vn.startsWith("step_") && stepOutputs[vn] !== undefined) {
                  return stepOutputs[vn];
                }
                return scopeResolutions[vn] || "";
              });
            };

            prompt = resolveTemplate(prompt);
            const resolvedSystem = step.systemPrompt
              ? resolveTemplate(step.systemPrompt)
              : undefined;
            const selectedModel = step.modelOverride || undefined;

            // Execute step
            const response = await generateContentFallback(
              prompt,
              selectedModel,
              {
                systemInstruction: resolvedSystem,
                onStatusChange: (msg) => {
                  api.updateJobProgress?.(
                    jobId!,
                    Math.floor((i / chain.steps.length) * 100) + 10,
                    `Шаг ${i + 1}/${chain.steps.length}: ` + msg,
                  );
                },
              },
            );

            currentInput = response.text || "";

            if (step.isInteractive) {
              api.updateJobProgress?.(
                jobId!,
                Math.floor((i / chain.steps.length) * 100) + 15,
                `Шаг ${i + 1}/${chain.steps.length}: Ожидание действий пользователя...`,
              );
              try {
                currentInput = await showInteractiveDialog(
                  `Шаг ${i + 1}: Интерактивное подтверждение`,
                  currentInput,
                );
              } catch (e: any) {
                throw new Error("Процесс прерван: " + e.message);
              }
            }

            stepOutputs[`step_${i + 1}`] = currentInput;
          }

          api.updateJobProgress?.(jobId!, 90, "Обновление дерева...");

          const text = currentInput;
          const action = chain.actionType || "child";

          if (action === "child") {
            if (api?.document?.addNode) api.document.addNode(text, nodeId);
          } else if (action === "multiple_children") {
            if (api?.document?.addNode) {
              let parsed: string[] = [];
              try {
                let cleanText = text.trim();
                const jsonMatch = cleanText.match(
                  /```(?:json)?\s*([\s\S]*?)```/,
                );
                if (jsonMatch) cleanText = jsonMatch[1].trim();
                const possibleArray = JSON.parse(cleanText);
                if (Array.isArray(possibleArray)) {
                  parsed = possibleArray.map((item) => String(item));
                } else {
                  parsed = [text];
                }
              } catch (e) {
                parsed = [text];
              }

              let targetSiblings = [node];
              const state = api.getState?.();
              if (state && state.nodes) {
                const siblings = Object.values(state.nodes).filter(
                  (n: any) => n.parentId === node.parentId,
                );
                if (siblings.length > 0) {
                  siblings.sort(
                    (a: any, b: any) => (a.order || 0) - (b.order || 0),
                  );
                  targetSiblings = siblings;
                }
              }

              const maxItems = Math.max(parsed.length, targetSiblings.length);
              for (let i = 0; i < maxItems; i++) {
                const textItem = parsed[i];
                if (!textItem) continue;
                const targetNode =
                  targetSiblings[i] ||
                  targetSiblings[targetSiblings.length - 1];
                api.document.addNode(textItem, targetNode.id);
              }
            }
          } else if (action === "json_tree") {
            if (api?.document?.addNode) {
              let parsed: any = null;
              try {
                let cleanText = text.trim();
                const jsonMatch = cleanText.match(
                  /```(?:json)?\s*([\s\S]*?)```/,
                );
                if (jsonMatch) cleanText = jsonMatch[1].trim();
                parsed = JSON.parse(cleanText);
              } catch (e) {
                // Fallback if not valid JSON
                api.document.addNode(text, nodeId);
              }

              if (parsed) {
                const addTree = (items: any[], parentId: string) => {
                  for (const item of items) {
                    if (typeof item === "string") {
                      api.document!.addNode(item, parentId);
                    } else if (typeof item === "object" && item !== null) {
                      const content =
                        item.content || item.text || JSON.stringify(item);
                      if (content === "[]" || content === "{}") continue; // skip empty objects if strings failed to parse properly
                      const newId = api.document!.addNode(content, parentId);
                      if (item.children && Array.isArray(item.children)) {
                        addTree(item.children, newId);
                      }
                    }
                  }
                };

                if (Array.isArray(parsed)) {
                  addTree(parsed, nodeId);
                } else if (typeof parsed === "object") {
                  addTree([parsed], nodeId);
                } else {
                  api.document.addNode(String(parsed), nodeId);
                }
              }
            }
          } else if (action === "sibling") {
            const parentId = node.parentId || null;
            if (api?.document?.addNode) api.document.addNode(text, parentId);
          } else if (action === "replace") {
            if (api?.document?.updateNodeContent)
              api.document.updateNodeContent(nodeId, text);
          } else if (action === "append") {
            const newContent = (node.content || "") + "\n\n" + text;
            if (api?.document?.updateNodeContent)
              api.document.updateNodeContent(nodeId, newContent);
          } else {
            api.toast?.("Failed to process node action.", "error");
          }

          api.completeJob?.(jobId!, "Завершено", () => {});
          api.toast?.(`Цепочка завершена: ${chain.name}`, "success");
        } catch (error) {
          console.error(error);
          if (jobId) api.failJob?.(jobId, String(error));
          api.toast?.(`Ошибка в цепочке: ${String(error)}`, "error");
        }
      },
    });
  });

  window.dispatchEvent(new CustomEvent("plugin-actions-updated"));
}

const COMMON_ICONS = [
  "AlertCircle",
  "Link",
  "Layers",
  "Mic",
  "BrainCircuit",
  "Zap",
  "Sparkles",
  "Target",
  "AlignLeft",
  "BookOpen",
  "Wand2",
];

function renderIcon(name: string, props: any = {}) {
  const IconCmp = (LucideIcons as any)[name];
  if (IconCmp) return <IconCmp {...props} />;
  return <LucideIcons.Link {...props} />;
}

function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [customName, setCustomName] = useState(value || "Link");

  useEffect(() => {
    setCustomName(value || "Link");
  }, [value]);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-10 h-10 rounded-lg border border-app-border bg-app-input-bg hover:bg-app-card text-app-text-primary shadow-sm focus:ring-1 focus:ring-app-accent focus:outline-none transition-colors group"
        title="Выбрать иконку"
      >
        <div className="group-hover:scale-110 transition-transform flex items-center justify-center">
          {renderIcon(value || "Link", { size: 18 })}
          <LucideIcons.ChevronDown size={12} className="ml-0.5 opacity-50" />
        </div>
      </button>

      {isOpen && (
        <div className="absolute top-11 left-0 z-50 w-64 bg-app-card border border-app-border rounded shadow-xl p-2 flex flex-col gap-2">
          <div className="flex gap-2 items-center">
            <input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="w-full px-2 py-1 bg-app-input-bg border border-app-border rounded-lg text-sm focus:ring-1 focus:ring-inset focus:ring-app-accent focus:outline-none text-app-text-primary"
              placeholder="Название из Lucide"
            />
            <button
              onClick={() => {
                onChange(customName);
                setIsOpen(false);
              }}
              className="bg-app-accent text-white px-2 py-1 rounded-lg text-sm"
            >
              OK
            </button>
          </div>
          <div className="flex flex-wrap gap-1 max-h-48 overflow-y-auto mt-1 justify-center p-1">
            {COMMON_ICONS.map((name) => {
              const IconCmp = (LucideIcons as any)[name];
              if (!IconCmp) return null;
              return (
                <button
                  key={name}
                  onClick={() => {
                    onChange(name);
                    setIsOpen(false);
                  }}
                  className={`p-1.5 rounded border ${value === name ? "border-app-accent bg-app-accent/10 text-app-accent" : "border-transparent hover:border-app-border hover:bg-app-card-hover text-app-text-primary"}`}
                  title={name}
                >
                  <IconCmp size={16} />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function PuuChainsSettings() {
  const [chains, setChains] = useState<TaskChain[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  // States purely for editing a chain
  const [editChain, setEditChain] = useState<TaskChain | null>(null);

  useEffect(() => {
    setChains(getChains());
  }, []);

  const handleChange = (newChains: TaskChain[]) => {
    setChains(newChains);
    saveChains(newChains);
    updateCardActions();
  };

  const toggleEnabled = (id: string, enabled: boolean) => {
    handleChange(chains.map((c) => (c.id === id ? { ...c, enabled } : c)));
  };

  const deleteChain = (id: string) => {
    handleChange(chains.filter((c) => c.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const addChain = () => {
    const newChain: TaskChain = {
      id: Date.now().toString(),
      name: "Новая цепочка",
      enabled: true,
      actionType: "child",
      contextScope: "card",
      iconName: "Link",
      steps: [
        {
          id: Date.now().toString() + "-1",
          instruction: "Что сделать с {{step_0}}?",
        },
      ],
    };
    handleChange([newChain, ...chains]);
    startEditing(newChain);
  };

  const startEditing = (c: TaskChain) => {
    setEditingId(c.id);
    setEditChain(JSON.parse(JSON.stringify(c))); // deep clone
  };

  const saveEdit = () => {
    if (!editChain) return;
    handleChange(chains.map((c) => (c.id === editingId ? editChain : c)));
    setEditingId(null);
  };

  const addStep = () => {
    if (!editChain) return;
    const newSteps = [
      ...editChain.steps,
      { id: Date.now().toString(), instruction: "" },
    ];
    setEditChain({ ...editChain, steps: newSteps });
  };

  const removeStep = (index: number) => {
    if (!editChain) return;
    const newSteps = editChain.steps.filter((_, i) => i !== index);
    setEditChain({ ...editChain, steps: newSteps });
  };

  const updateStep = (index: number, field: keyof ChainStep, val: any) => {
    if (!editChain) return;
    const newSteps = [...editChain.steps];
    newSteps[index] = { ...newSteps[index], [field]: val };
    setEditChain({ ...editChain, steps: newSteps });
  };

  return (
    <div className="flex flex-col gap-6 text-app-text-primary">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm text-app-text-primary">
              Цепочки задач (Агенты)
            </h3>
          </div>
          <button
            onClick={addChain}
            className="bg-app-accent text-white px-3 py-1.5 flex items-center gap-1 auto rounded text-sm hover:bg-app-accent/90 transition-colors"
          >
            <Plus size={16} /> Создать цепочку
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {chains.map((c) => (
            <div
              key={c.id}
              className="border border-app-border rounded-lg p-3 bg-app-card flex flex-col gap-2"
            >
              {editingId === c.id && editChain ? (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <IconPicker
                      value={editChain.iconName}
                      onChange={(val) =>
                        setEditChain({ ...editChain, iconName: val })
                      }
                    />
                    <input
                      value={editChain.name}
                      onChange={(e) =>
                        setEditChain({ ...editChain, name: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-app-border bg-app-input-bg text-sm focus:ring-1 focus:ring-inset focus:ring-app-accent focus:outline-none font-medium text-app-text-primary"
                      placeholder="Название цепочки"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="font-medium text-sm text-app-text-primary">
                        Входной контекст
                      </label>
                      <select
                        value={editChain.contextScope}
                        onChange={(e) =>
                          setEditChain({
                            ...editChain,
                            contextScope: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-app-border bg-app-input-bg text-sm focus:ring-1 focus:ring-inset focus:ring-app-accent focus:outline-none text-app-text-primary cursor-pointer"
                      >
                        <option value="card">Только эта карточка</option>
                        <option value="document">
                          Текст всего документа целиком
                        </option>
                        <option value="level_branch">
                          Карточки-братья (вертикальный уровень ветки)
                        </option>
                        <option value="level_all">
                          Все вертикальные карточки уровня (Столбец)
                        </option>
                        <option value="branch_parent">
                          От корня до выбранной карточки
                        </option>
                        <option value="branch_children">
                          Карточка + все потомки текущей (Ветка)
                        </option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="font-medium text-sm text-app-text-primary">
                        Результат (Вывод)
                      </label>
                      <select
                        value={editChain.actionType}
                        onChange={(e) =>
                          setEditChain({
                            ...editChain,
                            actionType: e.target.value as any,
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-app-border bg-app-input-bg text-sm focus:ring-1 focus:ring-inset focus:ring-app-accent focus:outline-none text-app-text-primary cursor-pointer"
                      >
                        <option value="child">Создать дочернюю карточку</option>
                        <option value="multiple_children">
                          Дочерние ко всем на уровне (массив JSON)
                        </option>
                        <option value="json_tree">
                          Структура ветки (JSON tree)
                        </option>
                        <option value="sibling">
                          Создать соседнюю карточку
                        </option>
                        <option value="replace">Заменить этот текст</option>
                        <option value="append">Дописать вниз текущей</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 mt-2 border border-app-border p-3 rounded-lg bg-app-panel">
                    <div className="flex items-center justify-between pb-2 border-b border-app-border">
                      <h4 className="font-semibold text-sm text-app-text-primary">
                        Шаги (Steps)
                      </h4>
                      <button
                        onClick={addStep}
                        className="text-xs flex items-center gap-1 text-app-accent hover:text-app-accent/80 transition-colors"
                      >
                        <Plus size={14} /> Добавить шаг
                      </button>
                    </div>

                    <div className="flex flex-col gap-4 mt-2">
                      {editChain.steps.map((step, index) => (
                        <div
                          key={step.id}
                          className="flex gap-2 p-2 rounded border border-app-border bg-app-card"
                        >
                          <div className="mt-2 text-app-text-secondary w-6 flex items-start justify-center font-bold">
                            {index + 1}.
                          </div>
                          <div className="flex flex-col gap-2 flex-1">
                            <textarea
                              value={step.instruction}
                              onChange={(e) =>
                                updateStep(index, "instruction", e.target.value)
                              }
                              className="w-full px-3 py-2 rounded-lg border border-app-border bg-app-input-bg text-sm h-20 focus:ring-1 focus:ring-inset focus:ring-app-accent focus:outline-none resize-y text-app-text-primary font-mono"
                              placeholder="Промпт шага. Напр. {{input}} (прошлый шаг), {{step_0}} (текст карточки), {{step_1}} (результат шага 1) и т.д."
                            />
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={step.modelOverride || ""}
                                placeholder="Модель (опц.)"
                                onChange={(e) =>
                                  updateStep(
                                    index,
                                    "modelOverride",
                                    e.target.value,
                                  )
                                }
                                className="w-1/2 px-2 py-1 flex-1 rounded border border-app-border bg-app-input-bg text-xs focus:ring-1 focus:ring-inset focus:ring-app-accent focus:outline-none text-app-text-primary"
                              />
                              <input
                                type="text"
                                value={step.systemPrompt || ""}
                                placeholder="Системный промпт (опц.)"
                                onChange={(e) =>
                                  updateStep(
                                    index,
                                    "systemPrompt",
                                    e.target.value,
                                  )
                                }
                                className="w-1/2 px-2 py-1 flex-1 rounded border border-app-border bg-app-input-bg text-xs focus:ring-1 focus:ring-inset focus:ring-app-accent focus:outline-none text-app-text-primary"
                              />
                            </div>
                            <label className="flex items-center gap-2 mt-1 cursor-pointer">
                              <input
                                type="checkbox"
                                className="rounded border-app-border bg-app-input-bg text-app-accent focus:ring-app-accent"
                                checked={!!step.isInteractive}
                                onChange={(e) =>
                                  updateStep(
                                    index,
                                    "isInteractive",
                                    e.target.checked,
                                  )
                                }
                              />
                              <span className="text-xs text-app-text-secondary select-none">
                                Показать диалог (сортировка/редактура) после
                                этого шага
                              </span>
                            </label>
                          </div>
                          <button
                            onClick={() => removeStep(index)}
                            className="text-red-400 hover:text-red-300 p-1 flex-shrink-0 self-start"
                            title="Удалить шаг"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                      {editChain.steps.length === 0 && (
                        <div className="text-center text-xs text-app-text-secondary py-2">
                          Нет шагов
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex mt-2">
                    <button
                      onClick={saveEdit}
                      className="text-sm bg-app-accent hover:bg-app-accent/90 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      Сохранить
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="flex items-center justify-between group cursor-pointer"
                  onClick={(e) => {
                    if (
                      (e.target as HTMLElement).closest(
                        'input[type="checkbox"], button',
                      )
                    )
                      return;
                    startEditing(c);
                  }}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                    <input
                      type="checkbox"
                      checked={c.enabled}
                      onChange={(e) => toggleEnabled(c.id, e.target.checked)}
                      className="w-4 h-4 shrink-0 rounded border border-app-border bg-app-input-bg text-app-accent cursor-pointer focus:ring-1 focus:ring-inset focus:ring-app-accent focus:outline-none"
                    />
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`shrink-0 flex items-center justify-center p-1.5 rounded-md ${c.enabled ? "text-app-text-primary bg-app-text-primary/10 border border-app-text-primary/20 brightness-150" : "text-app-text-secondary opacity-60 bg-app-input-bg border border-app-border"}`}
                        >
                          {renderIcon(c.iconName || "Link", { size: 16 })}
                        </span>
                        <span
                          className={`text-[15px] whitespace-nowrap shrink-0 ${c.enabled ? "text-app-text-primary font-medium" : "text-app-text-secondary line-through opacity-60"}`}
                        >
                          {c.name}
                        </span>
                        <span className="text-[12px] px-1.5 py-0.5 rounded bg-app-panel text-app-text-secondary border border-app-border uppercase ml-2 tracking-wider">
                          {c.steps.length}{" "}
                          {c.steps.length === 1
                            ? "шаг"
                            : c.steps.length > 1 && c.steps.length < 5
                              ? "шага"
                              : "шагов"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditing(c);
                      }}
                      className="text-app-text-secondary hover:text-white transition-colors p-2 rounded-lg hover:bg-app-card"
                      title="Настроить"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteChain(c.id);
                      }}
                      className="text-red-400 hover:text-red-300 transition-colors p-2 rounded-lg hover:bg-app-card"
                      title="Удалить"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {chains.length === 0 && (
            <div className="text-sm text-app-text-secondary py-4 text-center border border-dashed border-app-border rounded-lg">
              Нет цепочек. Создайте первую!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const puuChainsPlugin: PluginDefinition = {
  ...puuChainsManifest,
  settingsComponent: PuuChainsSettings,

  async init(api: PluginAPI) {
    pluginApi = api;
    updateCardActions();
    console.log("PuuChains Plugin initialized.");
  },

  async unload() {
    cardActionsList.length = 0;
    console.log("PuuChains Plugin unloaded.");
  },

  cardActions: cardActionsList,
};

export default puuChainsPlugin;
