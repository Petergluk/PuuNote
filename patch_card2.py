import re

with open('src/components/Card.tsx', 'r') as f:
    content = f.read()

# I want to add `style={{ borderRadius: "var(--card-radius)" }}` to the main div
# which starts around `return (\n    <div`
content = re.sub(
    r'(return \(\n\s*<div\n\s*id=\{`node-\$\{node\.id\}`\}\n\s*draggable)',
    'return (\n      <div\n        style={{ borderRadius: "calc(var(--card-radius) * 1rem)" }}\n        id={`node-${node.id}`}\n        draggable',
    content
)

# Replace all occurrences of `rounded-md`, `rounded-sm` with `rounded-[length:calc(var(--card-radius)*1rem)]` in Card.tsx ? No, only the card's own borders. The shimmer and the selection box should match the card radius.
# the main div is what we added style to.
# Let's fix the css variable in `App.tsx` first. I used `cardRadius}rem`. I'll just change it in Card.tsx:
content = re.sub(
    r'style=\{\{ borderRadius: "calc\(var\(--card-radius\) \* 1rem\)" \}\}',
    'style={{ borderRadius: "var(--card-radius)" }}',
    content
)

with open('src/components/Card.tsx', 'w') as f:
    f.write(content)

print("done card2")
