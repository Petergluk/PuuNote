import re

with open('src/components/MiniSlider.tsx', 'r') as f:
    content = f.read()

# Replace clamp function
content = re.sub(r'const clamp = \(value: number, min: number, max: number\) =>\n  Math\.max\(min, Math\.min\(max, Math\.round\(value\)\)\);',
                 'const clamp = (value: number, min: number, max: number, step = 1) => {\n  const rounded = Math.round(value / step) * step;\n  return Math.max(min, Math.min(max, Number(rounded.toFixed(5))));\n};', content)

# update usage of clamp
content = re.sub(r'clamp\(value, min, max\)', 'clamp(value, min, max, step)', content)
content = re.sub(r'clamp\(nextValue, min, max\)', 'clamp(nextValue, min, max, step)', content)

with open('src/components/MiniSlider.tsx', 'w') as f:
    f.write(content)

print("done")
