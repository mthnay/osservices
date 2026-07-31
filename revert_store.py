import glob

def fix_file(filepath):
    try:
        with open(filepath, 'r') as f:
            content = f.read()

        original = content
        
        # Revert 'Mağaza' back to 'Store' where it's used as a component or import.
        # It's safer to just revert the component usage and imports.
        # Lucide-react imports:
        content = content.replace(" Mağaza,", " Store,")
        content = content.replace(", Mağaza ", ", Store ")
        content = content.replace("{ Mağaza ", "{ Store ")
        content = content.replace(" Mağaza }", " Store }")
        # JSX usage:
        content = content.replace("<Mağaza ", "<Store ")
        content = content.replace("<Mağaza/>", "<Store/>")
        content = content.replace("icon: Mağaza,", "icon: Store,")
        content = content.replace("icon={Mağaza}", "icon={Store}")

        if original != content:
            with open(filepath, 'w') as f:
                f.write(content)
            print(f"Fixed Store: {filepath}")
    except Exception as e:
        pass

jsx_files = glob.glob('/Users/mthnay/Projeler/mobile-asp/src/**/*.jsx', recursive=True)
for file in jsx_files:
    fix_file(file)

print("Fix Store completed.")
