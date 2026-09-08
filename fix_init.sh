sed -i 's/let savedDocs: PuuDocument\[\] = \[\];/let savedDocs: PuuDocument[] = [];\n      let isFirstTime = false;/g' src/hooks/useFileSystemInit.ts
sed -i 's/savedDocs = \[/isFirstTime = true;\n        savedDocs = \[/g' src/hooks/useFileSystemInit.ts
