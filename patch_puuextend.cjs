const fs = require('fs');
let code = fs.readFileSync('src/plugins/PuuExtend/index.tsx', 'utf8');
code = `import { DEFAULT_PROMPTS } from './prompts';\n` + code;
code = code.replace(/const DEFAULT_PROMPTS[\s\S]*?\];/m, "");
fs.writeFileSync('src/plugins/PuuExtend/index.tsx', code);
