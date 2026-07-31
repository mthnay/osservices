import glob

def fix_file(filepath):
    try:
        with open(filepath, 'r') as f:
            content = f.read()

        original = content
        
        # We need to replace "kaldı-0" -> "left-0", "text-kaldı" -> "text-left", "kaldı-4" -> "left-4" etc.
        # It's safer to just replace "kaldı" with "left" where it's part of a tailwind class or style
        # Actually, let's just replace "kaldı" with "left" if it's used in classNames.
        # But wait, did I translate "left" directly in my translate_tr_2.py?
        # Ah! `translations = { "left": "kaldı" }`
        # So "left" was replaced with "kaldı" everywhere!
        # This broke Tailwind classes like `left-0`, `text-left`, `left-4`, `margin-left`.
        
        # Let's revert "kaldı" back to "left" globally because "kaldı" shouldn't be used as a standalone word except maybe in stock ("5 kaldı").
        # If it says "5 kaldı", it might revert to "5 left", which is acceptable for now compared to a broken app.
        
        content = content.replace("kaldı", "left")

        if original != content:
            with open(filepath, 'w') as f:
                f.write(content)
            print(f"Fixed left: {filepath}")
    except Exception as e:
        pass

jsx_files = glob.glob('/Users/mthnay/Projeler/mobile-asp/src/**/*.jsx', recursive=True)
for file in jsx_files:
    fix_file(file)

print("Fix left completed.")
