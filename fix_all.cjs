const fs = require('fs');

function inject(file, pattern, replacement) {
  let content = fs.readFileSync(file, 'utf-8');
  if (!content.includes('const { t } = useTranslation()')) {
    content = content.replace(pattern, replacement);
    fs.writeFileSync(file, content);
  }
}

inject('src/components/Card.tsx', 
  /export const Card = React.memo\(\s*\(\{\s*node,\s*isInPath,\s*isDescendantFromActive,\s*branchColor,\s*\}\s*:\s*\{\s*node:\s*PuuNode;\s*isInPath:\s*boolean;\s*isDescendantFromActive:\s*boolean;\s*branchColor:\s*BranchColor\s*\|\s*null;\s*\}\) => \{/,
  match => match + '\n  const { t } = useTranslation();'
);

inject('src/components/FloatingCardActions.tsx',
  /export function FloatingCardActions\(\) \{/,
  match => match + '\n  const { t } = useTranslation();'
);

inject('src/components/FullScreenModal.tsx',
  /export function FullScreenModal\(\) \{/,
  match => match + '\n  const { t } = useTranslation();'
);

inject('src/components/JobPanel.tsx',
  /export function JobPanel\(\) \{/,
  match => match + '\n  const { t } = useTranslation();'
);

inject('src/components/MiniSlider.tsx',
  /export function MiniSlider\(\{([^}]+)\}: MiniSliderProps\) \{/,
  match => match + '\n  const { t } = useTranslation();'
);

inject('src/components/SnapshotPanel.tsx',
  /export function SnapshotPanel\(\) \{/,
  match => match + '\n  const { t } = useTranslation();'
);

inject('src/components/ThemeMenu.tsx',
  /export function ThemeMenu\(\) \{/,
  match => match + '\n  const { t } = useTranslation();'
);

inject('src/components/WysiwygEditor.tsx',
  /export function WysiwygEditor\(\{([^}]+)\}: WysiwygEditorProps\) \{/,
  match => match + '\n  const { t } = useTranslation();'
);

