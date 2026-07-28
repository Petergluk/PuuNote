import re

with open('src/store/slices/uiSlice.ts', 'r') as f:
    content = f.read()

content = re.sub(
    r's\.cardRadius === cardRadius \? s : \{ cardRadius \},\n\s*\),\n\s*\),',
    's.cardRadius === cardRadius ? s : { cardRadius }\n    ),',
    content
)

with open('src/store/slices/uiSlice.ts', 'w') as f:
    f.write(content)

print("done fix_uislice2")
