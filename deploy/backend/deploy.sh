#!/usr/bin/env bash
set -Eeuo pipefail

# Career Copilot Backend Production Deployment Script for Ubuntu EC2
# Implements atomic release directories, Prisma migrations, Nginx sync, and automatic rollback.

IMAGE_TAG="${1:-}"
RELEASE_SHA="${2:-}"

if [[ -z "$IMAGE_TAG" || -z "$RELEASE_SHA" ]]; then
  echo "Error: Missing required arguments." >&2
  echo "Usage: $0 <full-image-tag> <release-sha>" >&2
  exit 1
fi

# Acquire exclusive deployment lock to prevent concurrent SSM executions
LOCK_FILE="/var/lock/career-copilot-backend-deploy.lock"
exec 200>"$LOCK_FILE"
if ! flock -n 200; then
  echo "Error: Another backend deployment is currently in progress (lock file $LOCK_FILE busy)." >&2
  exit 1
fi

BASE_DIR="/opt/career-copilot/backend"
RELEASES_DIR="$BASE_DIR/releases"
SHARED_DIR="$BASE_DIR/shared"
STATE_DIR="$BASE_DIR/state"
LOGS_DIR="$BASE_DIR/logs"
RELEASE_DIR="$RELEASES_DIR/$RELEASE_SHA"
ENV_FILE="$SHARED_DIR/.env"
# Keep one compose project across release dirs so host port 5001 is not contended.
COMPOSE_PROJECT="career-copilot-backend"

# Ensure required state and log directories exist
mkdir -p "$STATE_DIR" "$LOGS_DIR" "$RELEASES_DIR"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: Required production environment file not found at $ENV_FILE" >&2
  exit 1
fi

if [[ ! -d "$RELEASE_DIR" ]]; then
  echo "Error: Release directory $RELEASE_DIR does not exist." >&2
  exit 1
fi

cd "$RELEASE_DIR"

if [[ ! -f "compose.yaml" || ! -f "health-check.sh" || ! -f "nginx.conf" ]]; then
  echo "Error: Required deployment files missing in $RELEASE_DIR" >&2
  exit 1
fi

chmod +x health-check.sh

# Verify Docker and Docker Compose availability
if ! command -v docker >/dev/null 2>&1; then
  echo "Error: docker command not found." >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Error: docker compose plugin not found." >&2
  exit 1
fi

# Load current state to allow rollback on failure
CURRENT_IMAGE=""
PREVIOUS_IMAGE=""
CURRENT_RELEASE=""
PREVIOUS_RELEASE=""

if [[ -f "$STATE_DIR/CURRENT_IMAGE" ]]; then
  CURRENT_IMAGE="$(cat "$STATE_DIR/CURRENT_IMAGE")"
fi
if [[ -f "$STATE_DIR/PREVIOUS_IMAGE" ]]; then
  PREVIOUS_IMAGE="$(cat "$STATE_DIR/PREVIOUS_IMAGE")"
fi
if [[ -f "$STATE_DIR/CURRENT_RELEASE" ]]; then
  CURRENT_RELEASE="$(cat "$STATE_DIR/CURRENT_RELEASE")"
fi
if [[ -f "$STATE_DIR/PREVIOUS_RELEASE" ]]; then
  PREVIOUS_RELEASE="$(cat "$STATE_DIR/PREVIOUS_RELEASE")"
fi

# Nginx paths and backup state
NGINX_TARGET="/etc/nginx/sites-available/career-copilot-backend"
NGINX_ENABLED="/etc/nginx/sites-enabled/career-copilot-backend"
NGINX_BACKUP="$STATE_DIR/nginx.conf.bak"
NGINX_CHANGED="false"

DEPLOY_SUCCESS="false"
CURRENT_STEP="startup"
FAILURE_EXIT_CODE=""
FAILURE_LINE=""
FAILURE_COMMAND=""
FAILURE_REASON=""

compose_in() {
  local release_dir="$1"
  local image_tag="$2"
  shift 2
  (
    cd "$release_dir"
    export BACKEND_IMAGE="$image_tag"
    docker compose -p "$COMPOSE_PROJECT" -f compose.yaml "$@"
  )
}

