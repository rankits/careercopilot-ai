#!/usr/bin/env bash
# Career Copilot — one-command manual backend production deployment.
# Usage:
#   ./deploy/manual-deploy.sh production
#   ./deploy/manual-deploy.sh production <version>
#   ./deploy/manual-deploy.sh production <version> --deploy-only
#   ./deploy/manual-deploy.sh production --dry-run
#   ./deploy/manual-deploy.sh production --allow-dirty
#   ./deploy/manual-deploy.sh production --skip-tests
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${SCRIPT_DIR}/manual-deploy.env"
START_EPOCH="$(date +%s)"

ENVIRONMENT=""
VERSION_OVERRIDE=""
DRY_RUN="false"
ALLOW_DIRTY="false"
SKIP_TESTS="false"
DEPLOY_ONLY="false"

TMP_BUNDLE=""
TMP_REMOTE_SCRIPT=""
TMP_SSM_PARAMS=""
AWS_BIN="aws"

# ---------------------------------------------------------------------------
# Output helpers
# ---------------------------------------------------------------------------

supports_color() {
  [[ -t 1 ]] && [[ -z "${NO_COLOR:-}" ]] && [[ "${TERM:-}" != "dumb" ]]
}

if supports_color; then
  C_RESET=$'\033[0m'
  C_BOLD=$'\033[1m'
  C_DIM=$'\033[2m'
  C_RED=$'\033[31m'
  C_GREEN=$'\033[32m'
  C_YELLOW=$'\033[33m'
  C_CYAN=$'\033[36m'
else
  C_RESET="" C_BOLD="" C_DIM="" C_RED="" C_GREEN="" C_YELLOW="" C_CYAN=""
fi

ts() { date '+%Y-%m-%d %H:%M:%S'; }

log()  { printf '%s%s%s %s\n' "${C_DIM}" "$(ts)" "${C_RESET}" "$*"; }
info() { printf '%s%s%s %s%s%s\n' "${C_DIM}" "$(ts)" "${C_RESET}" "${C_CYAN}" "$*" "${C_RESET}"; }
ok()   { printf '%s%s%s %s%s%s\n' "${C_DIM}" "$(ts)" "${C_RESET}" "${C_GREEN}" "$*" "${C_RESET}"; }
warn() { printf '%s%s%s %s%s%s\n' "${C_DIM}" "$(ts)" "${C_RESET}" "${C_YELLOW}" "$*" "${C_RESET}" >&2; }
err()  { printf '%s%s%s %s%s%s\n' "${C_DIM}" "$(ts)" "${C_RESET}" "${C_RED}" "$*" "${C_RESET}" >&2; }
die()  { err "$*"; exit 1; }

stage() {
  printf '\n%s%s%s %s==> %s%s\n' "${C_DIM}" "$(ts)" "${C_RESET}" "${C_BOLD}" "$*" "${C_RESET}"
}

usage() {
  cat <<'EOF'
Career Copilot backend manual deployment

Usage:
  ./deploy/manual-deploy.sh production [version] [options]

Arguments:
  production          Target environment (only production is supported)
  version             Optional immutable image/release tag (default: 12-char git SHA)

Options:
  --deploy-only       Skip npm validate + docker build/push; SSM-deploy existing images.
                      Requires an explicit <version> tag already pushed to Docker Hub.
  --dry-run           Validate and print the plan; do not push, upload, or deploy
  --allow-dirty       Allow a dirty git working tree
  --skip-tests        EMERGENCY: skip npm test only (lint/typecheck/build/prisma still run)
  -h, --help          Show this help

Examples:
  ./deploy/manual-deploy.sh production
  ./deploy/manual-deploy.sh production 26e7f24 --deploy-only --allow-dirty

Local setup:
  1. cp deploy/manual-deploy.env.example deploy/manual-deploy.env
  2. Fill non-secret values in deploy/manual-deploy.env
  3. docker login
  4. aws sso login --profile <profile>   # or aws configure
  5. ./deploy/manual-deploy.sh production

Required env file keys:
  AWS_REGION, AWS_PROFILE, BACKEND_DEPLOYMENT_BUCKET, EC2_INSTANCE_ID,
  DOCKER_IMAGE_NAME, DOCKER_EMBEDDING_IMAGE_NAME, PUBLIC_HEALTH_URL

Never store AWS keys, Docker Hub tokens, DB credentials, or app secrets
in deploy/manual-deploy.env.
EOF
}

