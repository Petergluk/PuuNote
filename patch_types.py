import re

with open('src/store/appStoreTypes.ts', 'r') as f:
    content = f.read()

content = re.sub(r'inactiveCardDim: number;', 'inactiveCardDim: number;\n  cardRadius: number;', content)
content = re.sub(r'setInactiveCardDim: \(dim: number\) => void;', 'setInactiveCardDim: (dim: number) => void;\n  setCardRadius: (radius: number) => void;', content)

with open('src/store/appStoreTypes.ts', 'w') as f:
    f.write(content)

print("done types")
