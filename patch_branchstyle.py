import re

with open('src/components/Card.tsx', 'r') as f:
    content = f.read()

content = re.sub(
    r'(\"--branch-gradient-end-mix\": `\$\{\n\s*branchColor\.settings\.gradient \* 0\.1\n\s*\}%`,\n\s*\})',
    '\\1, borderRadius: "var(--card-radius)"',
    content
)

content = re.sub(
    r'(: \{ "--uncolored-border-mix": tone \})',
    ': { "--uncolored-border-mix": tone, borderRadius: "var(--card-radius)" }',
    content
)

content = re.sub(
    r'("relative w-full shrink-0 px-4 py-3 cursor-text min-h-\[40px\] flex flex-col",)',
    '"relative w-full shrink-0 px-4 py-3 cursor-text min-h-[40px] flex flex-col",\n            "![border-radius:var(--card-radius)]",',
    content
)

# wait, if I add `![border-radius:var(--card-radius)]` into className, it will just work! I don't need to patch branchStyle.
with open('src/components/Card.tsx', 'w') as f:
    f.write(content)

print("done branchstyle")