# Tear down a release stack. Also clears legacy project names that used the
# release directory basename (those left 127.0.0.1:5001 allocated across deploys).
stop_release_stack() {
  local release_dir="$1"
  local image_tag="${2:-$IMAGE_TAG}"
  if [[ -z "$release_dir" || ! -d "$release_dir" || ! -f "$release_dir/compose.yaml" ]]; then
    return 0
  fi
  local legacy_project
  legacy_project="$(basename "$release_dir")"
  (
    cd "$release_dir"
    export BACKEND_IMAGE="${image_tag:-placeholder}"
    docker compose -p "$COMPOSE_PROJECT" -f compose.yaml down --remove-orphans || true
    if [[ "$legacy_project" != "$COMPOSE_PROJECT" ]]; then
      docker compose -p "$legacy_project" -f compose.yaml down --remove-orphans || true
    fi
  ) || true
}

on_error() {
  local exit_code=$?
  FAILURE_EXIT_CODE="$exit_code"
  FAILURE_LINE="${BASH_LINENO[0]:-unknown}"
  FAILURE_COMMAND="${BASH_COMMAND:-unknown}"
  FAILURE_REASON="Step '${CURRENT_STEP}' failed (exit ${exit_code}) at line ${FAILURE_LINE}: ${FAILURE_COMMAND}"
  echo "!!! FAILURE DETECTED: ${FAILURE_REASON}" >&2
}

print_failure_diagnostics() {
  echo "!!! -------------------- DEPLOYMENT FAILURE DETAILS --------------------" >&2
  echo "!!! Reason: ${FAILURE_REASON:-unknown failure (script exited before success)}" >&2
  echo "!!! Failed step: ${CURRENT_STEP}" >&2
  echo "!!! Target image: ${IMAGE_TAG}" >&2
  echo "!!! Target release: ${RELEASE_SHA}" >&2
  echo "!!! Release dir: ${RELEASE_DIR}" >&2
  if [[ -n "${CURRENT_IMAGE}" ]]; then
    echo "!!! Rolling back toward: release=${CURRENT_RELEASE} image=${CURRENT_IMAGE}" >&2
  else
    echo "!!! No previous stable release recorded — rollback may be limited." >&2
  fi
  echo "!!! -------------------------------------------------------------------" >&2

  echo ">>> Container status at failure:" >&2
  compose_in "$RELEASE_DIR" "$IMAGE_TAG" ps -a >&2 || true

  echo ">>> Recent api logs:" >&2
  compose_in "$RELEASE_DIR" "$IMAGE_TAG" logs --tail=80 api >&2 || true

  echo ">>> Recent outbox-relay logs:" >&2
  compose_in "$RELEASE_DIR" "$IMAGE_TAG" logs --tail=40 outbox-relay >&2 || true

  echo ">>> Recent job-embedding-worker logs:" >&2
  compose_in "$RELEASE_DIR" "$IMAGE_TAG" logs --tail=40 job-embedding-worker >&2 || true

  echo ">>> Local health probe:" >&2
  curl -sS -m 5 "http://127.0.0.1:5001/health" >&2 || echo "(health endpoint unreachable)" >&2
  echo >&2
}

rollback() {
  echo "!!! Deployment failed! Initiating automatic rollback..." >&2
  print_failure_diagnostics

  echo ">>> Stopping failed release stack ($RELEASE_SHA) to free host ports..." >&2
  stop_release_stack "$RELEASE_DIR" "$IMAGE_TAG"

  if [[ -n "$CURRENT_IMAGE" && -n "$CURRENT_RELEASE" && -d "$RELEASES_DIR/$CURRENT_RELEASE" ]]; then
    echo ">>> Rolling back to previous stable release ($CURRENT_RELEASE) with image $CURRENT_IMAGE..." >&2
    stop_release_stack "$RELEASES_DIR/$CURRENT_RELEASE" "$CURRENT_IMAGE"
    compose_in "$RELEASES_DIR/$CURRENT_RELEASE" "$CURRENT_IMAGE" up -d --remove-orphans || true
    echo ">>> Rollback containers restarted for release ${CURRENT_RELEASE}." >&2
  else
    echo "!!! Unable to roll back automatically: missing previous release/image state." >&2
  fi

  if [[ "$NGINX_CHANGED" == "true" && -f "$NGINX_BACKUP" ]]; then
    echo ">>> Restoring previous Nginx configuration..." >&2
    sudo cp -f "$NGINX_BACKUP" "$NGINX_TARGET"
    sudo nginx -t && sudo systemctl reload nginx || true
  fi
  echo "!!! Rollback finished. See FAILURE DETAILS above for the root cause." >&2
}

trap on_error ERR
trap 'if [[ "$DEPLOY_SUCCESS" != "true" ]]; then rollback; fi' EXIT

