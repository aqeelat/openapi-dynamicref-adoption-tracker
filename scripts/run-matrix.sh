#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SPECS_DIR="$REPO_ROOT/specs"
OUTPUT_DIR="$REPO_ROOT/generated"
LOGS_DIR="$REPO_ROOT/logs"
VERSIONS=("3.1.0" "3.1.1" "3.1.2" "3.2.0")
SCENARIOS=("baseline-duplicated-pagination" "paginated-generic" "recursive-category-tree" "nested-workspace-resources")

mkdir -p "$OUTPUT_DIR" "$LOGS_DIR"

echo "=== OpenAPI DynamicRef Matrix Runner ==="
echo ""

for scenario in "${SCENARIOS[@]}"; do
  for v in "${VERSIONS[@]}"; do
    spec="$SPECS_DIR/$scenario/oas-${v}.json"
    if [ ! -f "$spec" ]; then
      echo "SKIP: $spec not found"
      continue
    fi

    echo "--- $scenario / OAS $v ---"

    echo "[1/3] Orval..."
    project="${scenario//-/_}_${v//./_}"
    npx orval --config "$REPO_ROOT/orval.config.ts" --project "$project" \
      > "$LOGS_DIR/orval-${scenario}-${v}.log" 2>&1 && echo "  OK" || echo "  FAIL (see logs/orval-${scenario}-${v}.log)"

    echo "[2/3] OpenAPI Generator (typescript-fetch)..."
    npx @openapitools/openapi-generator-cli generate \
      -i "$spec" \
      -g typescript-fetch \
      -o "$OUTPUT_DIR/openapi-generator/$scenario/$v" \
      > "$LOGS_DIR/openapi-generator-${scenario}-${v}.log" 2>&1 && echo "  OK" || echo "  FAIL (see logs/openapi-generator-${scenario}-${v}.log)"

    echo "[3/3] Swagger Codegen v3 (typescript-fetch)..."
    docker run --rm -v "$spec":/spec.json -v "$OUTPUT_DIR/swagger-codegen/$scenario/$v":/out \
      swaggerapi/swagger-codegen-cli-v3 generate \
      -i /spec.json -l typescript-fetch -o /out \
      > "$LOGS_DIR/swagger-codegen-${scenario}-${v}.log" 2>&1 && echo "  OK" || echo "  FAIL (see logs/swagger-codegen-${scenario}-${v}.log)"
  done
done

echo ""
echo "=== Typecheck ==="

for scenario in "${SCENARIOS[@]}"; do
  for v in "${VERSIONS[@]}"; do
    for tool in orval openapi-generator swagger-codegen; do
      dir="$OUTPUT_DIR/$tool/$scenario/$v"
      if [ ! -d "$dir" ]; then
        continue
      fi
      echo -n "  $tool/$scenario/$v: "
      (cd "$dir" && npx tsc --noEmit --strict) \
        > "$LOGS_DIR/typecheck-${tool}-${scenario}-${v}.log" 2>&1 && echo "PASS" || echo "FAIL (see logs/typecheck-${tool}-${scenario}-${v}.log)"
    done
  done
done

echo ""
echo "Done. Logs in $LOGS_DIR/  Output in $OUTPUT_DIR/"
