#!/usr/bin/env bash
#
# deploy.sh — single deploy entrypoint for every environment.
#
# All behavior is driven by the server's own .env (see the "Deploy control"
# block in env-example-relational). The same script runs on the local company
# servers (dev/qa) and the AWS boxes (staging/prod); nothing environment-
# specific is hardcoded.
#
# Design goals (see docs/deployment-pipeline-plan.md):
#   * Reproducible: always deploy a clean checkout of a known branch.
#   * Fail-safe: never remove the live container until the replacement is
#     proven healthy; roll back to the previous image on failure.
#   * Low downtime: build + migrate + seed happen on a warm container OFF the
#     critical path while the old container keeps serving; the cutover is a
#     single fast boot (migrations already applied on the warm container).
#
# Usage:  deploy/deploy.sh <dev|qa|staging|prod>
#         (normally invoked via the deploy-<env>.sh wrappers, or from Jenkins)
#
set -euo pipefail

ENV_ARG="${1:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

log()  { printf '\n\033[1;34m[deploy]\033[0m %s\n' "$*"; }
warn() { printf '\n\033[1;33m[deploy:warn]\033[0m %s\n' "$*"; }
die()  { printf '\n\033[1;31m[deploy:error]\033[0m %s\n' "$*" >&2; exit 1; }

# --- 1. Load the server's .env (control values only) ------------------------
[ -f ./.env ] || die ".env not found in $REPO_ROOT (each server keeps its own)."

# Read a single KEY's value from .env WITHOUT sourcing the file. Sourcing runs
# every line as shell, so a value containing a space or shell metacharacter
# (many secrets do) is executed — that is what caused ".env: line NN: <word>:
# command not found". The container still gets the full .env verbatim via
# `docker run --env-file`, exactly as before.
read_env() {
  local key="$1" line val
  line="$(grep -E "^[[:space:]]*${key}=" ./.env 2>/dev/null | tail -n1)" || true
  [ -n "$line" ] || return 0
  val="${line#*=}"                        # everything after the first '='
  val="${val%$'\r'}"                      # strip trailing CR (CRLF files)
  val="${val%"${val##*[![:space:]]}"}"    # strip trailing whitespace
  case "$val" in                          # strip one layer of matching quotes
    \"*\") val="${val#\"}"; val="${val%\"}" ;;
    \'*\') val="${val#\'}"; val="${val%\'}" ;;
  esac
  printf '%s' "$val"
}

DEPLOY_ENV="$(read_env DEPLOY_ENV)"
DEPLOY_BRANCH="$(read_env DEPLOY_BRANCH)"
APP_PORT="$(read_env APP_PORT)"
APP_CONTAINER="$(read_env APP_CONTAINER)"
APP_IMAGE="$(read_env APP_IMAGE)"
DOCKER_CMD="$(read_env DOCKER_CMD)"
DOCKER_NETWORK="$(read_env DOCKER_NETWORK)"
# Local dependency services (Postgres/Redis) that run as compose services on
# THIS host (dev/qa). deploy.sh makes sure they're up before deploying, so a
# rebooted/pruned box self-heals with no manual `docker compose up`. Leave
# empty on AWS (RDS/ElastiCache are external). e.g. COMPOSE_DEPS="postgres redis"
COMPOSE_DEPS="$(read_env COMPOSE_DEPS)"
DEPLOY_MODE="$(read_env DEPLOY_MODE)";     DEPLOY_MODE="${DEPLOY_MODE:-standalone}"
HEALTH_PATH="$(read_env HEALTH_PATH)";     HEALTH_PATH="${HEALTH_PATH:-/health/ready}"
# Generous by default: the warm container runs migrate + seed BEFORE the app
# starts answering /health/ready, and a first run can apply many migrations
# plus a full seed. The probe returns as soon as it sees HTTP 200, so this is
# only a ceiling; it also fails fast if the container crashes.
HEALTH_TIMEOUT="$(read_env HEALTH_TIMEOUT)"; HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-300}"
COMPOSE_FILE="$(read_env COMPOSE_FILE)";   COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yaml}"
COMPOSE_SERVICE="$(read_env COMPOSE_SERVICE)"; COMPOSE_SERVICE="${COMPOSE_SERVICE:-api}"

