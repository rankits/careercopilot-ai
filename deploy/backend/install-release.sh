#!/usr/bin/env bash
set -Eeuo pipefail

# Wrapper script invoked by AWS SSM Run Command to install and deploy a release.
# Validates parameters, sets permissions, and delegates to deploy.sh.

IMAGE_TAG="${1:-}"
RELEASE_SHA="${2:-}"
EMBEDDING_IMAGE_TAG="${3:-${EMBEDDING_IMAGE:-}}"

if [[ -z "$IMAGE_TAG" || -z "$RELEASE_SHA" || -z "$EMBEDDING_IMAGE_TAG" ]]; then
  echo "Error: Missing arguments." >&2
  echo "Usage: $0 <backend-image-tag> <release-sha> <embedding-image-tag>" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ">>> Starting release installation for SHA: $RELEASE_SHA"
echo ">>> Target backend image: $IMAGE_TAG"
echo ">>> Target embedding image: $EMBEDDING_IMAGE_TAG"

mkdir -p /opt/career-copilot/backend/bin
cp -f "$SCRIPT_DIR/deploy.sh" "$SCRIPT_DIR/install-release.sh" "$SCRIPT_DIR/health-check.sh" /opt/career-copilot/backend/bin/
chmod +x /opt/career-copilot/backend/bin/*.sh "$SCRIPT_DIR/deploy.sh" "$SCRIPT_DIR/health-check.sh"

exec "$SCRIPT_DIR/deploy.sh" "$IMAGE_TAG" "$RELEASE_SHA" "$EMBEDDING_IMAGE_TAG"
