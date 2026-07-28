import re

with open('src/components/ThemeTuneMenu.tsx', 'r') as f:
    content = f.read()

content = re.sub(r'const inactiveCardDim = useAppStore\(\(s\) => s\.inactiveCardDim\);',
                 'const inactiveCardDim = useAppStore((s) => s.inactiveCardDim);\n  const cardRadius = useAppStore((s) => s.cardRadius);\n  const setCardRadius = useAppStore((s) => s.setCardRadius);', content)

content = re.sub(
    r'<MiniSlider\n\s*label="Неактивные"',
    '<MiniSlider\n            label="Скругление"\n            min={0}\n            max={100}\n            value={cardRadius * 100}\n            fillStyle={{\n              borderRadius: `${cardRadius * 100}px`\n            }}\n            onChange={(value) => setCardRadius(clamp(value, 0, 100, 1) / 100)}\n          />\n          <MiniSlider\n            label="Неактивные"',
    content
)

content = re.sub(r'inactiveCardDim,', 'inactiveCardDim,\n            cardRadius,', content)

with open('src/components/ThemeTuneMenu.tsx', 'w') as f:
    f.write(content)

print("done themetune")
