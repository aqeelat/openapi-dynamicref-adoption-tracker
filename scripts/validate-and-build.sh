#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
validation_failed=0

echo "=== Stage 1: Validate fixtures ==="
"$REPO_ROOT/scripts/validate-openapi.sh" || validation_failed=1

echo ""
echo "=== Stage 1: Build specs ==="
node "$REPO_ROOT/scripts/build-specs.mjs"

if [ $validation_failed -ne 0 ]; then
  echo ""
  echo "⚠️  Validation had failures — specs were built but may be invalid."
  exit 1
fi
