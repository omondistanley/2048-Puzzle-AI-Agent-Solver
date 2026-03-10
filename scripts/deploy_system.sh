#!/usr/bin/env bash
set -euo pipefail

# Full-system deploy helper for local validation + Render deploy hook.
# Usage:
#   scripts/deploy_system.sh
#   RENDER_DEPLOY_HOOK_URL="https://api.render.com/deploy/srv-..." scripts/deploy_system.sh
#   APP_PORT=8001 IMAGE_TAG=2048-ai-solver:prod scripts/deploy_system.sh

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_PORT_WAS_SET="${APP_PORT+x}"
APP_PORT="${APP_PORT:-8000}"
IMAGE_TAG="${IMAGE_TAG:-2048-ai-solver:latest}"
CONTAINER_NAME="${CONTAINER_NAME:-2048-ai-solver-local}"

is_port_in_use() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    lsof -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
    return
  fi
  if command -v nc >/dev/null 2>&1; then
    nc -z localhost "$port" >/dev/null 2>&1
    return
  fi
  return 1
}

pick_free_port() {
  local start="$1"
  local end="$2"
  local p
  for p in $(seq "$start" "$end"); do
    if ! is_port_in_use "$p"; then
      echo "$p"
      return 0
    fi
  done
  return 1
}

if is_port_in_use "$APP_PORT"; then
  if [[ "$APP_PORT_WAS_SET" == "x" ]]; then
    echo "ERROR: APP_PORT=$APP_PORT is already in use. Choose another port, e.g. APP_PORT=8001 scripts/deploy_system.sh"
    exit 1
  fi
  FREE_PORT="$(pick_free_port 8001 8100 || true)"
  if [[ -z "$FREE_PORT" ]]; then
    echo "ERROR: Could not find a free port between 8001 and 8100."
    exit 1
  fi
  APP_PORT="$FREE_PORT"
  echo "Port 8000 is in use. Auto-selected APP_PORT=$APP_PORT for local validation."
fi

HEALTH_URL="http://localhost:${APP_PORT}/api/health"
API_BASE_URL="http://localhost:${APP_PORT}/api"

cleanup() {
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
}

trap cleanup EXIT

echo "[1/5] Building frontend + backend image: $IMAGE_TAG"
docker build -t "$IMAGE_TAG" "$ROOT_DIR"

echo "[2/5] Starting local container on port ${APP_PORT}"
docker run -d --name "$CONTAINER_NAME" -p "${APP_PORT}:8000" "$IMAGE_TAG" >/dev/null

echo "[3/5] Waiting for health endpoint"
for i in $(seq 1 30); do
  if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
  echo "ERROR: health check failed at $HEALTH_URL"
  docker logs "$CONTAINER_NAME" | tail -n 200
  exit 1
fi

echo "[4/5] Running API smoke test"
NEW_GAME_PAYLOAD='{"size":4,"daily":false}'
RESPONSE="$(curl -fsS -X POST "$API_BASE_URL/game/new" -H 'Content-Type: application/json' -d "$NEW_GAME_PAYLOAD")"
if [[ "$RESPONSE" != *"grid"* ]]; then
  echo "ERROR: new game API smoke test failed"
  echo "$RESPONSE"
  exit 1
fi

echo "Local validation passed."

echo "[5/5] Triggering Render deploy (optional)"
if [[ -n "${RENDER_DEPLOY_HOOK_URL:-}" ]]; then
  curl -fsS -X POST "$RENDER_DEPLOY_HOOK_URL" >/dev/null
  echo "Render deploy hook triggered successfully."
else
  echo "RENDER_DEPLOY_HOOK_URL is not set. Skipping remote trigger."
  echo "Set it from Render Dashboard -> Service -> Settings -> Deploy Hook."
fi

echo "Done."
