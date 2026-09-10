const fs = require('fs');

function insertT(filePath, pattern) {
  let content = fs.readFileSync(filePath, 'utf-8');
  if (!content.includes('const { t } = useTranslation()')) {
    content = content.replace(pattern, match => match + '\n  const { t } = useTranslation();');
    fs.writeFileSync(filePath, content);
  }
}

insertT('src/components/FullScreenModal.tsx', /export const FullScreenModal = \(\{\s*nodeId,\s*onClose,\s*\}\s*:\s*\{\s*nodeId:\s*string;\s*onClose:\s*\(\)\s*=>\s*void;\s*\}\) => \{/);
insertT('src/components/SnapshotPanel.tsx', /export const SnapshotPanel = \(\{ onClose \}: SnapshotPanelProps\) => \{/);
insertT('src/components/WysiwygEditor.tsx', /export const WysiwygEditor = forwardRef<\s*WysiwygEditorHandle,\s*WysiwygEditorProps\s*>\(\(\{\s*initialContent,\s*onChange,\s*onBlur,\s*minHeight,\s*placeholder,\s*className,\s*autoFocus = false,\s*\}\s*,\s*ref\s*\) => \{/);