CURRENT_STEP="validate-compose"
echo ">>> Validating Docker Compose configuration..."
export BACKEND_IMAGE="$IMAGE_TAG"
docker compose -p "$COMPOSE_PROJECT" -f compose.yaml config >/dev/null

CURRENT_STEP="pull-image"
echo ">>> Pulling exact SHA-tagged Docker image: $IMAGE_TAG..."
docker pull "$IMAGE_TAG"

CURRENT_STEP="prisma-migrate"
echo ">>> Running Prisma migrations once before replacing healthy services..."
docker run --rm \
  --env-file "$ENV_FILE" \
  -e RUN_MIGRATIONS=false \
  -e RUN_SEEDS_ON_STARTUP=false \
  -e JOB_INGESTION_ON_STARTUP_ENABLED=false \
  "$IMAGE_TAG" npx prisma migrate deploy
echo ">>> Prisma migrations completed successfully."

CURRENT_STEP="compose-up"
# Previous releases used the directory name as the compose project, so both
# stacks tried to bind 127.0.0.1:5001. Stop the live stack (and any half-created
# target stack) before bringing the new release up under a fixed project name.
if [[ -n "$CURRENT_RELEASE" && "$CURRENT_RELEASE" != "$RELEASE_SHA" ]]; then
  echo ">>> Stopping current release ($CURRENT_RELEASE) to free 127.0.0.1:5001..."
  stop_release_stack "$RELEASES_DIR/$CURRENT_RELEASE" "${CURRENT_IMAGE:-$IMAGE_TAG}"
fi
echo ">>> Clearing any leftover containers for project ${COMPOSE_PROJECT}..."
stop_release_stack "$RELEASE_DIR" "$IMAGE_TAG"

echo ">>> Starting backend services with Docker Compose (project=${COMPOSE_PROJECT})..."
docker compose -p "$COMPOSE_PROJECT" -f compose.yaml up -d --remove-orphans

CURRENT_STEP="health-check"
echo ">>> Verifying container-local health endpoint..."
./health-check.sh

# Synchronize Nginx configuration if changed
CURRENT_STEP="nginx-sync"
if [[ -f "$NGINX_TARGET" ]] && cmp -s "nginx.conf" "$NGINX_TARGET"; then
  echo ">>> Nginx configuration is unchanged. Skipping reload."
else
  echo ">>> Nginx configuration changed. Synchronizing and validating..."
  sudo mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled
  if [[ -f "$NGINX_TARGET" ]]; then
    sudo cp -f "$NGINX_TARGET" "$NGINX_BACKUP"
  fi
  sudo cp -f "nginx.conf" "$NGINX_TARGET"
  sudo ln -sf "$NGINX_TARGET" "$NGINX_ENABLED"
  sudo rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

  if sudo nginx -t; then
    echo ">>> Nginx configuration valid. Reloading Nginx..."
    sudo systemctl reload nginx
    NGINX_CHANGED="true"
  else
    FAILURE_REASON="Nginx validation failed after copying nginx.conf (step=nginx-sync)"
    echo "Error: ${FAILURE_REASON}" >&2
    exit 1
  fi
fi

CURRENT_STEP="record-state"
echo ">>> Recording successful deployment state..."
if [[ -n "$CURRENT_IMAGE" ]]; then
  echo "$CURRENT_IMAGE" > "$STATE_DIR/PREVIOUS_IMAGE"
fi
if [[ -n "$CURRENT_RELEASE" ]]; then
  echo "$CURRENT_RELEASE" > "$STATE_DIR/PREVIOUS_RELEASE"
  ln -sfn "$RELEASES_DIR/$CURRENT_RELEASE" "$BASE_DIR/previous"
fi

echo "$IMAGE_TAG" > "$STATE_DIR/CURRENT_IMAGE"
echo "$RELEASE_SHA" > "$STATE_DIR/CURRENT_RELEASE"
ln -sfn "$RELEASE_DIR" "$BASE_DIR/current"

DEPLOY_SUCCESS="true"
echo ">>> Backend deployment completed successfully for release $RELEASE_SHA!"

CURRENT_STEP="cleanup"
echo ">>> Safely cleaning up old release directories (retaining 3 most recent)..."
(
  cd "$RELEASES_DIR"
  ls -1t | tail -n +4 | xargs -r rm -rf -- || true
)

echo ">>> Pruning dangling Docker images safely..."
docker image prune -f || true

exit 0
