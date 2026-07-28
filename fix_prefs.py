import re

with open('src/hooks/usePreferences.ts', 'r') as f:
    content = f.read()

# Add savedCardRadiusStr before savedThemeTuningStr
content = re.sub(
    r'const savedThemeTuningStr =',
    'const savedCardRadiusStr = safeLocalStorage.getItem("puu_cardRadiusV1");\n    const savedThemeTuningStr =',
    content
)

# Parse savedCardRadius
content = re.sub(
    r'const savedThemeTuning =',
    'const savedCardRadius = savedCardRadiusStr !== null ? Number(savedCardRadiusStr) : 0.25;\n    const savedThemeTuning =',
    content
)

with open('src/hooks/usePreferences.ts', 'w') as f:
    f.write(content)

print("done fix_prefs")
