const fs = require('fs');
let code = fs.readFileSync('src/plugins/voice-fixer/index.tsx', 'utf8');

code = code.replace(/import { VOICE_FIXER_DEFAULT_PROMPT } from '\.\/prompts';\n/, "");

fs.writeFileSync('src/plugins/voice-fixer/index.tsx', code);
console.log('fixed');
