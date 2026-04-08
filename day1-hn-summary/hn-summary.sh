#!/bin/bash

categorize=false
format="markdown"
top10_args=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)
      echo "Usage: $(basename "$0") [--categorize] [--min-comments N] [--format markdown|html|json]"
      echo ""
      echo "Fetches the top 10 Hacker News articles and generates a Japanese-language"
      echo "summary using the Claude CLI."
      echo ""
      echo "Output goes to stdout. Redirect to a file if needed:"
      echo "  $(basename "$0") > summary.md"
      echo ""
      echo "Options:"
      echo "  -h, --help                        Show this help message and exit"
      echo "  --categorize                      Group articles by category (AI, Web, Security, etc.)"
      echo "  --min-comments N                  Only include articles with at least N comments"
      echo "  --format markdown|html|json       Output format (default: markdown)"
      exit 0
      ;;
    --categorize)
      categorize=true
      shift
      ;;
    --min-comments)
      top10_args+=(--min-comments "$2")
      shift 2
      ;;
    --format)
      format="$2"
      if [[ "$format" != "markdown" && "$format" != "html" && "$format" != "json" ]]; then
        echo "Error: --format must be one of: markdown, html, json" >&2
        exit 1
      fi
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

date=$(date +"%Y-%m-%d")
articles=$(bash "$(dirname "$0")/hn-top10.sh" "${top10_args[@]}")

build_prompt() {
  local fmt="$1"
  local cat="$2"

  local structure_plain="For each article, include the title as a link and a one-sentence description in Japanese of what it is likely about based on the title."
  local structure_categorized="Group the articles by category (e.g. AI, Web, Security, Programming, Science, Business, Other). For each category, use a section heading. Under each heading, list the articles that belong to that category — include the title as a link and a one-sentence description in Japanese. Infer the category from the article title."
  local structure
  $cat && structure="$structure_categorized" || structure="$structure_plain"

  case "$fmt" in
    markdown)
      echo "Today is ${date}. Here are the top Hacker News articles in JSON format:

${articles}

Please write a summary in Markdown format in Japanese. Include a header with today's date (${date}). ${structure} Use the url field for links."
      ;;
    html)
      echo "Today is ${date}. Here are the top Hacker News articles in JSON format:

${articles}

Please write a summary as a complete, self-contained HTML document in Japanese. Include a <title> and an <h1> with today's date (${date}). ${structure} Use the url field for <a href> links. Output only valid HTML with no Markdown or code fences."
      ;;
    json)
      echo "Today is ${date}. Here are the top Hacker News articles in JSON format:

${articles}

Please output a JSON array summarizing these articles in Japanese. Each element should be an object with these fields:
- \"id\": the article id (number)
- \"title\": the original article title (string)
- \"url\": the article url (string)
- \"category\": inferred category in English such as AI, Web, Security, Programming, Science, Business, Other (string)
- \"summary\": a one-sentence description in Japanese of what the article is likely about (string)
- \"score\": the score from the input data (number)
- \"comments\": the descendants count from the input data (number)

Output only the raw JSON array with no Markdown, no code fences, and no extra text."
      ;;
  esac
}

prompt=$(build_prompt "$format" "$categorize")
echo "$prompt" | claude -p
