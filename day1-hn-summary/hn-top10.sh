#!/bin/bash

ids=$(curl -s "https://hacker-news.firebaseio.com/v0/topstories.json" | jq '.[0:10][]')

articles="[]"
for id in $ids; do
  item=$(curl -s "https://hacker-news.firebaseio.com/v0/item/${id}.json")
  article=$(echo "$item" | jq '{id, title, url}')
  articles=$(echo "$articles" | jq ". += [$article]")
done

echo "$articles"
