import re

with open('src/utils/schema.ts', 'r') as f:
    content = f.read()
content = re.sub(r'5_000_000', '100_000_000', content)
content = re.sub(r'5MB', '100MB', content)
with open('src/utils/schema.ts', 'w') as f:
    f.write(content)

with open('src/i18n.ts', 'r') as f:
    content = f.read()
content = re.sub(r'5MB', '100MB', content)
with open('src/i18n.ts', 'w') as f:
    f.write(content)

print("done fix limit 2")
