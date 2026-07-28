import re

with open('src/components/Card.tsx', 'r') as f:
    content = f.read()

content = re.sub(
    r'overflow-hidden pointer-events-none',
    'overflow-hidden pointer-events-none ![border-radius:var(--card-radius)]',
    content
)

with open('src/components/Card.tsx', 'w') as f:
    f.write(content)

print("done shimmer")