cleanup() {
  local code=$?
  [[ -n "${TMP_BUNDLE:-}" && -f "${TMP_BUNDLE}" ]] && rm -f "${TMP_BUNDLE}"
  [[ -n "${TMP_REMOTE_SCRIPT:-}" && -f "${TMP_REMOTE_SCRIPT}" ]] && rm -f "${TMP_REMOTE_SCRIPT}"
  [[ -n "${TMP_SSM_PARAMS:-}" && -f "${TMP_SSM_PARAMS}" ]] && rm -f "${TMP_SSM_PARAMS}"
  if [[ $code -ne 0 ]]; then
    err "Deployment aborted (exit ${code})."
  fi
}
trap cleanup EXIT

# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------

parse_args() {
  if [[ $# -lt 1 ]]; then
    usage
    exit 1
  fi

  while [[ $# -gt 0 ]]; do
    case "$1" in
      -h|--help)
        usage
        exit 0
        ;;
      --dry-run)
        DRY_RUN="true"
        shift
        ;;
      --allow-dirty)
        ALLOW_DIRTY="true"
        shift
        ;;
      --skip-tests)
        SKIP_TESTS="true"
        shift
        ;;
      --deploy-only)
        DEPLOY_ONLY="true"
        shift
        ;;
      production)
        if [[ -n "${ENVIRONMENT}" ]]; then
          die "Environment already set to '${ENVIRONMENT}'."
        fi
        ENVIRONMENT="production"
        shift
        ;;
      -*)
        die "Unknown option: $1 (use --help)"
        ;;
      *)
        if [[ -z "${ENVIRONMENT}" ]]; then
          die "First argument must be the environment (production). Got: $1"
        fi
        if [[ -n "${VERSION_OVERRIDE}" ]]; then
          die "Unexpected extra argument: $1"
        fi
        VERSION_OVERRIDE="$1"
        shift
        ;;
    esac
  done

  [[ "${ENVIRONMENT}" == "production" ]] || die "Only the 'production' environment is supported."
  if [[ "${DEPLOY_ONLY}" == "true" && -z "${VERSION_OVERRIDE}" ]]; then
    die "--deploy-only requires an explicit version/image tag (e.g. production 26e7f24 --deploy-only)."
  fi
}

require_cmd() {
  local cmd="$1"
  command -v "${cmd}" >/dev/null 2>&1 || die "Required command not found: ${cmd}"
}

# Prefer aws from PATH; on Git Bash / mixed Windows setups also accept aws.exe.
resolve_aws() {
  if command -v aws >/dev/null 2>&1; then
    AWS_BIN="aws"
  elif command -v aws.exe >/dev/null 2>&1; then
    AWS_BIN="aws.exe"
  else
    die "Required command not found: aws (install AWS CLI v2 and ensure it is on PATH)"
  fi
}

aws_cli() {
  "${AWS_BIN}" "$@"
}

base64_encode_file() {
  local file="$1"
  if base64 --help 2>&1 | grep -q -- '-w'; then
    base64 -w 0 < "${file}"
  else
    base64 < "${file}" | tr -d '\n'
  fi
}

# ---------------------------------------------------------------------------
# Stages
# ---------------------------------------------------------------------------

