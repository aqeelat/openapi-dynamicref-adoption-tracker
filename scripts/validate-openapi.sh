#!/usr/bin/env bash
set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FIXTURES_DIR="$REPO_ROOT/fixtures"
SEMANTICS_DIR="$FIXTURES_DIR/spec-semantics"

TOOLS=(redocly openapi-spec-validator spectral swagger-cli)

run_tool() {
  local tool="$1"
  local fixture="$2"

  case "$tool" in
    redocly)
      npx --no-install redocly lint "$fixture"
      ;;
    openapi-spec-validator)
      uvx --from openapi-spec-validator==0.7.2 openapi-spec-validator "$fixture"
      ;;
    spectral)
      npx --no-install spectral lint "$fixture"
      ;;
    swagger-cli)
      npx --no-install swagger-cli validate "$fixture"
      ;;
  esac
}

validation_failed=0
fixtures=("$FIXTURES_DIR"/*.yaml)
if [ -d "$SEMANTICS_DIR" ]; then
  fixtures+=("$SEMANTICS_DIR"/*.yaml)
fi

for fixture in "${fixtures[@]}"; do
  [ -e "$fixture" ] || continue
  echo "=== $(basename "$fixture") ==="
  for tool in "${TOOLS[@]}"; do
    printf '%-24s' "$tool"
    if run_tool "$tool" "$fixture" >/tmp/openapi-dynamicref-validation.log 2>&1; then
      echo "PASS"
    else
      echo "FAIL"
      validation_failed=1
      sed 's/^/  /' /tmp/openapi-dynamicref-validation.log
    fi
  done
  echo ""
done

exit "$validation_failed"
