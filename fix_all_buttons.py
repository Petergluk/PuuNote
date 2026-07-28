import glob
import re

for file in glob.glob('src/components/**/*.tsx', recursive=True):
    with open(file, 'r') as f:
        content = f.read()

    # Don't touch Card.tsx because we just fixed it using cardRadius, and rounded-md there was maybe used for something else? Actually we removed it there.
    if 'Card.tsx' in file:
        continue

    content = re.sub(r'\brounded-md\b', 'rounded-xl', content)
    content = re.sub(r'\brounded-lg\b', 'rounded-xl', content)

    with open(file, 'w') as f:
        f.write(content)

print("done fix_all_buttons")
