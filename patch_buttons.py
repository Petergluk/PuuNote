import re
import glob

# replace rounded and rounded-lg with rounded-xl in Header.tsx
with open('src/components/Header.tsx', 'r') as f:
    content = f.read()

content = re.sub(r'\brounded-lg\b', 'rounded-xl', content)
content = re.sub(r'\brounded\b', 'rounded-xl', content)

with open('src/components/Header.tsx', 'w') as f:
    f.write(content)

# ThemeTuneMenu.tsx
with open('src/components/ThemeTuneMenu.tsx', 'r') as f:
    content = f.read()

content = re.sub(r'w-8 h-8 rounded ', 'w-8 h-8 rounded-xl ', content)
with open('src/components/ThemeTuneMenu.tsx', 'w') as f:
    f.write(content)

print("done")
