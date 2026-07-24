const fs = require('fs');
let code = fs.readFileSync('src/plugins/voice-fixer/index.tsx', 'utf8');

code = `import { VOICE_FIXER_DEFAULT_PROMPT } from './prompts';\n` + code;
code = code.replace(/const defaultPrompt = \\`[\\s\\S]*?стиль и тон\.\\`;/m, "const defaultPrompt = VOICE_FIXER_DEFAULT_PROMPT;");

fs.writeFileSync('src/plugins/voice-fixer/index.tsx', code);
console.log('patched voice-fixer');
