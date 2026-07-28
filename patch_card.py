import re

with open('src/components/Card.tsx', 'r') as f:
    content = f.read()

# find the main card div style
content = re.sub(
    r'<div\n\s*className=\{\n\s*`flex group/card-wrapper relative \$',
    '<div\n          style={{ borderRadius: "var(--card-radius)" }}\n          className={\n            `flex group/card-wrapper relative $',
    content
)

# wait, line 294 is `rounded` which is in `clsx` maybe? Let's remove `rounded` from line 294
content = re.sub(
    r'"relative w-full shrink-0 px-4 py-3 rounded cursor-text min-h-\[40px\] flex flex-col",',
    '"relative w-full shrink-0 px-4 py-3 cursor-text min-h-[40px] flex flex-col",',
    content
)

# wait, line 480 `overflow-hidden rounded pointer-events-none` -> `overflow-hidden pointer-events-none`
# with style? If it's absolute inset-0 it will just fill the parent, but wait, if it's the shimmer, it needs borderRadius too
content = re.sub(
    r'overflow-hidden rounded pointer-events-none',
    'overflow-hidden pointer-events-none',
    content
)

with open('src/components/Card.tsx', 'w') as f:
    f.write(content)

print("done card")
