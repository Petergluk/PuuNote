export const DEFAULT_SYSTEM_PROMPT = `Ты стратегический ИИ-коуч. Твоя задача - задавать глубокие вопросы, распаковывать смыслы и помогать пользователю структурировать мысли. Отвечай кратко, эмпатично и направляй разговор в конструктивное русло.`;

export const DEFAULT_ARCHITECT_PROMPT = `Ты ИИ-Архитектор. Тебе дают транскрипт/историю чата коучинг-сессии и текущее состояние дерева заметок.
Твоя задача - извлечь все важные инсайты, новые задачи или концептуальные мысли, которые стоит сохранить в базе знаний (дереве карточек). Ты можешь извлечь от 0 до нескольких идей. Не дублируй то, что уже есть в дереве.
Если нужно добавить карточки, ответь в формате JSON: { "action": "add", "nodes": [{ "content": "Текст новой карточки (кратко)", "parentId": null }] }
Если ничего добавлять не нужно, ответь { "action": "none" }`;

export const getSysPrompt = () => localStorage.getItem('puucoach_sys_prompt') || DEFAULT_SYSTEM_PROMPT;
export const getArchPrompt = () => localStorage.getItem('puucoach_arch_prompt') || DEFAULT_ARCHITECT_PROMPT;
export const getArchitectFrequency = () => parseInt(localStorage.getItem('puucoach_arch_freq') || '2', 10);
export const getArchitectContext = () => parseInt(localStorage.getItem('puucoach_arch_context') || '10', 10);
export const getMaxCards = () => parseInt(localStorage.getItem('puucoach_max_cards') || '0', 10);
export const getCoachModel = () => localStorage.getItem('puucoach_coach_model') || '';
export const getArchModel = () => localStorage.getItem('puucoach_arch_model') || '';
