#!/usr/bin/env bash
# PostToolUse hook (matcher: Edit|Write|MultiEdit). Async test run.
# Runs vitest in the background so it doesn't block Claude Code.
# Output is appended to .claude/hooks/logs/tests.log.

set -u

LOG_DIR=".claude/hooks/logs"
mkdir -p "$LOG_DIR" 2>/dev/null || exit 0

payload="$(cat)"
file="$(printf '%s' "$payload" | grep -oE '"file_path"\s*:\s*"[^"]*"' | head -n1 | sed -E 's/.*"file_path"\s*:\s*"([^"]*)".*/\1/')"

# Only run for code files; skip docs, configs, etc.
case "$file" in
  *.ts|*.tsx|*.js|*.jsx)
    ;;
  *)
    exit 0
    ;;
esac

# Fire and forget — vitest in background, output to log file.
{
  echo "=== $(date -u +%Y-%m-%dT%H:%M:%SZ) — triggered by $file ==="
  npx --no-install vitest run --reporter=dot 2>&1 | tail -5
  echo
} >> "$LOG_DIR/tests.log" 2>&1 &
disown 2>/dev/null || true

exit 0
