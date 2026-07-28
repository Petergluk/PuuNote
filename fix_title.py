import re

with open('src/components/SettingsPanel.tsx', 'r') as f:
    content = f.read()

# Replace <HelpCircle ... title={...} /> with <span title={...}><HelpCircle ... /></span>
def replacer(match):
    attrs = match.group(1)
    title_match = re.search(r'title=\{([^}]+)\}', attrs)
    if title_match:
        title = title_match.group(1)
        attrs_without_title = re.sub(r'\s*title=\{[^}]+\}', '', attrs)
        return f'<span title={{{title}}} className="flex"><HelpCircle {attrs_without_title} /></span>'
    return match.group(0)

content = re.sub(r'<HelpCircle(.*?)\s*/>', replacer, content)

with open('src/components/SettingsPanel.tsx', 'w') as f:
    f.write(content)

print('done')
