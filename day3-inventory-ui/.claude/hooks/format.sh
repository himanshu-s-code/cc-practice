#!/usr/bin/env bash
# PostToolUse hook (matcher: Edit|Write|MultiEdit). Best-effort prettier on the touched file.

set -u

payload="$(cat)"
file="$(printf '%s' "$payload" | grep -oE '"file_path"\s*:\s*"[^"]*"' | head -n1 | sed -E 's/.*"file_path"\s*:\s*"([^"]*)".*/\1/')"

if [[ -z "$file" ]]; then
  exit 0
fi

case "$file" in
  *.ts|*.tsx|*.js|*.jsx|*.json|*.md|*.css)
    npx --no-install prettier --write "$file" >/dev/null 2>&1 || true
    ;;
esac

exit 0
