#!/usr/bin/env bash
# PreToolUse hook (matcher: Bash). Blocks destructive commands.
# Reads the tool-use JSON from stdin; exits 2 with a stderr message to block.

set -u

payload="$(cat)"
cmd="$(printf '%s' "$payload" | grep -oE '"command"\s*:\s*"[^"]*"' | head -n1 | sed -E 's/.*"command"\s*:\s*"([^"]*)".*/\1/')"

if [[ -z "$cmd" ]]; then
  exit 0
fi

# Block "rm -rf" in any spacing variation.
if echo "$cmd" | grep -Eq '(^|[^[:alnum:]_])rm[[:space:]]+(-[a-zA-Z]*r[a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r|-rf|-fr)([[:space:]]|$)'; then
  echo "[block-dangerous] refusing 'rm -rf' — too dangerous to run unattended." >&2
  exit 2
fi

# Block any 'git push --force' / '-f' (also --force-with-lease, conservatively).
if echo "$cmd" | grep -Eq 'git[[:space:]]+push.*(--force|--force-with-lease|[[:space:]]-f([[:space:]]|$))'; then
  echo "[block-dangerous] refusing 'git push --force' — would overwrite remote history." >&2
  exit 2
fi

exit 0
