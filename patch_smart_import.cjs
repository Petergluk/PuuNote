const fs = require('fs');
let code = fs.readFileSync('src/plugins/smart-import/index.tsx', 'utf8');

code = code.replace(
  /const defaultSystemPrompt = [\s\S]*?Ответь ТОЛЬКО валидным JSON-массивом\. Не добавляй никаких других слов \(например, \\`\\`\\`json\) вокруг массива\.\`;/m,
  `const { DEFAULT_SYSTEM_PROMPT, buildSmartImportPrompt } = require('./prompts');\n    const systemPrompt = pluginApi?.settings?.get('system_prompt', DEFAULT_SYSTEM_PROMPT);\n    const createNewDoc = pluginApi?.settings?.get('create_new_document', true);\n\n    const nodesToCreate: any[] = [];\n    let idCounter = 1;\n\n    const docTitle = files.length === 1 ? "Импорт: " + files[0].name : \`Пакетный импорт (\${files.length})\`;\n    \n    if (createNewDoc) {\n       nodesToCreate.push({ id: 'imported-root', content: docTitle, parentId: null });\n    }\n\n    for (let i = 0; i < files.length; i++) {\n        const file = files[i];\n        const text = await file.text();\n        pluginApi?.updateJobProgress?.(jobId, Math.round((i / files.length) * 100), \`Обработка (\${i+1}/\${files.length}): \${file.name}\`);\n\n        const prompt = buildSmartImportPrompt({\n          systemPrompt,\n          detailLevel,\n          maxDepth,\n          customPrompt,\n          text\n        });`
);
fs.writeFileSync('src/plugins/smart-import/index.tsx', code);
