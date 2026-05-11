#!/usr/bin/env bash
set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FIXTURES_DIR="$REPO_ROOT/fixtures"

TOOLS=(redocly openapi-spec-validator spectral swagger-cli)

run_tool() {
  local tool="$1"
  local fixture="$2"

  case "$tool" in
    redocly)
      npx --yes @redocly/cli lint "$fixture"
      ;;
    openapi-spec-validator)
      uvx openapi-spec-validator "$fixture"
      ;;
    spectral)
      npx --yes @stoplight/spectral-cli lint "$fixture"
      ;;
    swagger-cli)
      npx --yes @apidevtools/swagger-cli validate "$fixture"
      ;;
  esac
}

for fixture in "$FIXTURES_DIR"/*.yaml; do
  echo "=== $(basename "$fixture") ==="
  for tool in "${TOOLS[@]}"; do
    printf '%-24s' "$tool"
    if run_tool "$tool" "$fixture" >/tmp/openapi-dynamicref-validation.log 2>&1; then
      echo "PASS"
    else
      echo "FAIL"
      sed 's/^/  /' /tmp/openapi-dynamicref-validation.log
    fi
  done
  echo ""
done
