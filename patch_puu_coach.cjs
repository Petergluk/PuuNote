const fs = require('fs');
let code = fs.readFileSync('src/plugins/puu-coach/config.ts', 'utf8');

code = `import { DEFAULT_SYSTEM_PROMPT, DEFAULT_ARCHITECT_PROMPT } from './prompts';\n` + code;
code = code.replace(/export const DEFAULT_SYSTEM_PROMPT = \`[\s\S]*?\`;\n/m, "");
code = code.replace(/export const DEFAULT_ARCHITECT_PROMPT = \`[\s\S]*?\`;\n/m, "");
fs.writeFileSync('src/plugins/puu-coach/config.ts', code);
console.log('updated puu-coach');
