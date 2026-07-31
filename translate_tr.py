import os
import glob
import re

translations = {
    # Dashboard
    "Overview": "Genel Bakış",
    "Welcome back": "Tekrar Hoş Geldiniz",
    "Pending Repairs": "Bekleyen İşlemler",
    "Total Revenue": "Toplam Gelir",
    "Tech Utilization": "Teknisyen Doluluğu",
    "Critical SLA": "Kritik Süreçler",
    "Store Performance": "Mağaza Performansı",
    "Store Operations Schema": "Mağaza Operasyon Şeması",
    "Device Distribution": "Cihaz Dağılımı",
    "Low Stock Alerts": "Düşük Stok Uyarıları",
    "Total Pending": "Toplam Bekleyen",
    "Critical Time": "Kritik Süre",
    "Critical Repairs": "Kritik Onarımlar",
    "Other Active Repairs": "Diğer Aktif İşlemler",
    "No other active repairs.": "Başka aktif işlem bulunmuyor.",
    "All stock levels are optimal.": "Tüm stok seviyeleri ideal durumda.",
    "No sufficient data.": "Yeterli veri bulunamadı.",
    "Total": "Toplam",
    "Active": "Aktif",
    "Breach": "Aşım",
    "Store": "Mağaza",
    "Ship-To": "Ship-To",
    "Volume": "Hacim",
    "Success Rate": "Başarı Oranı",
    "Revenue": "Ciro",
    "Pending": "Bekliyor",
    "Critical": "Kritik",
    "In Progress": "İşlemde",

    # App / General
    "Page Under Construction": "Sayfa Yapım Aşamasında",
    "This module has not been activated yet.": "Bu modül henüz aktifleştirilmedi.",
    
    # Common Buttons / Inputs
    "Search repairs, customers...": "Kayıt, müşteri ara...",
    "Logout": "Çıkış Yap",
    "User": "Kullanıcı",
    "Role": "Yetki",

    # Login
    "Sign In": "Giriş Yap",
    "Username": "Kullanıcı Adı",
    "Password": "Şifre",

    # Settings
    "Settings": "Ayarlar"
}

def translate_file(filepath):
    try:
        with open(filepath, 'r') as f:
            content = f.read()

        original = content
        for eng, tr in translations.items():
            # Use basic string replace to avoid regex complexity, but only for exact matches.
            # We don't want to replace code variables.
            # So we only replace strings that are wrapped in specific ways or just direct matches if they are mostly UI text.
            # Many UI texts are inside HTML tags: >Text< or "Text" or 'Text'
            
            content = content.replace(f">{eng}<", f">{tr}<")
            content = content.replace(f'"{eng}"', f'"{tr}"')
            content = content.replace(f"'{eng}'", f"'{tr}'")
            # Also replace with trailing space or newline if needed
            content = content.replace(f">{eng} ", f">{tr} ")
            content = content.replace(f"{eng},", f"{tr},")
            content = content.replace(f"title=\"{eng}\"", f"title=\"{tr}\"")
            content = content.replace(f"placeholder=\"{eng}\"", f"placeholder=\"{tr}\"")
            content = content.replace(f"title=\"{eng}", f"title=\"{tr}")
            content = content.replace(f"value=\"{eng}\"", f"value=\"{tr}\"")

        if original != content:
            with open(filepath, 'w') as f:
                f.write(content)
            print(f"Translated: {filepath}")
    except Exception as e:
        print(f"Error processing {filepath}: {e}")

# Process all .jsx files
jsx_files = glob.glob('/Users/mthnay/Projeler/mobile-asp/src/**/*.jsx', recursive=True)
for file in jsx_files:
    translate_file(file)

print("Translation completed.")
