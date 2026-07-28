import re

with open('src/hooks/usePreferences.ts', 'r') as f:
    content = f.read()

content = re.sub(
    r'const savedCardRadiusStr \= safeLocalStorage\.getItem\("puu_cardRadiusV1"\);\s*const savedThemeTuningStr \=',
    'const savedThemeTuningStr =',
    content
)

content = re.sub(
    r'const savedInactiveCardDimStr =\n\s*safeLocalStorage\.getItem\("puu_inactiveCardDimV2"\);',
    'const savedInactiveCardDimStr = safeLocalStorage.getItem("puu_inactiveCardDimV2");\n    const savedCardRadiusStr = safeLocalStorage.getItem("puu_cardRadiusV1");',
    content
)

with open('src/hooks/usePreferences.ts', 'w') as f:
    f.write(content)

print("done fix_useprefs")