load_config() {
  stage "Load local configuration"
  [[ -f "${ENV_FILE}" ]] || die "Missing ${ENV_FILE}. Copy deploy/manual-deploy.env.example and fill it in."

  # Normalize CRLF so Windows-edited env files source cleanly under bash.
  local normalized
  normalized="$(mktemp "${TMPDIR:-/tmp}/career-copilot-env-XXXXXX")"
  tr -d '\r' < "${ENV_FILE}" > "${normalized}"

  set -a
  # shellcheck disable=SC1090
  source "${normalized}"
  set +a
  rm -f "${normalized}"

  local required=(
    AWS_REGION
    AWS_PROFILE
    BACKEND_DEPLOYMENT_BUCKET
    EC2_INSTANCE_ID
    DOCKER_IMAGE_NAME
    DOCKER_EMBEDDING_IMAGE_NAME
    PUBLIC_HEALTH_URL
  )
  local key
  for key in "${required[@]}"; do
    [[ -n "${!key:-}" ]] || die "Missing required config key: ${key}"
  done

  export AWS_PROFILE AWS_REGION
  export AWS_DEFAULT_REGION="${AWS_REGION}"

  [[ "${DOCKER_IMAGE_NAME}" != *":latest" ]] || die "DOCKER_IMAGE_NAME must not include :latest"
  [[ "${DOCKER_IMAGE_NAME}" != *":" ]] || die "DOCKER_IMAGE_NAME must be repository only (no tag)."
  [[ "${DOCKER_EMBEDDING_IMAGE_NAME}" != *":latest" ]] || die "DOCKER_EMBEDDING_IMAGE_NAME must not include :latest"
  [[ "${DOCKER_EMBEDDING_IMAGE_NAME}" != *":" ]] || die "DOCKER_EMBEDDING_IMAGE_NAME must be repository only (no tag)."

  ok "Loaded ${ENV_FILE} (profile=${AWS_PROFILE}, region=${AWS_REGION})"
}

validate_tooling() {
  stage "Validate local tooling and authentication"
  local cmd
  for cmd in git docker tar curl; do
    require_cmd "${cmd}"
  done
  resolve_aws

  docker info >/dev/null 2>&1 || die "docker info failed. Is Docker running? Have you run 'docker login'?"
  aws_cli sts get-caller-identity --profile "${AWS_PROFILE}" --region "${AWS_REGION}" >/dev/null \
    || die "aws sts get-caller-identity failed. Run 'aws sso login --profile ${AWS_PROFILE}' or 'aws configure'."

  ok "git/docker/aws/tar/curl available; Docker and AWS auth OK"
}

determine_version() {
  stage "Determine immutable version"
  cd "${REPO_ROOT}"

  if [[ -n "$(git status --porcelain)" ]]; then
    if [[ "${ALLOW_DIRTY}" == "true" ]]; then
      warn "Git working tree is dirty; continuing because --allow-dirty was set."
    else
      die "Git working tree is dirty. Commit/stash changes or pass --allow-dirty."
    fi
  fi

  if [[ -n "${VERSION_OVERRIDE}" ]]; then
    VERSION="${VERSION_OVERRIDE}"
  else
    VERSION="$(git rev-parse --short=12 HEAD)"
  fi

  [[ -n "${VERSION}" ]] || die "VERSION resolved empty."
  [[ "${VERSION}" != "latest" ]] || die "Refusing to deploy tag 'latest'."
  [[ "${VERSION}" =~ ^[A-Za-z0-9._-]+$ ]] || die "VERSION contains invalid characters: ${VERSION}"

  IMAGE="${DOCKER_IMAGE_NAME}:${VERSION}"
  EMBEDDING_IMAGE="${DOCKER_EMBEDDING_IMAGE_NAME}:${VERSION}"
  BUNDLE="career-copilot-backend-${VERSION}.tar.gz"
  S3_URI="s3://${BACKEND_DEPLOYMENT_BUCKET}/backend/${BUNDLE}"

  ok "Version=${VERSION}"
  ok "Image=${IMAGE}"
  ok "EmbeddingImage=${EMBEDDING_IMAGE}"
  ok "Bundle=${BUNDLE}"
}

