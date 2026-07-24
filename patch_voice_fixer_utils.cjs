const fs = require('fs');
let code = fs.readFileSync('src/plugins/voice-fixer/utils.ts', 'utf8');

code = code.replace(/import { DEFAULT_PROMPT } from '\.\/prompts';/g, "import { VOICE_FIXER_DEFAULT_PROMPT as DEFAULT_PROMPT } from './prompts';");

fs.writeFileSync('src/plugins/voice-fixer/utils.ts', code);
console.log('fixed utils.ts');
