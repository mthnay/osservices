import os

search_terms = ["ServiceFormPrint", "DeliveryFormPrint"]
workspace = "/Users/mthnay/GitHub/osservices/src"

for root, dirs, files in os.walk(workspace):
    for file in files:
        if file.endswith((".js", ".jsx", ".ts", ".tsx")):
            path = os.path.join(root, file)
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    for term in search_terms:
                        if term in content:
                            print(f"Match for {term} in {path}")
            except Exception as e:
                pass
