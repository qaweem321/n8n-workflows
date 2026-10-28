#!/usr/bin/env sh
# Imports the local credentials and every workflow into the running n8n container.
# Safe to run again: existing items with the same id are updated, not duplicated.
# Imported workflows start inactive; turn each one on in the n8n editor.
set -eu
cd "$(dirname "$0")/.."

docker compose exec -T n8n n8n import:credentials --input=/credentials/local.json

for dir in workflows/*/; do
  name=$(basename "$dir")
  docker compose exec -T n8n n8n import:workflow --input="/workflows/$name/workflow.json"
done

echo "Done. Open http://localhost:5678 and turn on the workflows you want to use."
