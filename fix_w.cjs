const fs = require('fs');

let content = fs.readFileSync('src/components/WysiwygEditor.tsx', 'utf-8');
content = content.replace(/export const WysiwygEditor = forwardRef<\n  WysiwygEditorHandle,\n  WysiwygEditorProps\n>\(\(\{ initialValue, onChange, onBlur, autoFocus, className, "data-node-id": dataNodeId \}, ref\) => \{/, match => match + '\n  const { t } = useTranslation();');
fs.writeFileSync('src/components/WysiwygEditor.tsx', content);

