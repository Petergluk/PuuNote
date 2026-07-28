import re

with open('src/components/Card.tsx', 'r') as f:
    content = f.read()

content = re.sub(
    r'\},\s*borderRadius:\s*"var\(--card-radius\)"\s*as\s*React\.CSSProperties\)',
    '  borderRadius: "var(--card-radius)",\n            } as React.CSSProperties)',
    content
)

with open('src/components/Card.tsx', 'w') as f:
    f.write(content)

print("done fix_card_syntax")
