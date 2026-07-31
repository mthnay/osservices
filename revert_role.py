import glob

fixes = {
    "addYetki": "addRole",
    "updateYetki": "updateRole",
    "deleteYetki": "deleteRole",
    "editingYetki": "editingRole",
    "setEditingYetki": "setEditingRole"
}

def fix_file(filepath):
    try:
        with open(filepath, 'r') as f:
            content = f.read()

        original = content
        for wrong, right in fixes.items():
            content = content.replace(wrong, right)

        if original != content:
            with open(filepath, 'w') as f:
                f.write(content)
            print(f"Fixed Role: {filepath}")
    except Exception as e:
        pass

jsx_files = glob.glob('/Users/mthnay/Projeler/mobile-asp/src/**/*.jsx', recursive=True)
for file in jsx_files:
    fix_file(file)

print("Fix Role completed.")