run_backend_validation() {
  stage "Validate backend (blocking)"
  cd "${REPO_ROOT}/backend"

  if [[ "${SKIP_TESTS}" == "true" ]]; then
    warn "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
    warn "EMERGENCY FLAG --skip-tests: npm test will be skipped."
    warn "lint / typecheck / build / prisma validate still run."
    warn "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
  fi

  info "npm ci"
  npm ci

  info "npx prisma generate"
  npx prisma generate

  info "npm run lint"
  npm run lint

  info "npm run typecheck"
  npm run typecheck

  if [[ "${SKIP_TESTS}" == "true" ]]; then
    warn "Skipping npm test"
  else
    info "npm test"
    npm test
  fi

  info "npm run build"
  npm run build

  info "npx prisma validate"
  npx prisma validate

  cd "${REPO_ROOT}"
  ok "Backend validation passed"
}

build_and_push_image() {
  stage "Build and push Docker images (${IMAGE}, ${EMBEDDING_IMAGE})"
  cd "${REPO_ROOT}"

  if [[ "${DRY_RUN}" == "true" ]]; then
    info "[dry-run] Would run: docker buildx build --platform linux/amd64 -f backend/docker/Dockerfile.prod -t ${IMAGE} --push backend"
    info "[dry-run] Would run: docker buildx build --platform linux/amd64 -f embedding-service/Dockerfile -t ${EMBEDDING_IMAGE} --push embedding-service"
    return 0
  fi

  docker buildx build \
    --platform linux/amd64 \
    -f backend/docker/Dockerfile.prod \
    -t "${IMAGE}" \
    --push \
    backend

  ok "Pushed ${IMAGE}"

  docker buildx build \
    --platform linux/amd64 \
    -f embedding-service/Dockerfile \
    -t "${EMBEDDING_IMAGE}" \
    --push \
    embedding-service

  ok "Pushed ${EMBEDDING_IMAGE}"
}

package_bundle() {
  stage "Package deploy/backend (no secrets)"
  cd "${REPO_ROOT}"

  TMP_BUNDLE="$(mktemp "${TMPDIR:-/tmp}/career-copilot-backend-XXXXXX.tar.gz")"

  tar -czf "${TMP_BUNDLE}" \
    --exclude='.env' \
    --exclude='.env.local' \
    --exclude='.env.production' \
    --exclude='.env.development' \
    --exclude='.env.staging' \
    --exclude='*.env' \
    --exclude='*secret*' \
    --exclude='*credential*' \
    --exclude='*.pem' \
    --exclude='*.key' \
    --exclude='manual-deploy.env' \
    -C deploy/backend .

  local members
  members="$(tar -tzf "${TMP_BUNDLE}" | sed 's|^\./||')"
  if printf '%s\n' "${members}" | grep -qx '.env'; then
    die "Bundle must not contain .env"
  fi
  if printf '%s\n' "${members}" | grep -E '(^|/)(\.env\.local|\.env\.production|\.env\.development|\.env\.staging)$' >/dev/null; then
    die "Bundle must not contain environment secret files"
  fi
  if printf '%s\n' "${members}" | grep -Ei '(^|/)(.*secret.*|.*credential.*|.*\.pem|.*\.key)$' >/dev/null; then
    die "Bundle appears to contain secrets. Aborting."
  fi

  info "Bundle contents:"
  tar -tzf "${TMP_BUNDLE}" | sed 's/^/  /'

  # Ensure required deploy files exist (tar may list ./name or name)
  local required_member
  for required_member in compose.yaml deploy.sh install-release.sh health-check.sh nginx.conf; do
    if ! tar -tzf "${TMP_BUNDLE}" | sed 's|^\./||' | grep -qx "${required_member}"; then
      die "Bundle missing required file: ${required_member}"
    fi
  done

  ok "Packaged ${TMP_BUNDLE}"
}

upload_bundle() {
  stage "Upload bundle to S3"
  if [[ "${DRY_RUN}" == "true" ]]; then
    info "[dry-run] Would upload to ${S3_URI}"
    return 0
  fi

  aws_cli s3 cp \
    "${TMP_BUNDLE}" \
    "${S3_URI}" \
    --region "${AWS_REGION}" \
    --profile "${AWS_PROFILE}" \
    --sse AES256

  ok "Uploaded ${S3_URI}"
}

