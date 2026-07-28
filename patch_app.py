import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

content = re.sub(
    r'const inactiveCardDim = useAppStore\(\(s\) => s\.inactiveCardDim\);',
    'const inactiveCardDim = useAppStore((s) => s.inactiveCardDim);\n  const cardRadius = useAppStore((s) => s.cardRadius);',
    content
)

content = re.sub(
    r'document\.documentElement\.style\.setProperty\("--inactive-card-opacity", `\$\{inactiveCardOpacity\}`\);',
    'document.documentElement.style.setProperty("--inactive-card-opacity", `${inactiveCardOpacity}`);\n    document.documentElement.style.setProperty("--card-radius", `${cardRadius}rem`);',
    content
)

content = re.sub(
    r'\[colWidth, inactiveCardOpacity\]\)',
    '[colWidth, inactiveCardOpacity, cardRadius])',
    content
)

with open('src/App.tsx', 'w') as f:
    f.write(content)

print("done app")
