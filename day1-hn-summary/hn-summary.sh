#!/bin/bash

date=$(date +"%Y-%m-%d")
articles=$(bash "$(dirname "$0")/hn-top10.sh")

prompt="Today is ${date}. Here are the top 10 Hacker News articles in JSON format:

${articles}

Please write a summary in Markdown format in Japanese. Include a header with today's date (${date}). For each article, include the title as a link (using the url field) and a one-sentence description in Japanese of what it is likely about based on the title."

echo "$prompt" | claude -p
