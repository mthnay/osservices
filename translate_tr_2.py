import glob

translations = {
    "Critical Repairs": "Kritik Onarımlar",
    "Other Active Repairs": "Diğer Aktif İşlemler",
    "Date:": "Tarih:",
    "ID:": "ID:",
    "Total Pending": "Toplam Bekleyen",
    "left": "kaldı"
}

def translate_file(filepath):
    try:
        with open(filepath, 'r') as f:
            content = f.read()

        original = content
        for eng, tr in translations.items():
            content = content.replace(f"{eng}", f"{tr}")

        if original != content:
            with open(filepath, 'w') as f:
                f.write(content)
            print(f"Translated further: {filepath}")
    except Exception as e:
        print(f"Error processing {filepath}: {e}")

jsx_files = glob.glob('/Users/mthnay/Projeler/mobile-asp/src/**/*.jsx', recursive=True)
for file in jsx_files:
    translate_file(file)

print("Translation completed.")
