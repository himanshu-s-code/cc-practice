# day1-hn-summary

[![CI](https://github.com/himanshu-s-code/cc-practice/actions/workflows/test.yml/badge.svg?branch=master)](https://github.com/himanshu-s-code/cc-practice/actions/workflows/test.yml)

Fetches the top 10 Hacker News articles and generates a summary using the Claude CLI.

## Dependencies

- `curl` — HTTP requests to the HN API
- `jq` — JSON parsing
- `claude` — Claude Code CLI (`claude -p` for non-interactive prompt mode)

## Usage

```bash
# Fetch top 10 articles as JSON
./hn-top10.sh

# Generate summary (default: Markdown in Japanese)
./hn-summary.sh > summary.md

# Categorize articles by topic
./hn-summary.sh --categorize > summary.md

# Filter by minimum comment count
./hn-summary.sh --min-comments 50 > summary.md

# Choose output format: markdown (default), html, json
./hn-summary.sh --format html > summary.html
./hn-summary.sh --format json > summary.json

# Combine options
./hn-summary.sh --format json --categorize --min-comments 100

# Run tests
bash test.sh
```

## CI

On every push to `day1-hn-summary/**`:

1. **ShellCheck** lints all `.sh` files (pinned v0.10.0, cached)
2. **test.sh** runs the full test suite
3. On failure, a Slack notification is sent via Incoming Webhook

Add your webhook URL as a GitHub Actions secret named `SLACK_WEBHOOK_URL`.
