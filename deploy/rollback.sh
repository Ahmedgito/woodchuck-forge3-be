#!/usr/bin/env bash
#
# rollback.sh — restore the previous image (standalone environments).
#
# Every deploy retains the prior build as ${APP_IMAGE}:previous. This restores
# it onto the live port. Migrations are NOT reverted (forward-only) — rollback
# assumes backward-compatible migrations. See docs/deployment-pipeline-plan.md.
#
# Usage:  deploy/rollback.sh
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

[ -f ./.env ] || { echo ".env not found next to the repo root." >&2; exit 1; }

# Read a KEY from .env without sourcing it (values may contain spaces/metachars).
read_env() {
  local key="$1" line val
  line="$(grep -E "^[[:space:]]*${key}=" ./.env 2>/dev/null | tail -n1)" || true
  [ -n "$line" ] || return 0
  val="${line#*=}"
  val="${val%$'\r'}"
  val="${val%"${val##*[![:space:]]}"}"
  case "$val" in
    \"*\") val="${val#\"}"; val="${val%\"}" ;;
    \'*\') val="${val#\'}"; val="${val%\'}" ;;
  esac
  printf '%s' "$val"
}

APP_CONTAINER="$(read_env APP_CONTAINER)"
APP_IMAGE="$(read_env APP_IMAGE)"
APP_PORT="$(read_env APP_PORT)"
DOCKER_CMD="$(read_env DOCKER_CMD)"
DOCKER_NETWORK="$(read_env DOCKER_NETWORK)"
[ -n "$APP_CONTAINER" ] && [ -n "$APP_IMAGE" ] && [ -n "$APP_PORT" ] || {
  echo "APP_CONTAINER / APP_IMAGE / APP_PORT missing in .env" >&2; exit 1; }

DOCKER="${DOCKER_CMD:-docker}"
NET_ARGS=(); [ -n "$DOCKER_NETWORK" ] && NET_ARGS=(--network "$DOCKER_NETWORK")

if ! $DOCKER image inspect "${APP_IMAGE}:previous" >/dev/null 2>&1; then
  echo "No ${APP_IMAGE}:previous image to roll back to." >&2
  exit 1
fi

echo "Rolling back '$APP_CONTAINER' to ${APP_IMAGE}:previous ..."
$DOCKER rm -f "$APP_CONTAINER" >/dev/null 2>&1 || true
$DOCKER run -d --name "$APP_CONTAINER" --env-file .env "${NET_ARGS[@]}" \
  -e RUN_MIGRATIONS=false -e RUN_SEED=false \
  --restart unless-stopped \
  -p "${APP_PORT}:${APP_PORT}" "${APP_IMAGE}:previous"

echo "Rolled back. Follow logs with:  $DOCKER logs -f $APP_CONTAINER"