write_remote_script() {
  TMP_REMOTE_SCRIPT="$(mktemp "${TMPDIR:-/tmp}/career-copilot-remote-XXXXXX.sh")"

  cat > "${TMP_REMOTE_SCRIPT}" <<EOF
#!/bin/bash
set -Eeuo pipefail

VERSION="${VERSION}"
IMAGE="${IMAGE}"
EMBEDDING_IMAGE="${EMBEDDING_IMAGE}"
S3_URI="${S3_URI}"
AWS_REGION="${AWS_REGION}"
BUNDLE="${BUNDLE}"
BASE_DIR="/opt/career-copilot/backend"
RELEASE_DIR="\${BASE_DIR}/releases/\${VERSION}"
ENV_FILE="\${BASE_DIR}/shared/.env"
TMP_BUNDLE="/tmp/\${BUNDLE}"

echo ">>> [remote] Starting Career Copilot backend deploy for \${VERSION}"
echo ">>> [remote] Backend image: \${IMAGE}"
echo ">>> [remote] Embedding image: \${EMBEDDING_IMAGE}"
echo ">>> [remote] Bundle: \${S3_URI}"

test -f "\${ENV_FILE}" || { echo "Error: production env missing at \${ENV_FILE}" >&2; exit 1; }

mkdir -p "\${RELEASE_DIR}" "\${BASE_DIR}/state" "\${BASE_DIR}/logs" "\${BASE_DIR}/bin"

echo ">>> [remote] Downloading deployment bundle from S3..."
aws s3 cp "\${S3_URI}" "\${TMP_BUNDLE}" --region "\${AWS_REGION}"

echo ">>> [remote] Extracting release to \${RELEASE_DIR}..."
# Idempotent for the same version: replace release contents safely.
rm -rf "\${RELEASE_DIR}"
mkdir -p "\${RELEASE_DIR}"
tar -xzf "\${TMP_BUNDLE}" -C "\${RELEASE_DIR}"
rm -f "\${TMP_BUNDLE}"

cd "\${RELEASE_DIR}"

echo ">>> [remote] Validating shell scripts..."
test -f compose.yaml
test -f deploy.sh
test -f install-release.sh
test -f health-check.sh
test -f nginx.conf
bash -n deploy.sh
bash -n install-release.sh
bash -n health-check.sh
chmod +x deploy.sh install-release.sh health-check.sh

echo ">>> [remote] Validating Docker Compose configuration..."
export BACKEND_IMAGE="\${IMAGE}"
export EMBEDDING_IMAGE="\${EMBEDDING_IMAGE}"
export SHARED_ENV_FILE="\${ENV_FILE}"
docker compose -f compose.yaml config >/dev/null

# install-release.sh -> deploy.sh:
# lock, pull exact images, prisma migrate deploy once, compose up (api +
# embedding-service + outbox), local /health, nginx test+reload, state update,
# auto-rollback on failure (without -v so model cache survives), retain 3 releases.
echo ">>> [remote] Invoking install-release.sh..."
exec ./install-release.sh "\${IMAGE}" "\${VERSION}" "\${EMBEDDING_IMAGE}"
EOF
}
deploy_via_ssm() {
  stage "Deploy on EC2 via AWS SSM Run Command"
  write_remote_script

  local encoded
  encoded="$(base64_encode_file "${TMP_REMOTE_SCRIPT}")"
  [[ -n "${encoded}" ]] || die "Failed to base64-encode remote script."

  if [[ "${DRY_RUN}" == "true" ]]; then
    info "[dry-run] Would send SSM Run Command to ${EC2_INSTANCE_ID}"
    info "[dry-run] Remote script preview:"
    sed 's/^/  /' "${TMP_REMOTE_SCRIPT}"
    return 0
  fi

  TMP_SSM_PARAMS="$(mktemp "${TMPDIR:-/tmp}/career-copilot-ssm-XXXXXX.json")"

  # Base64 alphabet is single-quote safe. AWS-RunShellScript uses /bin/sh, so
  # decode and execute explicitly with /bin/bash.
  if command -v python3 >/dev/null 2>&1; then
    python3 - "${encoded}" "${TMP_SSM_PARAMS}" <<'PY'
import json, sys
encoded = sys.argv[1]
out = sys.argv[2]
command = "echo '{}' | base64 -d | /bin/bash".format(encoded)
with open(out, "w", encoding="utf-8") as fh:
    json.dump({"commands": [command]}, fh)
PY
  elif command -v python >/dev/null 2>&1; then
    python - "${encoded}" "${TMP_SSM_PARAMS}" <<'PY'
import json, sys
encoded = sys.argv[1]
out = sys.argv[2]
command = "echo '{}' | base64 -d | /bin/bash".format(encoded)
with open(out, "w", encoding="utf-8") as fh:
    json.dump({"commands": [command]}, fh)
PY
  else
    printf '{"commands":["echo '\''%s'\'' | base64 -d | /bin/bash"]}\n' "${encoded}" > "${TMP_SSM_PARAMS}"
  fi

  info "Sending SSM command to ${EC2_INSTANCE_ID}..."
  local command_id
  command_id="$(
    aws_cli ssm send-command \
      --document-name "AWS-RunShellScript" \
      --instance-ids "${EC2_INSTANCE_ID}" \
      --comment "Career Copilot backend manual deploy ${VERSION}" \
      --parameters "file://${TMP_SSM_PARAMS}" \
      --timeout-seconds 1800 \
      --region "${AWS_REGION}" \
      --profile "${AWS_PROFILE}" \
      --query "Command.CommandId" \
      --output text
  )"

  [[ -n "${command_id}" && "${command_id}" != "None" ]] || die "SSM send-command did not return a CommandId."
  ok "SSM CommandId=${command_id}"

  poll_ssm "${command_id}"
}