# Required in every mode. APP_CONTAINER/APP_IMAGE are only needed for the
# standalone path and are asserted there, so a compose server can omit them.
[ -n "$DEPLOY_BRANCH" ] || die "DEPLOY_BRANCH missing in .env"
[ -n "$APP_PORT" ]      || die "APP_PORT missing in .env"
# Optional: a fixed loopback port for the warm container. Left empty by default
# so Docker auto-assigns a free ephemeral port (avoids "address already in use").
STAGE_PORT="$(read_env STAGE_PORT)"

# Docker command: set DOCKER_CMD="sudo docker" on servers where the deploy user
# isn't in the docker group (e.g. the Jenkins-driven dev/qa boxes today).
DOCKER="${DOCKER_CMD:-docker}"
# Optional docker network to attach containers to (so a container-name DB host
# like `postgres` still resolves). Leave empty to match a plain `docker run`.
NET_ARGS=(); [ -n "$DOCKER_NETWORK" ] && NET_ARGS=(--network "$DOCKER_NETWORK")

$DOCKER version >/dev/null 2>&1 || die "'$DOCKER' not usable (check docker / sudo rights)."

# Guard: if this server declares which env it is, refuse a mismatched wrapper
# (prevents e.g. running deploy-prod.sh on the staging box).
if [ -n "${DEPLOY_ENV:-}" ] && [ -n "$ENV_ARG" ] && [ "$ENV_ARG" != "$DEPLOY_ENV" ]; then
  die "Refusing: this server is '$DEPLOY_ENV' but you asked to deploy '$ENV_ARG'."
fi

log "Environment : ${DEPLOY_ENV:-${ENV_ARG:-unknown}}"
log "Branch      : $DEPLOY_BRANCH"
log "Mode        : $DEPLOY_MODE"
log "Docker      : $DOCKER ${DOCKER_NETWORK:+(network: $DOCKER_NETWORK)}"

# --- 2. Clean, reproducible checkout (NEVER sudo git) -----------------------
# NOTE: this wipes uncommitted changes and untracked files (except .env). The
# deploy scripts themselves must be committed to $DEPLOY_BRANCH, or they would
# be removed here on the next run.
log "Fetching and resetting to origin/$DEPLOY_BRANCH ..."
git fetch --prune origin
git reset --hard "origin/$DEPLOY_BRANCH"
git clean -fd -e .env
NEW_SHA="$(git rev-parse --short HEAD)"
log "Checked out $NEW_SHA — $(git log -1 --pretty=%s)"

# ---------------------------------------------------------------------------
# http_code <url> : echo the HTTP status code (or empty), via curl or wget.
# health_probe <url> [container] : return 0 once <url> answers HTTP 200 within
#   HEALTH_TIMEOUT. If [container] is given, fail fast the moment that container
#   stops running (crash / exit) instead of waiting out the whole timeout.
#   The timeout must cover migrate + seed + app boot on the warm container, so
#   it is generous by default (see HEALTH_TIMEOUT).
# ---------------------------------------------------------------------------
http_code() {
  if command -v curl >/dev/null 2>&1; then
    curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$1" 2>/dev/null || true
  elif command -v wget >/dev/null 2>&1; then
    wget -q -T 5 -t 1 -O /dev/null "$1" >/dev/null 2>&1 && echo 200 || echo ''
  else
    die "Neither curl nor wget is installed — cannot health-check."
  fi
}
health_probe() {
  local url="$1" container="${2:-}" code state
  local deadline=$(( SECONDS + HEALTH_TIMEOUT ))
  log "Health-checking $url (timeout ${HEALTH_TIMEOUT}s${container:+, watching $container}) ..."
  while [ "$SECONDS" -lt "$deadline" ]; do
    code="$(http_code "$url")"
    if [ "$code" = "200" ]; then
      log "Healthy ($code) at $url"
      return 0
    fi
    # Fail fast if the container crashed/exited (don't wait out the timeout).
    if [ -n "$container" ]; then
      state="$($DOCKER inspect -f '{{.State.Status}}' "$container" 2>/dev/null || echo missing)"
      if [ "$state" != "running" ]; then
        warn "Container '$container' is '$state' before it became healthy."
        return 1
      fi
    fi
    sleep 3
  done
  warn "No HTTP 200 from $url within ${HEALTH_TIMEOUT}s (last code: ${code:-none})."
  return 1
}

