import re

with open('src/store/slices/historySlice.ts', 'r') as f:
    content = f.read()
content = re.sub(r'1024 \* 1024 \* 5', '1024 * 1024 * 50', content)
content = re.sub(r'5 MB', '50 MB', content)
with open('src/store/slices/historySlice.ts', 'w') as f:
    f.write(content)
print("done fix limit 3")
