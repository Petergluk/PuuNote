import re

with open('src/components/ThemeTuneMenu.tsx', 'r') as f:
    content = f.read()

# ThemeTuneMenu has its own clamp:
# const clamp = (value: number, min: number, max: number) =>
#   Math.max(min, Math.min(max, Math.round(value)));
# Let's remove `clamp` call for cardRadius or just update the signature.
# I used `clamp(value, 0, 100, 1)` - 4 arguments.
content = re.sub(
    r'setCardRadius\(clamp\(value, 0, 100, 1\) / 100\)',
    'setCardRadius(clamp(value, 0, 100) / 100)',
    content
)

with open('src/components/ThemeTuneMenu.tsx', 'w') as f:
    f.write(content)

print("done fix_clamp")
