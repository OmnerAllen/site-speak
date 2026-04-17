#!/bin/bash

# Example curl request sending audio1.mp3 to whisper server (whisper.cpp)
curl http://ai-snow.reindeer-pinecone.ts.net:8081/inference \
  -H "Content-Type: multipart/form-data" \
  -F "file=@audio1.mp3" \
  -F "response_format=json" \
  -F "temperature=0.0"
