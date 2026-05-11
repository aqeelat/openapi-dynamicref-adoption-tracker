#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== OpenAPI document validators ==="
"$REPO_ROOT/scripts/validate-openapi.sh"

echo "=== JSON Schema runtime validators ==="
node "$REPO_ROOT/scripts/validate-jsonschema.mjs"
