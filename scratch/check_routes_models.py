with open("/Users/mthnay/GitHub/osservices/server/routes.js", "r", encoding="utf-8") as f:
    content = f.read()

import re
print("=== Model Imports in routes.js ===")
matches = re.finditer(r'import\s+.*?\s+from\s+[\'"]./models/.*?[\'"]', content)
for m in matches:
    print(m.group(0))

print("\n=== Check if routes.js has database backup/export routes already ===")
if "backup" in content or "export" in content or "restore" in content:
    print("Found backup/export/restore terms")
    # Print the lines containing these terms
    lines = content.split('\n')
    for idx, line in enumerate(lines):
        if any(term in line for term in ["backup", "export", "restore"]):
            print(f"  Line {idx+1}: {line.strip()}")
else:
    print("No backup/export/restore routes found")
