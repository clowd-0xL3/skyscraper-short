#!/bin/bash
# Renders SkyscraperShort in 124 chunks (fresh browser each, retried), joins them, muxes audio, runs QA.
cd /home/clowd/skyscraper-short
export REMOTION_TMP=/home/clowd/TEMP/remotion-tmp TEMP=/home/clowd/TEMP/remotion-tmp TMP=/home/clowd/TEMP/remotion-tmp TMPDIR=/home/clowd/TEMP/remotion-tmp
mkdir -p out/skyscraper/chunks /home/clowd/TEMP/remotion-tmp
TOTAL=2055
NUM_CHUNKS=124
: > out/skyscraper/chunks/list.txt
for ((i=0; i<NUM_CHUNKS; i++)); do
  a=$(( i * TOTAL / NUM_CHUNKS ))
  b=$(( (i + 1) * TOTAL / NUM_CHUNKS - 1 ))
  f=out/skyscraper/chunks/c_$(printf %04d $a)_$(printf %04d $b).mp4
  echo "file '/home/clowd/skyscraper-short/$f'" >> out/skyscraper/chunks/list.txt
  [ -s "$f" ] && continue
  for try in 1 2 3 4; do
    echo "Rendering chunk $i/$NUM_CHUNKS: frames $a-$b (attempt $try)..."
    npx remotion render src/index.ts SkyscraperShort "$f" --codec h264 --crf 16 --scale 1 --gl=angle \
      --browser-executable=/usr/bin/google-chrome-stable --timeout=600000 --concurrency=1 --frames=$a-$b --muted && break
    rm -f "$f"; rm -rf /home/clowd/TEMP/remotion-tmp/remotion-*
  done
  [ -s "$f" ] || { echo "CHUNK $i ($a-$b) FAILED"; exit 1; }
  rm -rf /home/clowd/TEMP/remotion-tmp/remotion-*
done
ffmpeg -y -f concat -safe 0 -i out/skyscraper/chunks/list.txt -c copy out/skyscraper/video.mp4 || exit 1
ffmpeg -y -i out/skyscraper/video.mp4 -i audio/mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -shortest out/skyscraper/final.mp4 || exit 1
/home/clowd/.faceless-shorts/venv/bin/python scripts/bridge_shots.py
/home/clowd/.faceless-shorts/venv/bin/python scripts/short_qa.py out/skyscraper/final.mp4 out/skyscraper/qa out/skyscraper/shots.json
echo "ALL DONE"
