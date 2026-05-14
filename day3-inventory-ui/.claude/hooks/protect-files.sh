#!/usr/bin/env bash
# PreToolUse hook (matcher: Edit|Write|MultiEdit). Blocks edits to sensitive files.

set -u

payload="$(cat)"
file="$(printf '%s' "$payload" | grep -oE '"file_path"\s*:\s*"[^"]*"' | head -n1 | sed -E 's/.*"file_path"\s*:\s*"([^"]*)".*/\1/')"

if [[ -z "$file" ]]; then
  exit 0
fi

base="$(basename "$file")"

case "$base" in
  .env|.env.*|package-lock.json)
    echo "[protect-files] refusing edit to '$base' — sensitive/generated; modify by hand or via npm." >&2
    exit 2
    ;;
esac

exit 0
