#!/bin/bash

# Example curl request sending audio2.mp3 to whisper server (whisper.cpp)
# and extracting the transcribed text using jq.
echo "Sending audio to Whisper..."
TRANSCRIPT=$(curl -s http://ai-snow.reindeer-pinecone.ts.net:8081/inference \
  -H "Content-Type: multipart/form-data" \
  -F "file=@audio2.mp3" \
  -F "response_format=json" \
  | python3 -c 'import sys, json; print(json.load(sys.stdin)["text"])')

echo -e "\n--- Transcript Received ---"
echo "$TRANSCRIPT"
echo "---------------------------"
echo

if [ -z "$TRANSCRIPT" ] || [ "$TRANSCRIPT" == "null" ]; then
  echo "Failed to get transcript."
  exit 1
fi

echo -e "Sending transcript to LLM..."

export TRANSCRIPT
PAYLOAD=$(python3 -c '
import os, json

payload = {
  "model": "qwen3.5-122b",
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant that processes dictated work logs. Extract the information using the provided tool."
    },
    {
      "role": "user",
      "content": os.environ.get("TRANSCRIPT", "")
    }
  ],
  "temperature": 0.0,
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "createWorkLogDraft",
        "parameters": {
          "type": "object",
          "properties": {
            "projectId": { "type": "string" },
            "employeeId": { "type": ["string", "null"] },
            "startedAt": { "type": ["string", "null"] },
            "endedAt": { "type": ["string", "null"] },
            "notes": { "type": ["string", "null"] }
          }
        }
      }
    }
  ],
  "tool_choice": {
    "type": "function",
    "function": {"name": "createWorkLogDraft"}
  }
}
print(json.dumps(payload))
')

curl -s https://ai-snow.reindeer-pinecone.ts.net:9292/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  | python3 -c '
import sys, json
try:
    raw_data = sys.stdin.read()
    resp = json.loads(raw_data)
    
    if "choices" in resp:
        print("\n--- Raw LLM Response ---", file=sys.stderr)
        print(json.dumps(resp, indent=2), file=sys.stderr)
        print("------------------------\n", file=sys.stderr)
        
        arguments = resp["choices"][0]["message"]["tool_calls"][0]["function"]["arguments"]
        print("\n--- Parsed Tool Arguments ---", file=sys.stderr)
        print(arguments)
    else:
        print("Error: LLM response did not contain \"choices\". Raw response:", file=sys.stderr)
        print(json.dumps(resp, indent=2), file=sys.stderr)
except Exception as e:
    print("Error parsing LLM response:", e, file=sys.stderr)
    print("Raw output was:", raw_data, file=sys.stderr)
'
