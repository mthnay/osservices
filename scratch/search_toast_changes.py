import json

transcript_path = "/Users/mthnay/.gemini/antigravity/brain/73b4d164-9628-4a1e-b994-61d1c3546782/.system_generated/logs/transcript.jsonl"

with open(transcript_path, "r", encoding="utf-8") as f:
    for i, line in enumerate(f):
        if "Toast.jsx" in line:
            try:
                data = json.loads(line)
                tc_list = data.get("tool_calls", [])
                for tc in tc_list:
                    name = tc.get("name")
                    if "replace" in name or "write" in name or "view" in name:
                        args = tc.get("args", {})
                        print(f"Line {i} - Tool: {name}")
                        print(f"TargetFile: {args.get('TargetFile') or args.get('AbsolutePath')}")
                        if "ReplacementContent" in args:
                            print("ReplacementContent:", args.get("ReplacementContent"))
                        if "ReplacementChunks" in args:
                            for ch in args["ReplacementChunks"]:
                                print("Chunk Target:", ch.get("TargetContent"))
                                print("Chunk Replace:", ch.get("ReplacementContent"))
                        if "CodeContent" in args:
                            print("CodeContent length:", len(args["CodeContent"]))
            except Exception as e:
                pass