poll_ssm() {
  local command_id="$1"
  local status="Pending"
  local attempt
  local max_attempts=180  # 180 * 5s = 15 minutes

  stage "Wait for SSM command completion"
  for attempt in $(seq 1 "${max_attempts}"); do
    status="$(
      aws_cli ssm get-command-invocation \
        --command-id "${command_id}" \
        --instance-id "${EC2_INSTANCE_ID}" \
        --region "${AWS_REGION}" \
        --profile "${AWS_PROFILE}" \
        --query "Status" \
        --output text 2>/dev/null || echo "Pending"
    )"

    log "SSM poll ${attempt}/${max_attempts}: ${status}"

    case "${status}" in
      Success|Failed|Cancelled|TimedOut|Cancelling)
        break
        ;;
    esac
    sleep 5
  done

  local stdout_content="" stderr_content=""
  stdout_content="$(
    aws_cli ssm get-command-invocation \
      --command-id "${command_id}" \
      --instance-id "${EC2_INSTANCE_ID}" \
      --region "${AWS_REGION}" \
      --profile "${AWS_PROFILE}" \
      --query "StandardOutputContent" \
      --output text 2>/dev/null || true
  )"
  stderr_content="$(
    aws_cli ssm get-command-invocation \
      --command-id "${command_id}" \
      --instance-id "${EC2_INSTANCE_ID}" \
      --region "${AWS_REGION}" \
      --profile "${AWS_PROFILE}" \
      --query "StandardErrorContent" \
      --output text 2>/dev/null || true
  )"

  echo
  info "--- SSM StandardOutputContent ---"
  printf '%s\n' "${stdout_content}"
  echo
  info "--- SSM StandardErrorContent ---"
  printf '%s\n' "${stderr_content}"
  echo

  if [[ "${status}" != "Success" ]]; then
    echo
    err "SSM deployment failed with status: ${status}"
    echo
    info "--- Extracted failure reason (from EC2 deploy.sh) ---"
    # Prefer explicit failure markers written by deploy/backend/deploy.sh
    {
      printf '%s\n%s\n' "${stderr_content}" "${stdout_content}"
    } | grep -E 'FAILURE DETECTED|DEPLOYMENT FAILURE DETAILS|Reason:|Failed step:|Health check failed|Error:|Prisma|Nginx validation' \
      || true
    echo
    die "Remote deploy failed (SSM ${status}). See failure reason / logs above. CommandId=${command_id}"
  fi
  ok "SSM deployment succeeded"
}

