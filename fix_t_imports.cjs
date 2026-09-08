const fs = require('fs');

const files = [
  'src/components/Card.tsx',
  'src/components/FloatingCardActions.tsx',
  'src/components/FullScreenModal.tsx',
  'src/components/JobPanel.tsx',
  'src/components/MiniSlider.tsx',
  'src/components/SnapshotPanel.tsx',
  'src/components/ThemeMenu.tsx',
  'src/components/WysiwygEditor.tsx'
];

files.forEach(file => {
  let code = fs.readFileSync(file, 'utf-8');
  
  if (!code.includes('useTranslation')) {
    // Add import
    code = code.replace(/import {?[^}]+}? from ['"]react['"];?/g, match => match + '\nimport { useTranslation } from "react-i18next";');
    if (!code.includes('import { useTranslation }')) {
       // if react wasn't imported or matched
       code = 'import { useTranslation } from "react-i18next";\n' + code;
    }
  }

  // Inject const { t } = useTranslation(); inside the component.
  // We'll find the main component declaration. Usually `export function ComponentName(...) {` or `export const ComponentName = (...) => {`
  
  // Card
  if (file.includes('Card.tsx') && !code.includes('const { t } = useTranslation();')) {
    code = code.replace(/export const Card = React\.memo\(\n  forwardRef<HTMLDivElement, CardProps>\(\(props, ref\) => \{/, match => match + '\n    const { t } = useTranslation();');
  }
  // FloatingCardActions
  if (file.includes('FloatingCardActions.tsx') && !code.includes('const { t } = useTranslation();')) {
    code = code.replace(/export function FloatingCardActions\(\{[\s\S]*?\}\) \{/, match => match + '\n  const { t } = useTranslation();');
  }
  // FullScreenModal
  if (file.includes('FullScreenModal.tsx') && !code.includes('const { t } = useTranslation();')) {
    code = code.replace(/export function FullScreenModal\(\{[\s\S]*?\}\) \{/, match => match + '\n  const { t } = useTranslation();');
  }
  // JobPanel
  if (file.includes('JobPanel.tsx') && !code.includes('const { t } = useTranslation();')) {
    code = code.replace(/export function JobPanel\(\) \{/, match => match + '\n  const { t } = useTranslation();');
  }
  // MiniSlider
  if (file.includes('MiniSlider.tsx') && !code.includes('const { t } = useTranslation();')) {
    code = code.replace(/export function MiniSlider\(\{[\s\S]*?\}\) \{/, match => match + '\n  const { t } = useTranslation();');
  }
  // SnapshotPanel
  if (file.includes('SnapshotPanel.tsx') && !code.includes('const { t } = useTranslation();')) {
    code = code.replace(/export function SnapshotPanel\(\{[\s\S]*?\}\) \{/, match => match + '\n  const { t } = useTranslation();');
  }
  // ThemeMenu
  if (file.includes('ThemeMenu.tsx') && !code.includes('const { t } = useTranslation();')) {
    code = code.replace(/export function ThemeMenu\(\{[\s\S]*?\}\) \{/, match => match + '\n  const { t } = useTranslation();');
  }
  // WysiwygEditor
  if (file.includes('WysiwygEditor.tsx') && !code.includes('const { t } = useTranslation();')) {
    code = code.replace(/export function WysiwygEditor\(\{[\s\S]*?\}\) \{/, match => match + '\n  const { t } = useTranslation();');
  }

  fs.writeFileSync(file, code);
});
console.log("Done");
