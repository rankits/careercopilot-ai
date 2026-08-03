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

rollback() {
  echo "!!! Deployment failed! Initiating automatic rollback..." >&2
  if [[ -n "$CURRENT_IMAGE" && -n "$CURRENT_RELEASE" && -d "$RELEASES_DIR/$CURRENT_RELEASE" ]]; then
    echo ">>> Rolling back to previous stable release ($CURRENT_RELEASE) with image $CURRENT_IMAGE..."
    (
      cd "$RELEASES_DIR/$CURRENT_RELEASE"
      export BACKEND_IMAGE="$CURRENT_IMAGE"
      docker compose -f compose.yaml down --remove-orphans || true
      docker compose -f compose.yaml up -d --remove-orphans || true
    ) || true
  fi

  if [[ "$NGINX_CHANGED" == "true" && -f "$NGINX_BACKUP" ]]; then
    echo ">>> Restoring previous Nginx configuration..."
    sudo cp -f "$NGINX_BACKUP" "$NGINX_TARGET"
    sudo nginx -t && sudo systemctl reload nginx || true
  fi
  echo "!!! Rollback completed." >&2
}

trap 'if [[ "$DEPLOY_SUCCESS" != "true" ]]; then rollback; fi' EXIT

echo ">>> Validating Docker Compose configuration..."
export BACKEND_IMAGE="$IMAGE_TAG"
docker compose -f compose.yaml config >/dev/null

echo ">>> Pulling exact SHA-tagged Docker image: $IMAGE_TAG..."
docker pull "$IMAGE_TAG"

echo ">>> Running Prisma migrations once before replacing healthy services..."
docker run --rm \
  --env-file "$ENV_FILE" \
  -e RUN_MIGRATIONS=false \
  -e RUN_SEEDS_ON_STARTUP=false \
  -e JOB_INGESTION_ON_STARTUP_ENABLED=false \
  "$IMAGE_TAG" npx prisma migrate deploy
echo ">>> Prisma migrations completed successfully."

echo ">>> Starting backend services with Docker Compose..."
docker compose -f compose.yaml up -d --remove-orphans

echo ">>> Verifying container-local health endpoint..."
./health-check.sh

# Synchronize Nginx configuration if changed
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
    echo "Error: Nginx validation failed! Aborting deployment." >&2
    exit 1
  fi
fi

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

echo ">>> Safely cleaning up old release directories (retaining 3 most recent)..."
(
  cd "$RELEASES_DIR"
  ls -1t | tail -n +4 | xargs -r rm -rf -- || true
)

echo ">>> Pruning dangling Docker images safely..."
docker image prune -f || true

exit 0
