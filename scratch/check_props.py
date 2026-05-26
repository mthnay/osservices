import os
import re

files_to_check = [
    "/Users/mthnay/GitHub/osservices/src/components/ServiceAcceptance.jsx",
    "/Users/mthnay/GitHub/osservices/src/components/BatchExportModal.jsx",
    "/Users/mthnay/GitHub/osservices/src/components/RepairHistoryModal.jsx",
    "/Users/mthnay/GitHub/osservices/src/components/ReadyForPickup.jsx"
]

for path in files_to_check:
    print(f"=== {os.path.basename(path)} ===")
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
        # Find occurrences of ServiceFormPrint or DeliveryFormPrint tags
        for match in re.finditer(r'<(?:ServiceFormPrint|DeliveryFormPrint)\b[^>]*>', content):
            print(match.group(0))
