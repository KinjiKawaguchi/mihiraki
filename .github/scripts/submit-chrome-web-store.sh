#!/usr/bin/env bash
# Uploads the packaged extension to its Chrome Web Store item and submits it for review,
# with the Chrome Web Store API v2. Usage: submit-chrome-web-store.sh <zip>
# Needs CWS_ACCESS_TOKEN (scope chromewebstore), CWS_PUBLISHER_ID and CWS_EXTENSION_ID.
set -euo pipefail

zip="$1"
api="https://chromewebstore.googleapis.com"
item="publishers/${CWS_PUBLISHER_ID}/items/${CWS_EXTENSION_ID}"
auth=(-H "Authorization: Bearer ${CWS_ACCESS_TOKEN}")

# Calls the API; on an error, shows its answer (which says why) and fails.
call() {
  local response
  if ! response=$(curl --fail-with-body -sS "${auth[@]}" "$@"); then
    echo "Chrome Web Store API: ${response}" >&2
    return 1
  fi
  printf '%s' "$response"
}

state=$(call -X POST -T "$zip" "${api}/upload/v2/${item}:upload" | jq -r '.uploadState')

# Large packages are processed asynchronously; wait up to five minutes for them.
for _ in $(seq 1 30); do
  [ "$state" = "IN_PROGRESS" ] || break
  sleep 10
  state=$(call "${api}/v2/${item}:fetchStatus" | jq -r '.lastAsyncUploadState')
done
if [ "$state" != "SUCCEEDED" ]; then
  echo "Upload to the Chrome Web Store ended in state ${state}" >&2
  exit 1
fi

# Published as soon as the review approves it.
call -X POST -H "Content-Type: application/json" \
  -d '{"publishType":"DEFAULT_PUBLISH"}' "${api}/v2/${item}:publish" |
  jq '{state, warningInfo}'