# ===========================================================================
# COMPOSE MODE: DB + Redis run as compose services alongside the app.
# ===========================================================================
if [ "$DEPLOY_MODE" = "compose" ]; then
  log "Compose deploy via $COMPOSE_FILE (service: $COMPOSE_SERVICE) ..."
  $DOCKER compose -f "$COMPOSE_FILE" up -d --build
  if health_probe "http://localhost:${APP_PORT}${HEALTH_PATH}"; then
    log "Compose deploy healthy on :$APP_PORT ($NEW_SHA). ✓"
    exit 0
  fi
  $DOCKER compose -f "$COMPOSE_FILE" logs --tail 50 "$COMPOSE_SERVICE" || true
  die "Compose deploy unhealthy — see logs above."
fi

# ===========================================================================
# STANDALONE MODE (default): app runs as a single container (dev/qa/staging/prod).
# ===========================================================================
: "${APP_CONTAINER:?APP_CONTAINER missing in .env (required for standalone mode)}"
: "${APP_IMAGE:?APP_IMAGE missing in .env (required for standalone mode)}"

log "Container   : $APP_CONTAINER   Image: $APP_IMAGE   Port: $APP_PORT"

# --- 2b. Ensure local dependency services (DB/Redis) are up ------------------
# On dev/qa, Postgres and Redis run as compose services on this host. Bring them
# up (idempotent — a no-op if already running) so the deploy never fails just
# because the DB/Redis container was stopped, pruned, or lost on reboot. The
# compose file marks them restart:unless-stopped, so this also re-arms that.
# Empty COMPOSE_DEPS (AWS/RDS/ElastiCache) skips this entirely.
if [ -n "${COMPOSE_DEPS:-}" ]; then
  log "Ensuring dependency services are running: $COMPOSE_DEPS"
  # shellcheck disable=SC2086
  $DOCKER compose -f "$COMPOSE_FILE" up -d $COMPOSE_DEPS \
    || die "Failed to start dependency services ($COMPOSE_DEPS) via $COMPOSE_FILE."
fi

# --- 3. Build a uniquely tagged image; retain the current one as :previous --
NEW_TAG="${APP_IMAGE}:${NEW_SHA}"
log "Building $NEW_TAG (old build kept as ${APP_IMAGE}:previous for rollback) ..."
$DOCKER image tag "${APP_IMAGE}:current" "${APP_IMAGE}:previous" 2>/dev/null || true
$DOCKER build -t "$NEW_TAG" -t "${APP_IMAGE}:current" .

# --- 4. Warm the replacement on a temp port while the live one keeps serving.
# The warm container runs migrations + seed on boot (off the critical path);
# a broken build or migration is caught HERE, before any traffic is touched.
# The temp port is bound to 127.0.0.1 (never publicly exposed). By default we
# publish to port 0 so Docker assigns a FREE ephemeral port — this avoids
# colliding with anything already bound (e.g. 3001 in use on the box). A fixed
# STAGE_PORT in .env overrides this if you ever need a predictable port.
STAGE="${APP_CONTAINER}-new"
PUB_PORT="${STAGE_PORT:-0}"                 # 0 → Docker picks a free port
$DOCKER rm -f "$STAGE" >/dev/null 2>&1 || true   # clear any leftover warm container
log "Starting warm container '$STAGE' on 127.0.0.1 (${STAGE_PORT:-auto-assigned port}) ..."
$DOCKER run -d --name "$STAGE" --env-file .env "${NET_ARGS[@]}" \
  --restart no \
  -p "127.0.0.1:${PUB_PORT}:${APP_PORT}" "$NEW_TAG" >/dev/null

