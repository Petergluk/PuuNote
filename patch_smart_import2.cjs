const fs = require('fs');
let code = fs.readFileSync('src/plugins/smart-import/index.tsx', 'utf8');

if (!code.includes('import { DEFAULT_SYSTEM_PROMPT, buildSmartImportPrompt }')) {
    code = `import { DEFAULT_SYSTEM_PROMPT, buildSmartImportPrompt } from './prompts';\n` + code;
    code = code.replace(/const { DEFAULT_SYSTEM_PROMPT, buildSmartImportPrompt } = require\('\.\/prompts'\);/, '');
    fs.writeFileSync('src/plugins/smart-import/index.tsx', code);
}
