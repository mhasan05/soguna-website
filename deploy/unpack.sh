#!/usr/bin/env bash
# Called by pack.ps1 on the server: replaces the code in DEST with the freshly
# uploaded copy, keeping server-only things (venv, node_modules, builds, settings,
# uploads in data/), then runs the deploy.  Usage: bash unpack.sh /home/digihealth/soguna
set -Eeuo pipefail
SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="${1:?destination folder}"
[[ "$SRC" != "$DEST" ]] || { echo "SRC and DEST are the same"; exit 1; }
mkdir -p "$DEST"
for d in backend frontend deploy; do
  mkdir -p "$DEST/$d"
  find "$DEST/$d" -mindepth 1 -maxdepth 1 \
    ! -name .venv ! -name node_modules ! -name .next ! -name .env ! -name .env.production.local ! -name staticfiles \
    -exec rm -rf {} +
  cp -a "$SRC/$d/." "$DEST/$d/"
done
[[ -f "$SRC/README.md" ]] && cp "$SRC/README.md" "$DEST/"
rm -rf "$SRC"
cd "$DEST"
exec bash deploy/deploy.sh