# Resolve the actual host port (essential when PUB_PORT=0). Format is like
# "127.0.0.1:49155" — take the number after the last colon.
STAGE_HOST_PORT="$($DOCKER port "$STAGE" "${APP_PORT}/tcp" 2>/dev/null | head -n1 | sed 's/.*://')"
if [ -z "$STAGE_HOST_PORT" ]; then
  warn "Could not determine the warm container's port — it may have failed to start."
  $DOCKER logs --tail 60 "$STAGE" 2>&1 | sed 's/^/    /' || true
  $DOCKER rm -f "$STAGE" >/dev/null 2>&1 || true
  die "Deploy aborted. '$APP_CONTAINER' is untouched and still serving the previous build."
fi
log "Warm container listening on 127.0.0.1:$STAGE_HOST_PORT"

if ! health_probe "http://127.0.0.1:${STAGE_HOST_PORT}${HEALTH_PATH}" "$STAGE"; then
  warn "Warm container failed to become healthy — aborting BEFORE swap."
  $DOCKER logs --tail 60 "$STAGE" 2>&1 | sed 's/^/    /' || true
  $DOCKER rm -f "$STAGE" >/dev/null 2>&1 || true
  die "Deploy aborted. '$APP_CONTAINER' is untouched and still serving the previous build."
fi
log "Warm container healthy — migrations applied, app ready to serve."

# --- 5. Swap. The old container drains (SIGTERM → shutdown hooks) then is
# replaced. The warm container already applied migrations + seed, so the final
# container skips them (RUN_MIGRATIONS/RUN_SEED=false) and boots fast — the
# cutover gap is a single quick start, not migrate+seed+boot.
log "Swapping in the new build on :$APP_PORT ..."
$DOCKER stop --time 20 "$APP_CONTAINER" >/dev/null 2>&1 || true
$DOCKER rm -f "$APP_CONTAINER" >/dev/null 2>&1 || true
$DOCKER rm -f "$STAGE" >/dev/null 2>&1 || true
$DOCKER run -d --name "$APP_CONTAINER" --env-file .env "${NET_ARGS[@]}" \
  -e RUN_MIGRATIONS=false -e RUN_SEED=false \
  --restart unless-stopped \
  -p "${APP_PORT}:${APP_PORT}" "$NEW_TAG" >/dev/null

# --- 6. Verify the live endpoint; roll back to :previous on failure ---------
if health_probe "http://localhost:${APP_PORT}${HEALTH_PATH}" "$APP_CONTAINER"; then
  log "Deploy complete and healthy on :$APP_PORT ($NEW_SHA). ✓"
  $DOCKER image prune -f >/dev/null 2>&1 || true
  exit 0
fi

warn "New build unhealthy on :$APP_PORT — rolling back to ${APP_IMAGE}:previous ..."
$DOCKER rm -f "$APP_CONTAINER" >/dev/null 2>&1 || true
if $DOCKER image inspect "${APP_IMAGE}:previous" >/dev/null 2>&1; then
  $DOCKER run -d --name "$APP_CONTAINER" --env-file .env "${NET_ARGS[@]}" \
    -e RUN_MIGRATIONS=false -e RUN_SEED=false \
    --restart unless-stopped \
    -p "${APP_PORT}:${APP_PORT}" "${APP_IMAGE}:previous" >/dev/null
  if health_probe "http://localhost:${APP_PORT}${HEALTH_PATH}" "$APP_CONTAINER"; then
    die "Rolled back to the previous build successfully. The NEW build was NOT deployed — investigate before retrying."
  fi
  die "Rollback ran but the previous build is ALSO unhealthy — MANUAL INTERVENTION NEEDED."
fi
die "No ${APP_IMAGE}:previous image to roll back to — MANUAL INTERVENTION NEEDED."
