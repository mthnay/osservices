import json

log_path = "/Users/mthnay/GitHub/osservices/.git"
# Wait, logs are in App Data Directory: /Users/mthnay/.gemini/antigravity/brain/73b4d164-9628-4a1e-b994-61d1c3546782/.system_generated/logs/transcript.jsonl
transcript_path = "/Users/mthnay/.gemini/antigravity/brain/73b4d164-9628-4a1e-b994-61d1c3546782/.system_generated/logs/transcript.jsonl"

try:
    with open(transcript_path, "r", encoding="utf-8") as f:
        lines = f.readlines()
        print(f"Total lines in transcript: {len(lines)}")
        # Let's search for lines containing Toast.jsx or modifications
        for i, line in enumerate(lines):
            if "Toast.jsx" in line:
                try:
                    data = json.loads(line)
                    print(f"Line {i}: Type: {data.get('type')}, Status: {data.get('status')}")
                except Exception as e:
                    pass
except Exception as e:
    print("Error:", e)
