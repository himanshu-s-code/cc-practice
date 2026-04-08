#!/bin/bash

SCRIPT_DIR="$(dirname "$0")"
HN_TOP10="$SCRIPT_DIR/hn-top10.sh"
HN_SUMMARY="$SCRIPT_DIR/hn-summary.sh"

PASS=0
FAIL=0

pass() { echo "  [PASS] $1"; PASS=$((PASS + 1)); }
fail() { echo "  [FAIL] $1"; FAIL=$((FAIL + 1)); }

run_section() { echo ""; echo "=== $1 ==="; }

# ---------------------------------------------------------------------------
# hn-top10.sh — help flag
# ---------------------------------------------------------------------------
run_section "hn-top10.sh: help flag"

output=$(bash "$HN_TOP10" --help 2>&1)
if echo "$output" | grep -q "Usage:"; then pass "--help prints Usage"; else fail "--help prints Usage"; fi
if echo "$output" | grep -q "\-h"; then pass "--help lists -h flag"; else fail "--help lists -h flag"; fi

output=$(bash "$HN_TOP10" -h 2>&1)
if echo "$output" | grep -q "Usage:"; then pass "-h prints Usage"; else fail "-h prints Usage"; fi

# ---------------------------------------------------------------------------
# hn-top10.sh — output format
# ---------------------------------------------------------------------------
run_section "hn-top10.sh: output format"

echo "  (fetching live data — this may take ~30s)"
top10_output=$(bash "$HN_TOP10" 2>/dev/null)
exit_code=$?

if [ "$exit_code" -eq 0 ]; then pass "exits with code 0"; else fail "exits with code 0 (got $exit_code)"; fi

if echo "$top10_output" | jq empty 2>/dev/null; then
  pass "output is valid JSON"
else
  fail "output is valid JSON"
fi

count=$(echo "$top10_output" | jq 'length' 2>/dev/null)
if [ "$count" -eq 10 ]; then pass "returns exactly 10 articles (got $count)"; else fail "returns exactly 10 articles (got $count)"; fi

# Each article must have id, title, url, score fields
missing_fields=0
for field in id title score; do
  nulls=$(echo "$top10_output" | jq "[.[] | select(.${field} == null)] | length" 2>/dev/null)
  if [ "$nulls" -eq 0 ]; then
    pass "all articles have '$field'"
  else
    fail "some articles missing '$field' ($nulls nulls)"
    missing_fields=$((missing_fields + 1))
  fi
done

# url can be null for Ask HN / Show HN posts — just check the key exists
has_url_key=$(echo "$top10_output" | jq 'all(.[]; has("url"))' 2>/dev/null)
if [ "$has_url_key" == "true" ]; then pass "all articles have 'url' key"; else fail "some articles missing 'url' key"; fi

# id must be a number
bad_ids=$(echo "$top10_output" | jq '[.[] | select(.id | type != "number")] | length' 2>/dev/null)
if [ "$bad_ids" -eq 0 ]; then pass "all 'id' values are numbers"; else fail "'id' is not a number in $bad_ids articles"; fi

# score must be a number
bad_scores=$(echo "$top10_output" | jq '[.[] | select(.score | type != "number")] | length' 2>/dev/null)
if [ "$bad_scores" -eq 0 ]; then pass "all 'score' values are numbers"; else fail "'score' is not a number in $bad_scores articles"; fi

# title must be a non-empty string
bad_titles=$(echo "$top10_output" | jq '[.[] | select(.title | type != "string" or length == 0)] | length' 2>/dev/null)
if [ "$bad_titles" -eq 0 ]; then pass "all 'title' values are non-empty strings"; else fail "bad 'title' in $bad_titles articles"; fi

# output must be a JSON array, not object
is_array=$(echo "$top10_output" | jq 'type == "array"' 2>/dev/null)
if [ "$is_array" == "true" ]; then pass "output is a JSON array"; else fail "output is not a JSON array"; fi

