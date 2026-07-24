const fs = require('fs');

const files = ['src/plugins/puu-coach/prompts.ts', 'src/plugins/voice-fixer/prompts.ts'];

for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');
  code = code.replace(/\\`/g, "`");
  fs.writeFileSync(file, code);
}
console.log('fixed');
