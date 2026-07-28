import re

with open('src/hooks/usePreferences.ts', 'r') as f:
    content = f.read()

# Load
content = re.sub(
    r'const savedInactiveCardDimStr =\n\s*safeLocalStorage\.getItem\("puu_inactiveCardDimV2"\);',
    'const savedInactiveCardDimStr =\n        safeLocalStorage.getItem("puu_inactiveCardDimV2");\n      const savedCardRadiusStr =\n        safeLocalStorage.getItem("puu_cardRadiusV1");',
    content
)

content = re.sub(
    r'const savedInactiveCardDim =\n\s*savedInactiveCardDimStr \!== null\n\s*\? Number\(savedInactiveCardDimStr\)\n\s*: DEFAULT_INACTIVE_CARD_DIM;',
    'const savedInactiveCardDim =\n        savedInactiveCardDimStr !== null\n          ? Number(savedInactiveCardDimStr)\n          : DEFAULT_INACTIVE_CARD_DIM;\n      const savedCardRadius =\n        savedCardRadiusStr !== null\n          ? Number(savedCardRadiusStr)\n          : 0.25;',
    content
)

content = re.sub(
    r'inactiveCardDim: savedInactiveCardDim,',
    'inactiveCardDim: savedInactiveCardDim,\n        cardRadius: savedCardRadius,',
    content
)

# Save
content = re.sub(
    r'if \(state\.inactiveCardDim \!== prevState\.inactiveCardDim\) \{',
    'if (state.cardRadius !== prevState.cardRadius) {\n        safeLocalStorage.setItem(\n          "puu_cardRadiusV1",\n          state.cardRadius.toString(),\n        );\n      }\n      if (state.inactiveCardDim !== prevState.inactiveCardDim) {',
    content
)

with open('src/hooks/usePreferences.ts', 'w') as f:
    f.write(content)

print("done prefs")