verify_public_health() {
  stage "Verify public health endpoint"
  if [[ "${DRY_RUN}" == "true" ]]; then
    info "[dry-run] Would curl --fail ${PUBLIC_HEALTH_URL}"
    return 0
  fi

  curl --fail --retry 12 --retry-delay 5 --retry-all-errors \
    --connect-timeout 5 --max-time 20 \
    "${PUBLIC_HEALTH_URL}"
  echo
  ok "Public health check passed: ${PUBLIC_HEALTH_URL}"
}

print_summary() {
  local end_epoch duration
  end_epoch="$(date +%s)"
  duration="$((end_epoch - START_EPOCH))"

  stage "Deployment summary"
  if [[ "${DRY_RUN}" == "true" ]]; then
    printf '%sDry-run complete (no push / upload / deploy)%s\n\n' "${C_YELLOW}" "${C_RESET}"
  else
    printf '%sDeployment successful%s\n\n' "${C_GREEN}${C_BOLD}" "${C_RESET}"
  fi

  cat <<EOF
Version:     ${VERSION}
Image:       ${IMAGE}
Embedding:   ${EMBEDDING_IMAGE}
S3 object:   ${S3_URI}
EC2:         ${EC2_INSTANCE_ID}
Health:      ${PUBLIC_HEALTH_URL}
Duration:    ${duration}s
Dry-run:     ${DRY_RUN}
EOF
}

print_plan() {
  stage "Planned operations"
  if [[ "${DEPLOY_ONLY}" == "true" ]]; then
    cat <<EOF
  [deploy-only] Skipping npm validate and docker build/push
  1. Validate tooling + AWS/Docker auth
  2. Use provided version → ${VERSION}
     Backend:    ${IMAGE}
     Embedding:  ${EMBEDDING_IMAGE}
  3. Package deploy/backend → ${BUNDLE}
  4. Upload ${S3_URI}
  5. SSM Run Command on ${EC2_INSTANCE_ID}:
       download bundle → pull provided images → migrate → compose up
       → /health → nginx → state (rollback on failure, keep model cache)
  6. Poll SSM result
  7. curl --fail ${PUBLIC_HEALTH_URL}
EOF
    return 0
  fi
  cat <<EOF
  1. Validate tooling + AWS/Docker auth
  2. Resolve version → ${VERSION}
  3. Backend: npm ci, prisma generate, lint, typecheck, test, build, prisma validate
  4. docker buildx build/push ${IMAGE} (linux/amd64)
  5. docker buildx build/push ${EMBEDDING_IMAGE} (linux/amd64)
  6. Package deploy/backend → ${BUNDLE}
  7. Upload ${S3_URI}
  8. SSM Run Command on ${EC2_INSTANCE_ID}:
       download bundle → extract release → validate scripts/compose
       → pull backend + embedding images → prisma migrate deploy
       → compose up (embedding-service, api, outbox-relay)
       → local /health → nginx -t/reload → update state
       → auto-rollback on failure (no volume wipe) → retain 3 releases
  9. Poll SSM result
 10. curl --fail ${PUBLIC_HEALTH_URL}
EOF
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

main() {
  parse_args "$@"
  cd "${REPO_ROOT}"

  load_config
  validate_tooling
  determine_version
  print_plan

  if [[ "${DEPLOY_ONLY}" != "true" ]]; then
    run_backend_validation
    build_and_push_image
  else
    warn "DEPLOY-ONLY: using existing images ${IMAGE} and ${EMBEDDING_IMAGE}"
    warn "DEPLOY-ONLY: skipped npm validation and docker build/push"
  fi

  package_bundle
  upload_bundle
  deploy_via_ssm
  verify_public_health
  print_summary
}

main "$@"
