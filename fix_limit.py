import re

with open('src/constants.ts', 'r') as f:
    content = f.read()
content = re.sub(r'5 \* 1024 \* 1024', '100 * 1024 * 1024', content)
with open('src/constants.ts', 'w') as f:
    f.write(content)

with open('src/hooks/useFileImport.ts', 'r') as f:
    content = f.read()
content = re.sub(r'5MB', '100MB', content)
with open('src/hooks/useFileImport.ts', 'w') as f:
    f.write(content)

with open('src/domain/documentService.ts', 'r') as f:
    content = f.read()
content = re.sub(r'5MB', '100MB', content)
with open('src/domain/documentService.ts', 'w') as f:
    f.write(content)

print("done fix limit")
