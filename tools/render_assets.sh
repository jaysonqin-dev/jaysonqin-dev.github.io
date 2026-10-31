#!/usr/bin/env bash
# Renders og.png (1200x630) and apple-touch-icon.png (180x180) with headless Chrome.
#   bash tools/render_assets.sh
set -euo pipefail
cd "$(dirname "$0")/.."
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
PORT="${PORT:-8781}"
python3 -m http.server "$PORT" --bind 127.0.0.1 >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null' EXIT
sleep 1
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --window-size=1200,630 \
  --screenshot=assets/img/og.png "http://127.0.0.1:$PORT/tools/og.html" >/dev/null 2>&1
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --window-size=500,500 \
  --screenshot=/tmp/touch-big.png "http://127.0.0.1:$PORT/tools/touch.html" >/dev/null 2>&1
python3 - <<'PY'
from PIL import Image
Image.open("/tmp/touch-big.png").crop((0, 0, 180, 180)).save("assets/img/apple-touch-icon.png")
PY
ls -la assets/img
