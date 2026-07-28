import re

with open('src/hooks/usePreferences.ts', 'r') as f:
    content = f.read()

content = re.sub(
    r'const savedCardRadius = savedCardRadiusStr !== null \? Number\(savedCardRadiusStr\) : 0\.25;',
    'const savedCardRadiusStr = safeLocalStorage.getItem("puu_cardRadiusV1");\n    const savedCardRadius = savedCardRadiusStr !== null ? Number(savedCardRadiusStr) : 0.25;',
    content
)

with open('src/hooks/usePreferences.ts', 'w') as f:
    f.write(content)

print("done fix_useprefs2")
