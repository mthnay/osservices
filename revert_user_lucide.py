import glob

def fix_file(filepath):
    try:
        with open(filepath, 'r') as f:
            content = f.read()

        original = content
        
        # Revert 'Kullanıcı' back to 'User' for Lucide-react imports and JSX
        content = content.replace(" Kullanıcı,", " User,")
        content = content.replace(", Kullanıcı ", ", User ")
        content = content.replace("{ Kullanıcı ", "{ User ")
        content = content.replace(" Kullanıcı }", " User }")
        
        content = content.replace("<Kullanıcı ", "<User ")
        content = content.replace("<Kullanıcı/>", "<User/>")
        content = content.replace("icon: Kullanıcı,", "icon: User,")
        content = content.replace("icon={Kullanıcı}", "icon={User}")
        
        # Some imports might be ' Kullanıcı }'
        content = content.replace(", Kullanıcı}", ", User}")
        
        # Also let's revert "KullanıcıPlus" back to "UserPlus" if it exists, etc.
        content = content.replace("KullanıcıPlus", "UserPlus")
        content = content.replace("KullanıcıCheck", "UserCheck")
        content = content.replace("KullanıcıMinus", "UserMinus")
        content = content.replace("KullanıcıCog", "UserCog")
        content = content.replace("KullanıcıX", "UserX")

        if original != content:
            with open(filepath, 'w') as f:
                f.write(content)
            print(f"Fixed User component: {filepath}")
    except Exception as e:
        pass

jsx_files = glob.glob('/Users/mthnay/Projeler/mobile-asp/src/**/*.jsx', recursive=True)
for file in jsx_files:
    fix_file(file)

print("Fix User component completed.")
