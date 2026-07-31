import json

transcript_path = "/Users/mthnay/.gemini/antigravity/brain/73b4d164-9628-4a1e-b994-61d1c3546782/.system_generated/logs/transcript.jsonl"

with open(transcript_path, "r", encoding="utf-8") as f:
    for i, line in enumerate(f):
        if i == 225:
            data = json.loads(line)
            tc_list = data.get("tool_calls", [])
            for tc in tc_list:
                args = tc.get("args", {})
                if "CodeContent" in args:
                    print(args["CodeContent"])
