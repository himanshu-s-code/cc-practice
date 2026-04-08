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
echo "$output" | grep -q "Usage:" && pass "--help prints Usage" || fail "--help prints Usage"
echo "$output" | grep -q "\-h" && pass "--help lists -h flag" || fail "--help lists -h flag"

output=$(bash "$HN_TOP10" -h 2>&1)
echo "$output" | grep -q "Usage:" && pass "-h prints Usage" || fail "-h prints Usage"

# ---------------------------------------------------------------------------
# hn-top10.sh — output format
# ---------------------------------------------------------------------------
run_section "hn-top10.sh: output format"

echo "  (fetching live data — this may take ~30s)"
top10_output=$(bash "$HN_TOP10" 2>/dev/null)
exit_code=$?

[ $exit_code -eq 0 ] && pass "exits with code 0" || fail "exits with code 0 (got $exit_code)"

echo "$top10_output" | jq empty 2>/dev/null
[ $? -eq 0 ] && pass "output is valid JSON" || fail "output is valid JSON"

count=$(echo "$top10_output" | jq 'length' 2>/dev/null)
[ "$count" -eq 10 ] && pass "returns exactly 10 articles (got $count)" || fail "returns exactly 10 articles (got $count)"

# Each article must have id, title, url, score fields
missing_fields=0
for field in id title score; do
  nulls=$(echo "$top10_output" | jq "[.[] | select(.${field} == null)] | length" 2>/dev/null)
  [ "$nulls" -eq 0 ] && pass "all articles have '$field'" || { fail "some articles missing '$field' ($nulls nulls)"; missing_fields=$((missing_fields+1)); }
done
# url can be null for Ask HN / Show HN posts — just check the key exists
has_url_key=$(echo "$top10_output" | jq 'all(.[]; has("url"))' 2>/dev/null)
[ "$has_url_key" == "true" ] && pass "all articles have 'url' key" || fail "some articles missing 'url' key"

# id must be a number
bad_ids=$(echo "$top10_output" | jq '[.[] | select(.id | type != "number")] | length' 2>/dev/null)
[ "$bad_ids" -eq 0 ] && pass "all 'id' values are numbers" || fail "'id' is not a number in $bad_ids articles"

# score must be a number
bad_scores=$(echo "$top10_output" | jq '[.[] | select(.score | type != "number")] | length' 2>/dev/null)
[ "$bad_scores" -eq 0 ] && pass "all 'score' values are numbers" || fail "'score' is not a number in $bad_scores articles"

# title must be a non-empty string
bad_titles=$(echo "$top10_output" | jq '[.[] | select(.title | type != "string" or length == 0)] | length' 2>/dev/null)
[ "$bad_titles" -eq 0 ] && pass "all 'title' values are non-empty strings" || fail "bad 'title' in $bad_titles articles"

# output must be a JSON array, not object
is_array=$(echo "$top10_output" | jq 'type == "array"' 2>/dev/null)
[ "$is_array" == "true" ] && pass "output is a JSON array" || fail "output is not a JSON array"

# ---------------------------------------------------------------------------
# hn-top10.sh — error handling (mocked bad URL)
# ---------------------------------------------------------------------------
run_section "hn-top10.sh: error handling (mocked)"

# Patch the script to use an unreachable URL and run it
patched=$(sed 's|https://hacker-news.firebaseio.com/v0/topstories.json|http://127.0.0.1:19999/fail.json|g' "$HN_TOP10")
error_output=$(echo "$patched" | bash 2>&1)
exit_code=$?

[ $exit_code -ne 0 ] && pass "exits non-zero when top stories URL fails" || fail "should exit non-zero when top stories URL fails"
echo "$error_output" | grep -qi "error\|failed\|warning" && pass "prints error/warning message on failure" || fail "no error/warning message printed on failure"

# ---------------------------------------------------------------------------
# hn-summary.sh — help flag
# ---------------------------------------------------------------------------
run_section "hn-summary.sh: help flag"

output=$(bash "$HN_SUMMARY" --help 2>&1)
echo "$output" | grep -q "Usage:" && pass "--help prints Usage" || fail "--help prints Usage"
echo "$output" | grep -q "summary.md" && pass "--help mentions redirect example" || fail "--help mentions redirect example"

output=$(bash "$HN_SUMMARY" -h 2>&1)
echo "$output" | grep -q "Usage:" && pass "-h prints Usage" || fail "-h prints Usage"

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
[ -n "$summary_output" ] && pass "produces non-empty output" || fail "produced empty output"
echo "$summary_output" | grep -q "$today" && pass "output contains today's date ($today)" || fail "output does not contain today's date ($today)"
echo "$summary_output" | grep -q "#" && pass "output contains Markdown header (#)" || fail "output missing Markdown header (#)"

# Prompt checks — verify what was sent to claude
[ -f "$TMP_DIR/claude_stdin.txt" ] && pass "claude was invoked" || fail "claude was not invoked"
if [ -f "$TMP_DIR/claude_stdin.txt" ]; then
  grep -q "$today" "$TMP_DIR/claude_stdin.txt" && pass "prompt contains today's date" || fail "prompt missing today's date"
  grep -q "Test Article" "$TMP_DIR/claude_stdin.txt" && pass "prompt contains article data" || fail "prompt missing article data"
fi

rm -rf "$TMP_DIR"

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "================================"
echo "Results: $PASS passed, $FAIL failed"
echo "================================"
[ $FAIL -eq 0 ] && exit 0 || exit 1
