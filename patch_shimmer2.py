import re

with open('src/components/Card.tsx', 'r') as f:
    content = f.read()

content = re.sub(
    r'overflow-hidden p-0\.5 animate-in slide-in-from-top-1 fade-in duration-150',
    'overflow-hidden p-0.5 animate-in slide-in-from-top-1 fade-in duration-150 ![border-radius:var(--card-radius)]',
    content
)

content = re.sub(
    r'border border-app-border rounded-md overflow-hidden p-0\.5',
    'border border-app-border overflow-hidden p-0.5 ![border-radius:var(--card-radius)]',
    content
)

with open('src/components/Card.tsx', 'w') as f:
    f.write(content)

print("done shimmer2")
