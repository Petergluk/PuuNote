import re

with open('src/components/Header.tsx', 'r') as f:
    content = f.read()

content = re.sub(r'rounded-xl-xl', 'rounded-xl', content)
content = re.sub(r'\brounded-md\b', 'rounded-xl', content)
content = re.sub(r'\brounded-sm\b', 'rounded-xl', content)

with open('src/components/Header.tsx', 'w') as f:
    f.write(content)

print("done fix_header")
