const fs = require('fs');

const files = [
  'src/components/MobileMenu.tsx',
  'src/components/FullScreenModal.tsx',
  'src/components/SettingsPanel.tsx',
  'src/components/Footer.tsx',
  'src/components/SnapshotPanel.tsx',
  'src/components/FindReplaceModal.tsx',
  'src/components/CommandPalette.tsx',
  'src/components/ImportMenu.tsx',
  'src/components/FloatingCardActions.tsx',
  'src/components/BranchColorMenu.tsx',
  'src/components/FileMenu.tsx',
  'src/components/PluginsPanel.tsx',
  'src/components/ThemeMenu.tsx',
  'src/components/ShortcutsModal.tsx',
  'src/components/WysiwygEditor.tsx',
  'src/components/ConfirmDialog.tsx',
  'src/components/JobPanel.tsx',
  'src/components/Header.tsx',
  'src/components/Card.tsx',
  'src/components/TutorialModal.tsx',
  'src/components/TimelineView.tsx',
  'src/components/MiniSlider.tsx',
  'src/hooks/useAppCommands.ts'
];

files.forEach(file => {
  let code = fs.readFileSync(file, 'utf-8');
  let lines = code.split('\n');
  let newLines = [];
  let found = false;
  for (let line of lines) {
    if (line.includes('import { useTranslation } from "react-i18next";')) {
      if (found) continue;
      found = true;
    }
    newLines.push(line);
  }
  fs.writeFileSync(file, newLines.join('\n'));
});
