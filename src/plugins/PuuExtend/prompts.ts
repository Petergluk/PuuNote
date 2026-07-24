import { PromptDefinition } from "./index";

export const DEFAULT_PROMPTS: PromptDefinition[] = [
  { id: '1', name: 'Summarize', content: 'Summarize the following text in 3 bullet points:\n\n', enabled: true, actionType: 'child', contextScope: 'card', iconName: 'AlignLeft' },
  { id: '2', name: 'Explain', content: 'Explain the following text simply:\n\n', enabled: true, actionType: 'child', contextScope: 'card', iconName: 'BrainCircuit' },
  { id: '3', name: 'Improve', content: 'Improve the writing and grammar of the following text.', enabled: true, actionType: 'replace', contextScope: 'card', iconName: 'Sparkles' },
  { id: '4', name: 'Ask AI...', content: '', enabled: true, actionType: 'child', contextScope: 'card', promptOnAction: true, iconName: 'MessageCircle' },
];
