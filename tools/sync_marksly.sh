#!/usr/bin/env bash
# Refreshes lab/marksly (the in-browser demo) from the Marksly extension source.
# The demo runs the same files as the extension; only the manifest, service worker and tests are left out.
#   bash tools/sync_marksly.sh [path/to/bookmark-organizer]
set -euo pipefail
cd "$(dirname "$0")/.."
SRC="${1:-../bookmark-organizer}/extension"
[ -d "$SRC" ] || { echo "not found: $SRC" >&2; exit 1; }
mkdir -p lab/marksly
rsync -a --delete --exclude 'tests' --exclude 'manifest.json' --exclude 'background.js' --exclude 'icons/icon.svg' "$SRC"/ lab/marksly/
python3 tools/check_site.py
