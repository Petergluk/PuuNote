import re

with open('src/store/slices/uiSlice.ts', 'r') as f:
    content = f.read()

content = re.sub(r'const DEFAULT_INACTIVE_CARD_DIM = -25;', 'const DEFAULT_INACTIVE_CARD_DIM = -25;\nconst DEFAULT_CARD_RADIUS = 0.25;', content)
content = re.sub(r'inactiveCardDim: DEFAULT_INACTIVE_CARD_DIM,', 'inactiveCardDim: DEFAULT_INACTIVE_CARD_DIM,\n  cardRadius: DEFAULT_CARD_RADIUS,', content)
content = re.sub(r'setInactiveCardDim:(.*?)},', 'setInactiveCardDim:\\1},\n  setCardRadius: (cardRadius) =>\n    set((s) =>\n      s.cardRadius === cardRadius ? s : { cardRadius },\n    ),', content, flags=re.DOTALL)
content = re.sub(r'inactiveCardDim: DEFAULT_INACTIVE_CARD_DIM,\s*themeTuning:', 'inactiveCardDim: DEFAULT_INACTIVE_CARD_DIM,\n        cardRadius: DEFAULT_CARD_RADIUS,\n        themeTuning:', content)

with open('src/store/slices/uiSlice.ts', 'w') as f:
    f.write(content)

print("done uislice")
