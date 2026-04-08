# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This project fetches the top 10 Hacker News articles and generates a Japanese-language summary in Markdown format using the Claude CLI.

## Dependencies

- `curl` — HTTP requests to the HN API
- `jq` — JSON parsing
- `claude` — Claude Code CLI (`claude -p` for non-interactive prompt mode)

## Scripts

**Fetch top 10 articles:**
```bash
./hn-top10.sh
```
Outputs a JSON array of the top 10 HN stories, each with `id`, `title`, and `url`. Makes 11 API calls total (1 for IDs + 1 per article).

**Generate summary:**
```bash
./hn-summary.sh
```
Calls `hn-top10.sh` internally, then pipes a prompt into `claude -p` to produce a Japanese Markdown summary with today's date in the header. Output goes to stdout — redirect to a file if needed (e.g. `./hn-summary.sh > summary.md`).

## Architecture

`hn-summary.sh` → calls `hn-top10.sh` → HN Firebase API → pipes JSON + prompt into `claude -p` → Markdown output

The HN API base URL is `https://hacker-news.firebaseio.com/v0/`. Top story IDs come from `/topstories.json`; individual items from `/item/{id}.json`.

---

## Reflections

- **Do not use the Anthropic API or SDK for summary generation.** When asked to create the summary, the instinct was to reach for the API directly. The correct approach is to pipe the JSON output and prompt into `claude -p` via the shell — no API keys, no SDK imports.
- **Do not use WebFetch to call the HN API.** When integrating `hn-top10.sh` into the pipeline, WebFetch was attempted instead of letting the shell script handle HTTP requests with `curl`. The script already handles fetching; do not duplicate it with WebFetch.
