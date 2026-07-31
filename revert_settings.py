import glob

def fix_file(filepath):
    try:
        with open(filepath, 'r') as f:
            content = f.read()

        original = content
        
        content = content.replace("Ayarlar", "Settings")

        if original != content:
            with open(filepath, 'w') as f:
                f.write(content)
            print(f"Fixed Settings: {filepath}")
    except Exception as e:
        pass

jsx_files = glob.glob('/Users/mthnay/Projeler/mobile-asp/src/**/*.jsx', recursive=True)
for file in jsx_files:
    fix_file(file)

print("Fix Settings completed.")
