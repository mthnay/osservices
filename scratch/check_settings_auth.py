with open("/Users/mthnay/GitHub/osservices/server/routes.js", "r", encoding="utf-8") as f:
    lines = f.readlines()
    for idx, line in enumerate(lines):
        if "settings/:key" in line or "/settings" in line:
            print(f"routes.js line {idx+1}: {line.strip()}")
            # Print the next 5 lines
            for i in range(idx, min(len(lines), idx + 8)):
                print(f"  {i+1}: {lines[i].strip()}")
