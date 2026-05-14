#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONCURRENCY="${MATRIX_CONCURRENCY:-8}"

echo "=== OpenAPI DynamicRef SDK Generator Matrix ==="
echo ""

if [ ! -d "$REPO_ROOT/specs" ] || [ -z "$(ls -A "$REPO_ROOT/specs/" 2>/dev/null)" ]; then
  echo "specs/ not found or empty — building specs first..."
  "$REPO_ROOT/scripts/validate-and-build.sh"
  echo ""
fi

exec node "$REPO_ROOT/scripts/matrix-runner.mjs" --concurrency="$CONCURRENCY" "$@"
