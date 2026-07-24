const fs = require('fs');
let code = fs.readFileSync('src/plugins/smart-import/settings.tsx', 'utf8');
code = `import { DEFAULT_SYSTEM_PROMPT } from './prompts';\n` + code;
code = code.replace(/const defaultSystemPrompt = 'Твоя задача — преобразовать линейный текст в иерархическую древовидную структуру. Это необходимо для того, чтобы пользователь мог нелинейно перемещаться по материалу. Раздели текст на логические блоки, темы или хронологические этапы и выстрой их в виде вложенного дерева.';\n  const \[systemPrompt, setSystemPrompt\] = useState\(\(\) => pluginApi\?\.settings\?\.get\('system_prompt', defaultSystemPrompt\)\);/, "const [systemPrompt, setSystemPrompt] = useState(() => pluginApi?.settings?.get('system_prompt', DEFAULT_SYSTEM_PROMPT));");
fs.writeFileSync('src/plugins/smart-import/settings.tsx', code);
