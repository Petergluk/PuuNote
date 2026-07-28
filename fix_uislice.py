import re

with open('src/store/slices/uiSlice.ts', 'r') as f:
    content = f.read()

content = re.sub(
    r'\},(\n\s*setCardRadius:)',
    '},\\1',
    content
)

# wait, line 258 `s.inactiveCardDim === inactiveCardDim ? s : { inactiveCardDim },`
# line 259 `    setCardRadius: (cardRadius) =>`
# wait, there's a missing `),` after `setInactiveCardDim` !!
content = re.sub(
    r'(s\.inactiveCardDim === inactiveCardDim \? s : \{ inactiveCardDim \},)(\n\s*setCardRadius:)',
    '\\1\n    ),\\2',
    content
)

with open('src/store/slices/uiSlice.ts', 'w') as f:
    f.write(content)

print("done fix_uislice")
