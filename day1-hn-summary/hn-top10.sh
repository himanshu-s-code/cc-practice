#!/bin/bash

min_comments=0

for arg in "$@"; do
  case "$arg" in
    -h|--help)
      echo "Usage: $(basename "$0") [--min-comments N]"
      echo ""
      echo "Fetches the top 10 Hacker News stories and outputs them as a JSON array."
      echo "Each entry includes: id, title, url, score, descendants."
      echo ""
      echo "Options:"
      echo "  -h, --help          Show this help message and exit"
      echo "  --min-comments N    Only include stories with at least N comments"
      exit 0
      ;;
    --min-comments)
      next=true
      ;;
    *)
      if [[ "$next" == "true" ]]; then
        min_comments="$arg"
        next=false
      fi
      ;;
  esac
done

fetch_with_retry() {
  local url="$1"
  local attempt=1
  while [ $attempt -le 3 ]; do
    if response=$(curl -s -f "$url") && [ -n "$response" ]; then
      echo "$response"
      return 0
    fi
    echo "Warning: API request failed (attempt $attempt/3): $url" >&2
    attempt=$((attempt + 1))
    [ $attempt -le 3 ] && sleep 2
  done
  echo "Error: Failed to fetch $url after 3 attempts." >&2
  return 1
}

if ! ids_json=$(fetch_with_retry "https://hacker-news.firebaseio.com/v0/topstories.json"); then
  echo "Error: Could not fetch top stories. Exiting." >&2
  exit 1
fi

# Fetch up to 30 candidates so we can find 10 after filtering by min-comments
ids=$(echo "$ids_json" | jq '.[0:30][]')

articles="[]"
count=0
for id in $ids; do
  [ "$count" -ge 10 ] && break
  sleep 1
  if ! item=$(fetch_with_retry "https://hacker-news.firebaseio.com/v0/item/${id}.json"); then
    echo "Warning: Skipping article $id due to fetch failure." >&2
    continue
  fi
  descendants=$(echo "$item" | jq '.descendants // 0')
  if [ "$descendants" -lt "$min_comments" ]; then
    continue
  fi
  article=$(echo "$item" | jq '{id, title, url, score, descendants}')
  articles=$(echo "$articles" | jq ". += [$article]")
  count=$((count + 1))
done

echo "$articles"
