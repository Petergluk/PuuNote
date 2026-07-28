import glob
import re

for file in ['src/components/FloatingCardActions.tsx']:
    with open(file, 'r') as f:
        content = f.read()

    content = re.sub(r'\brounded-md\b', 'rounded-xl', content)
    content = re.sub(r'\brounded\b', 'rounded-xl', content)
    content = re.sub(r'rounded-xl-xl', 'rounded-xl', content)

    with open(file, 'w') as f:
        f.write(content)

print("done fix_buttons")