# ---------------------------------------------------------------------------
# hn-top10.sh — error handling (mocked bad URL)
# ---------------------------------------------------------------------------
run_section "hn-top10.sh: error handling (mocked)"

# Patch the script to use an unreachable URL and run it
patched=$(sed 's|https://hacker-news.firebaseio.com/v0/topstories.json|http://127.0.0.1:19999/fail.json|g' "$HN_TOP10")
error_output=$(echo "$patched" | bash 2>&1)
exit_code=$?

if [ "$exit_code" -ne 0 ]; then pass "exits non-zero when top stories URL fails"; else fail "should exit non-zero when top stories URL fails"; fi
if echo "$error_output" | grep -qi "error\|failed\|warning"; then pass "prints error/warning message on failure"; else fail "no error/warning message printed on failure"; fi

# ---------------------------------------------------------------------------
# hn-summary.sh — help flag
# ---------------------------------------------------------------------------
run_section "hn-summary.sh: help flag"

output=$(bash "$HN_SUMMARY" --help 2>&1)
if echo "$output" | grep -q "Usage:"; then pass "--help prints Usage"; else fail "--help prints Usage"; fi
if echo "$output" | grep -q "summary.md"; then pass "--help mentions redirect example"; else fail "--help mentions redirect example"; fi

output=$(bash "$HN_SUMMARY" -h 2>&1)
if echo "$output" | grep -q "Usage:"; then pass "-h prints Usage"; else fail "-h prints Usage"; fi

# ---------------------------------------------------------------------------
# hn-summary.sh — output format (mocked hn-top10.sh + mocked claude)
# ---------------------------------------------------------------------------
run_section "hn-summary.sh: output format (mocked)"

today=$(date +"%Y-%m-%d")
TMP_DIR=$(mktemp -d)

# Fake hn-top10.sh — returns one article without hitting the network
cat > "$TMP_DIR/hn-top10.sh" <<'EOF'
#!/bin/bash
echo '[{"id":1,"title":"Test Article","url":"https://example.com","score":100}]'
EOF

# Fake claude — captures the prompt sent via stdin, then emits a predictable
# Markdown response so we can assert on both the prompt and the output
cat > "$TMP_DIR/claude" <<EOF
#!/bin/bash
cat > "$TMP_DIR/claude_stdin.txt"
echo "# HN Summary $today"
echo ""
echo "- [Test Article](https://example.com) — テスト記事"
EOF

chmod +x "$TMP_DIR/hn-top10.sh" "$TMP_DIR/claude"
cp "$HN_SUMMARY" "$TMP_DIR/hn-summary.sh"

summary_output=$(PATH="$TMP_DIR:$PATH" bash "$TMP_DIR/hn-summary.sh" 2>/dev/null)

# Output checks
if [ -n "$summary_output" ]; then pass "produces non-empty output"; else fail "produced empty output"; fi
if echo "$summary_output" | grep -q "$today"; then pass "output contains today's date ($today)"; else fail "output does not contain today's date ($today)"; fi
if echo "$summary_output" | grep -q "#"; then pass "output contains Markdown header (#)"; else fail "output missing Markdown header (#)"; fi

# Prompt checks — verify what was sent to claude
if [ -f "$TMP_DIR/claude_stdin.txt" ]; then
  pass "claude was invoked"
  if grep -q "$today" "$TMP_DIR/claude_stdin.txt"; then pass "prompt contains today's date"; else fail "prompt missing today's date"; fi
  if grep -q "Test Article" "$TMP_DIR/claude_stdin.txt"; then pass "prompt contains article data"; else fail "prompt missing article data"; fi
else
  fail "claude was not invoked"
fi

rm -rf "$TMP_DIR"

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "================================"
echo "Results: $PASS passed, $FAIL failed"
echo "================================"
if [ "$FAIL" -eq 0 ]; then exit 0; else exit 1; fi
