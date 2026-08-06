#!/usr/bin/env bash
# Career Copilot — one-command manual frontend production deployment.
# Usage:
#   ./deploy/frontend-manual-deploy.sh production
#   ./deploy/frontend-manual-deploy.sh production <version>
#   ./deploy/frontend-manual-deploy.sh production --dry-run
#   ./deploy/frontend-manual-deploy.sh production --allow-dirty
#   ./deploy/frontend-manual-deploy.sh production --skip-tests
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${SCRIPT_DIR}/frontend-manual-deploy.env"
START_EPOCH="$(date +%s)"

ENVIRONMENT=""
VERSION_OVERRIDE=""
DRY_RUN="false"
ALLOW_DIRTY="false"
SKIP_TESTS="false"

AWS_BIN="aws"
NODE_BIN="node"
NPM_BIN="npm"
INVALIDATION_ID=""
ROLLBACK_STATUS="not-required"
PREVIOUS_VERSION=""
CURRENT_VERSION_BEFORE=""

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
Career Copilot frontend manual deployment

Usage:
  ./deploy/frontend-manual-deploy.sh production [version] [options]

Arguments:
  production          Target environment (only production is supported)
  version             Optional immutable release tag (default: 12-char git SHA)

Options:
  --dry-run           Validate/build and print the plan; do not upload or promote
  --allow-dirty       Allow a dirty git working tree
  --skip-tests        EMERGENCY: skip npm test only
  -h, --help          Show this help

Local setup:
  1. cp deploy/frontend-manual-deploy.env.example deploy/frontend-manual-deploy.env
  2. Fill non-secret values (bucket, CloudFront ID, public URL, Vite vars)
  3. aws sso login --profile <profile>   # or: aws configure
  4. ./deploy/frontend-manual-deploy.sh production

Required env file keys:
  AWS_PROFILE, AWS_REGION, FRONTEND_S3_BUCKET, CLOUDFRONT_DISTRIBUTION_ID,
  FRONTEND_PUBLIC_URL, FRONTEND_DIRECTORY, FRONTEND_BUILD_DIRECTORY,
  VITE_API_BASE_URL, VITE_APP_NAME, VITE_APP_ENV, VITE_PUBLIC_APP_URL

Never store AWS access keys or application secrets in
deploy/frontend-manual-deploy.env.
EOF
}

cleanup() {
  local code=$?
  if [[ $code -ne 0 ]]; then
    err "Deployment aborted (exit ${code})."
  fi
}
trap cleanup EXIT

# ---------------------------------------------------------------------------
# Argument parsing / helpers
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
}

require_cmd() {
  local cmd="$1"
  command -v "${cmd}" >/dev/null 2>&1 || die "Required command not found: ${cmd}"
}

resolve_aws() {
  if command -v aws >/dev/null 2>&1; then
    AWS_BIN="aws"
  elif command -v aws.exe >/dev/null 2>&1; then
    AWS_BIN="aws.exe"
  else
    die "Required command not found: aws (install AWS CLI v2 and ensure it is on PATH)"
  fi
}

# Prefer Unix node/npm; on WSL/Git Bash also accept Windows node.exe / npm.cmd.
resolve_node_npm() {
  if command -v node >/dev/null 2>&1; then
    NODE_BIN="node"
  elif command -v node.exe >/dev/null 2>&1; then
    NODE_BIN="node.exe"
  elif [[ -x /mnt/c/nvm4w/nodejs/node.exe ]]; then
    NODE_BIN="/mnt/c/nvm4w/nodejs/node.exe"
  elif [[ -x "/mnt/c/Program Files/nodejs/node.exe" ]]; then
    NODE_BIN="/mnt/c/Program Files/nodejs/node.exe"
  else
    die "Required command not found: node (install Node.js 20+ and ensure it is on PATH)"
  fi

  local node_dir
  if [[ "${NODE_BIN}" == /* || "${NODE_BIN}" == [A-Za-z]:* ]]; then
    node_dir="$(dirname "${NODE_BIN}")"
  else
    node_dir="$(dirname "$(command -v "${NODE_BIN}")")"
  fi
  # When using a Windows node.exe path, ensure its directory is searchable for npm.cmd.
  if [[ -d "${node_dir}" ]]; then
    case ":${PATH}:" in
      *":${node_dir}:"*) ;;
      *) export PATH="${node_dir}:${PATH}" ;;
    esac
  fi

  if command -v npm >/dev/null 2>&1; then
    NPM_BIN="npm"
  elif command -v npm.cmd >/dev/null 2>&1; then
    NPM_BIN="npm.cmd"
  elif command -v npm.exe >/dev/null 2>&1; then
    NPM_BIN="npm.exe"
  elif [[ -f "${node_dir}/npm.cmd" ]]; then
    NPM_BIN="${node_dir}/npm.cmd"
  elif [[ -f "${node_dir}/npm" ]]; then
    NPM_BIN="${node_dir}/npm"
  else
    die "Required command not found: npm (install Node.js/npm and ensure it is on PATH)"
  fi

  local node_major node_ver
  node_ver="$("${NODE_BIN}" -v 2>/dev/null | tr -d 'v' || true)"
  node_major="${node_ver%%.*}"
  if [[ -z "${node_major}" ]]; then
    die "Unable to execute ${NODE_BIN}. Check your Node.js install."
  fi
  if [[ "${node_major}" -lt 18 ]]; then
    die "Node.js ${node_ver} detected via ${NODE_BIN}; Node.js 18+ is required."
  fi

  info "Using NODE_BIN=${NODE_BIN} NPM_BIN=${NPM_BIN} (node v${node_ver})"
}

aws_cli() {
  "${AWS_BIN}" "$@"
}

npm_cli() {
  "${NPM_BIN}" "$@"
}

# ---------------------------------------------------------------------------
# Stages
# ---------------------------------------------------------------------------

load_config() {
  stage "Load local configuration"
  [[ -f "${ENV_FILE}" ]] || die "Missing ${ENV_FILE}. Copy deploy/frontend-manual-deploy.env.example and fill it in."

  local normalized
  normalized="$(mktemp "${TMPDIR:-/tmp}/career-copilot-fe-env-XXXXXX")"
  tr -d '\r' < "${ENV_FILE}" > "${normalized}"

  set -a
  # shellcheck disable=SC1090
  source "${normalized}"
  set +a
  rm -f "${normalized}"

  local required=(
    AWS_PROFILE
    AWS_REGION
    FRONTEND_S3_BUCKET
    CLOUDFRONT_DISTRIBUTION_ID
    FRONTEND_PUBLIC_URL
    FRONTEND_DIRECTORY
    FRONTEND_BUILD_DIRECTORY
    VITE_API_BASE_URL
    VITE_APP_NAME
    VITE_APP_ENV
    VITE_PUBLIC_APP_URL
  )
  local key
  for key in "${required[@]}"; do
    [[ -n "${!key:-}" ]] || die "Missing required config key: ${key}"
  done

  export AWS_PROFILE AWS_REGION
  export AWS_DEFAULT_REGION="${AWS_REGION}"
  export VITE_API_BASE_URL VITE_APP_NAME VITE_APP_ENV VITE_PUBLIC_APP_URL

  FRONTEND_DIR="${REPO_ROOT}/${FRONTEND_DIRECTORY}"
  BUILD_DIR="${FRONTEND_DIR}/${FRONTEND_BUILD_DIRECTORY}"
  RELEASE_PREFIX="releases/${VERSION:-PLACEHOLDER}"
  S3_BUCKET_URI="s3://${FRONTEND_S3_BUCKET}"

  [[ -d "${FRONTEND_DIR}" ]] || die "Frontend directory not found: ${FRONTEND_DIR}"
  [[ -f "${FRONTEND_DIR}/package.json" ]] || die "package.json not found in ${FRONTEND_DIR}"
  [[ -f "${FRONTEND_DIR}/package-lock.json" ]] || die "package-lock.json not found; this pipeline expects npm ci."

  if [[ -z "${VITE_API_BASE_URL:-}" ]]; then
    die "VITE_API_BASE_URL is missing from ${ENV_FILE}"
  fi

  if [[ "${ENVIRONMENT}" == "production" ]] &&
    [[ "${VITE_API_BASE_URL}" == *"localhost"* || "${VITE_API_BASE_URL}" == *"127.0.0.1"* ]]; then
    die "Production VITE_API_BASE_URL cannot use localhost"
  fi

  ok "Loaded ${ENV_FILE} (profile=${AWS_PROFILE}, region=${AWS_REGION})"
  info "VITE_API_BASE_URL is set for production build (value printed at build stage)"
}

validate_tooling() {
  stage "Validate local tooling and authentication"
  local cmd
  for cmd in git curl; do
    require_cmd "${cmd}"
  done
  resolve_node_npm
  resolve_aws

  aws_cli sts get-caller-identity --profile "${AWS_PROFILE}" --region "${AWS_REGION}" >/dev/null \
    || die "aws sts get-caller-identity failed. Run 'aws sso login --profile ${AWS_PROFILE}' or 'aws configure'."

  ok "git/node/npm/aws/curl available; AWS auth OK"
}

determine_version() {
  stage "Determine immutable version"
  cd "${REPO_ROOT}"

  if [[ -n "$(git status --porcelain 2>/dev/null || true)" ]]; then
    if [[ "${ALLOW_DIRTY}" == "true" ]]; then
      warn "Git working tree is dirty; continuing because --allow-dirty was set."
    else
      die "Git working tree is dirty. Commit/stash changes or pass --allow-dirty."
    fi
  fi

  if [[ -n "${VERSION_OVERRIDE}" ]]; then
    VERSION="${VERSION_OVERRIDE}"
  else
    VERSION="$(git rev-parse --short=12 HEAD 2>/dev/null || echo "manual-$(date +%s)")"
  fi

  [[ -n "${VERSION}" ]] || die "VERSION resolved empty."
  [[ "${VERSION}" != "latest" ]] || die "Refusing to deploy tag 'latest'."
  [[ "${VERSION}" =~ ^[A-Za-z0-9._-]+$ ]] || die "VERSION contains invalid characters: ${VERSION}"

  RELEASE_PREFIX="releases/${VERSION}"
  S3_RELEASE_URI="${S3_BUCKET_URI}/${RELEASE_PREFIX}/"
  STATE_CURRENT_KEY="deployment-state/current-version.txt"
  STATE_PREVIOUS_KEY="deployment-state/previous-version.txt"

  ok "Version=${VERSION}"
  ok "Release URI=${S3_RELEASE_URI}"
}

print_plan() {
  stage "Planned operations"
  cat <<EOF
  1. Validate tooling + AWS auth
  2. Resolve version → ${VERSION}
  3. Frontend: npm ci, format:check, lint, typecheck, test, build
  4. Validate ${FRONTEND_DIRECTORY}/${FRONTEND_BUILD_DIRECTORY}
  5. Upload build → ${S3_RELEASE_URI}
  6. Promote release to s3://${FRONTEND_S3_BUCKET}/ (exclude releases/* and deployment-state/*)
  7. Apply cache headers (HTML no-cache; hashed assets immutable)
  8. CloudFront invalidate /* on ${CLOUDFRONT_DISTRIBUTION_ID}
  9. Verify ${FRONTEND_PUBLIC_URL}
 10. Update deployment-state; prune old releases (keep 5)
 11. On verify failure → rollback to previous release
EOF
}

run_frontend_validation() {
  stage "Validate frontend (blocking)"
  cd "${FRONTEND_DIR}"

  if [[ "${SKIP_TESTS}" == "true" ]]; then
    warn "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
    warn "EMERGENCY FLAG --skip-tests: npm test will be skipped."
    warn "format / lint / typecheck / build still run."
    warn "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
  fi

  info "npm ci"
  npm_cli ci

  if npm_cli run 2>/dev/null | grep -q 'format:check'; then
    info "npm run format:check"
    npm_cli run format:check
  else
    warn "format:check script not found; skipping"
  fi

  info "npm run lint"
  npm_cli run lint

  info "npm run typecheck"
  npm_cli run typecheck

  if [[ "${SKIP_TESTS}" == "true" ]]; then
    warn "Skipping npm test"
  else
    info "npm test"
    npm_cli test
  fi

  info "Build frontend for production"
  # Re-export from the env file so npm/Vite definitely inherit VITE_* values.
  local build_env_normalized
  build_env_normalized="$(mktemp "${TMPDIR:-/tmp}/career-copilot-fe-build-env-XXXXXX")"
  tr -d '\r' < "${ENV_FILE}" > "${build_env_normalized}"
  set -a
  # shellcheck disable=SC1090
  source "${build_env_normalized}"
  set +a
  rm -f "${build_env_normalized}"

  export VITE_API_BASE_URL VITE_APP_NAME VITE_APP_ENV VITE_PUBLIC_APP_URL

  if [[ -z "${VITE_API_BASE_URL:-}" ]]; then
    die "VITE_API_BASE_URL is missing from ${ENV_FILE}"
  fi
  if [[ "${ENVIRONMENT}" == "production" ]] &&
    [[ "${VITE_API_BASE_URL}" == *"localhost"* || "${VITE_API_BASE_URL}" == *"127.0.0.1"* ]]; then
    die "Production VITE_API_BASE_URL cannot use localhost"
  fi

  info "Building frontend with API URL: ${VITE_API_BASE_URL}"

  # Also write .env.production.local so Windows npm.cmd/node.exe (via WSL) sees the values.
  local vite_env_file="${FRONTEND_DIR}/.env.production.local"
  cleanup_vite_env() {
    rm -f "${vite_env_file}"
  }
  trap cleanup_vite_env RETURN

  cat > "${vite_env_file}" <<EOF
VITE_API_BASE_URL=${VITE_API_BASE_URL}
VITE_APP_NAME=${VITE_APP_NAME}
VITE_APP_ENV=${VITE_APP_ENV}
VITE_PUBLIC_APP_URL=${VITE_PUBLIC_APP_URL}
EOF

  npm_cli run build
  cleanup_vite_env
  trap - RETURN

  ok "Frontend validation and build passed"
}

validate_build_output() {
  stage "Validate production build output"
  [[ -d "${BUILD_DIR}" ]] || die "Build directory missing: ${BUILD_DIR}"
  [[ -f "${BUILD_DIR}/index.html" ]] || die "Missing ${BUILD_DIR}/index.html"

  local js_count css_count
  js_count="$(find "${BUILD_DIR}" -type f \( -name '*.js' -o -name '*.mjs' \) | wc -l | tr -d ' ')"
  css_count="$(find "${BUILD_DIR}" -type f -name '*.css' | wc -l | tr -d ' ')"
  [[ "${js_count}" -gt 0 ]] || die "No JavaScript assets found in build output."
  [[ "${css_count}" -gt 0 ]] || die "No CSS assets found in build output."

  if find "${BUILD_DIR}" -type f \( -name '.env' -o -name '.env.*' -o -name '*.env' \) | grep -q .; then
    die "Build output contains .env files. Aborting."
  fi

  if find "${BUILD_DIR}" -type f -name '*.map' | grep -q .; then
    if [[ "${ALLOW_SOURCEMAPS:-false}" == "true" ]]; then
      warn "Source maps present; ALLOW_SOURCEMAPS=true so continuing."
    else
      die "Source maps found in build output. Set ALLOW_SOURCEMAPS=true to override."
    fi
  fi

  # Obvious secret patterns in generated text assets (do not print matches).
  if grep -RIlE \
    --include='*.js' --include='*.mjs' --include='*.css' --include='*.html' --include='*.json' \
    '(AWS_SECRET_ACCESS_KEY|BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|AKIA[0-9A-Z]{16}|postgres(ql)?://[^:]+:[^@]+@)' \
    "${BUILD_DIR}" >/dev/null 2>&1; then
    die "Possible secrets detected in build output. Aborting."
  fi

  if grep -RIl --include='*.js' --include='*.mjs' --include='*.html' 'localhost:5001' "${BUILD_DIR}" >/dev/null 2>&1; then
    die "Build still contains localhost:5001 — VITE_API_BASE_URL was not baked in. Aborting."
  fi

  if ! grep -RIl --include='*.js' --include='*.mjs' --fixed-strings "${VITE_API_BASE_URL}" "${BUILD_DIR}" >/dev/null 2>&1; then
    die "Build does not contain VITE_API_BASE_URL value. Vite env injection failed. Aborting."
  fi

  local file_count total_size
  file_count="$(find "${BUILD_DIR}" -type f | wc -l | tr -d ' ')"
  total_size="$(du -sh "${BUILD_DIR}" | cut -f1)"
  ok "Build OK (${file_count} files, ${total_size}); JS=${js_count} CSS=${css_count}"
  ok "Confirmed API base URL is embedded in the bundle (value not printed)"
}

read_deployment_state() {
  stage "Read current deployment state"
  CURRENT_VERSION_BEFORE="$(
    aws_cli s3 cp "${S3_BUCKET_URI}/${STATE_CURRENT_KEY}" - \
      --region "${AWS_REGION}" --profile "${AWS_PROFILE}" 2>/dev/null || true
  )"
  PREVIOUS_VERSION="$(
    aws_cli s3 cp "${S3_BUCKET_URI}/${STATE_PREVIOUS_KEY}" - \
      --region "${AWS_REGION}" --profile "${AWS_PROFILE}" 2>/dev/null || true
  )"
  CURRENT_VERSION_BEFORE="$(printf '%s' "${CURRENT_VERSION_BEFORE}" | tr -d '\r\n')"
  PREVIOUS_VERSION="$(printf '%s' "${PREVIOUS_VERSION}" | tr -d '\r\n')"

  if [[ -n "${CURRENT_VERSION_BEFORE}" ]]; then
    info "Current production version: ${CURRENT_VERSION_BEFORE}"
  else
    info "No current-version.txt found (first deploy or empty state)."
  fi
  if [[ -n "${PREVIOUS_VERSION}" ]]; then
    info "Previous production version: ${PREVIOUS_VERSION}"
  fi
}

upload_release() {
  stage "Upload immutable release to ${S3_RELEASE_URI}"
  if [[ "${DRY_RUN}" == "true" ]]; then
    info "[dry-run] Would upload ${BUILD_DIR}/ → ${S3_RELEASE_URI}"
    return 0
  fi

  aws_cli s3 sync "${BUILD_DIR}/" "${S3_RELEASE_URI}" \
    --region "${AWS_REGION}" \
    --profile "${AWS_PROFILE}" \
    --delete \
    --exclude "*.map" \
    --exclude ".env" \
    --exclude ".env.*" \
    --exclude "*.env"

  ok "Release uploaded: ${S3_RELEASE_URI}"
}

apply_cache_headers() {
  local source_dir="$1"
  local dest_prefix="$2" # e.g. s3://bucket/ or s3://bucket/releases/ver/

  # Long-cache hashed/static assets
  aws_cli s3 cp "${source_dir}/" "${dest_prefix}" \
    --region "${AWS_REGION}" \
    --profile "${AWS_PROFILE}" \
    --recursive \
    --exclude "*" \
    --include "assets/*" \
    --include "*.js" \
    --include "*.mjs" \
    --include "*.css" \
    --include "*.woff" \
    --include "*.woff2" \
    --include "*.ttf" \
    --include "*.eot" \
    --include "*.png" \
    --include "*.jpg" \
    --include "*.jpeg" \
    --include "*.gif" \
    --include "*.svg" \
    --include "*.ico" \
    --include "*.webp" \
    --cache-control "public,max-age=31536000,immutable" \
    --metadata-directive REPLACE

  # No-cache entry / runtime files
  aws_cli s3 cp "${source_dir}/" "${dest_prefix}" \
    --region "${AWS_REGION}" \
    --profile "${AWS_PROFILE}" \
    --recursive \
    --exclude "*" \
    --include "index.html" \
    --include "config.json" \
    --include "manifest.json" \
    --include "manifest.webmanifest" \
    --include "sw.js" \
    --include "service-worker.js" \
    --include "registerSW.js" \
    --cache-control "no-cache,no-store,must-revalidate" \
    --metadata-directive REPLACE
}

promote_release() {
  stage "Promote release to production bucket root"
  if [[ "${DRY_RUN}" == "true" ]]; then
    info "[dry-run] Would sync ${BUILD_DIR}/ → ${S3_BUCKET_URI}/ --delete --exclude releases/* --exclude deployment-state/*"
    info "[dry-run] Would apply cache headers on bucket root"
    return 0
  fi

  # Sync local build to root; never delete releases/ or deployment-state/
  aws_cli s3 sync "${BUILD_DIR}/" "${S3_BUCKET_URI}/" \
    --region "${AWS_REGION}" \
    --profile "${AWS_PROFILE}" \
    --delete \
    --exclude "releases/*" \
    --exclude "deployment-state/*" \
    --exclude "*.map" \
    --exclude ".env" \
    --exclude ".env.*" \
    --exclude "*.env"

  apply_cache_headers "${BUILD_DIR}" "${S3_BUCKET_URI}/"

  aws_cli s3api head-object \
    --bucket "${FRONTEND_S3_BUCKET}" \
    --key "index.html" \
    --region "${AWS_REGION}" \
    --profile "${AWS_PROFILE}" \
    >/dev/null

  ok "Production root promoted"
}

invalidate_cloudfront() {
  stage "Invalidate CloudFront cache"
  if [[ "${DRY_RUN}" == "true" ]]; then
    info "[dry-run] Would create invalidation on ${CLOUDFRONT_DISTRIBUTION_ID} for /*"
    INVALIDATION_ID="dry-run"
    return 0
  fi

  INVALIDATION_ID="$(
    aws_cli cloudfront create-invalidation \
      --distribution-id "${CLOUDFRONT_DISTRIBUTION_ID}" \
      --paths "/*" \
      --profile "${AWS_PROFILE}" \
      --query 'Invalidation.Id' \
      --output text
  )"
  [[ -n "${INVALIDATION_ID}" && "${INVALIDATION_ID}" != "None" ]] || die "CloudFront invalidation failed."
  ok "Invalidation ID=${INVALIDATION_ID}"

  if [[ "${WAIT_FOR_INVALIDATION:-true}" == "true" ]]; then
    info "Waiting for invalidation to complete (may take a few minutes)..."
    local status="InProgress"
    local attempt
    for attempt in $(seq 1 60); do
      status="$(
        aws_cli cloudfront get-invalidation \
          --distribution-id "${CLOUDFRONT_DISTRIBUTION_ID}" \
          --id "${INVALIDATION_ID}" \
          --profile "${AWS_PROFILE}" \
          --query 'Invalidation.Status' \
          --output text 2>/dev/null || echo "InProgress"
      )"
      log "Invalidation poll ${attempt}/60: ${status}"
      [[ "${status}" == "Completed" ]] && break
      sleep 5
    done
    [[ "${status}" == "Completed" ]] || warn "Invalidation still ${status}; continuing with public verification retries."
  fi
}

verify_public_url() {
  stage "Verify public frontend URL"
  if [[ "${DRY_RUN}" == "true" ]]; then
    info "[dry-run] Would curl ${FRONTEND_PUBLIC_URL}"
    return 0
  fi

  local attempt body code
  local expected_marker="${FRONTEND_VERIFY_MARKER:-id=\"root\"}"
  local max_attempts="${FRONTEND_VERIFY_ATTEMPTS:-12}"

  for attempt in $(seq 1 "${max_attempts}"); do
    info "Public verify attempt ${attempt}/${max_attempts}..."
    body="$(mktemp "${TMPDIR:-/tmp}/career-copilot-fe-health-XXXXXX")"
    code="$(
      curl -sS -L --connect-timeout 5 --max-time 30 \
        -o "${body}" -w '%{http_code}' \
        "${FRONTEND_PUBLIC_URL}" || echo "000"
    )"
    if [[ "${code}" == "200" ]] && grep -q "${expected_marker}" "${body}"; then
      rm -f "${body}"
      ok "Public frontend verified (HTTP 200, marker matched)"
      return 0
    fi
    rm -f "${body}"
    warn "Verify failed (HTTP ${code}); retrying in 5s..."
    sleep 5
  done

  return 1
}

update_deployment_state() {
  stage "Update deployment state"
  if [[ "${DRY_RUN}" == "true" ]]; then
    info "[dry-run] Would set current-version=${VERSION}"
    return 0
  fi

  if [[ -n "${CURRENT_VERSION_BEFORE}" && "${CURRENT_VERSION_BEFORE}" != "${VERSION}" ]]; then
    printf '%s' "${CURRENT_VERSION_BEFORE}" | aws_cli s3 cp - "${S3_BUCKET_URI}/${STATE_PREVIOUS_KEY}" \
      --region "${AWS_REGION}" --profile "${AWS_PROFILE}" --content-type "text/plain"
    PREVIOUS_VERSION="${CURRENT_VERSION_BEFORE}"
  fi

  printf '%s' "${VERSION}" | aws_cli s3 cp - "${S3_BUCKET_URI}/${STATE_CURRENT_KEY}" \
    --region "${AWS_REGION}" --profile "${AWS_PROFILE}" --content-type "text/plain"

  ok "State updated: current=${VERSION}, previous=${PREVIOUS_VERSION:-none}"
}

prune_old_releases() {
  stage "Prune old releases (keep 5 newest; protect current/previous)"
  if [[ "${DRY_RUN}" == "true" ]]; then
    info "[dry-run] Would prune old s3://${FRONTEND_S3_BUCKET}/releases/ prefixes"
    return 0
  fi

  local listing
  listing="$(
    aws_cli s3api list-objects-v2 \
      --bucket "${FRONTEND_S3_BUCKET}" \
      --prefix "releases/" \
      --delimiter "/" \
      --region "${AWS_REGION}" \
      --profile "${AWS_PROFILE}" \
      --query 'CommonPrefixes[].Prefix' \
      --output text 2>/dev/null || true
  )"

  [[ -n "${listing}" && "${listing}" != "None" ]] || {
    info "No release prefixes to prune."
    return 0
  }

  local versions=()
  local prefix ver
  # shellcheck disable=SC2206
  local prefixes=(${listing})
  for prefix in "${prefixes[@]}"; do
    ver="${prefix#releases/}"
    ver="${ver%/}"
    [[ -n "${ver}" ]] || continue
    versions+=("${ver}")
  done

  local sorted=()
  mapfile -t sorted < <(printf '%s\n' "${versions[@]}" | sort -r)

  local idx=0
  local candidate
  for candidate in "${sorted[@]}"; do
    local protected="false"
    if [[ "${candidate}" == "${VERSION}" \
       || "${candidate}" == "${PREVIOUS_VERSION}" \
       || "${candidate}" == "${CURRENT_VERSION_BEFORE}" ]]; then
      protected="true"
    fi

    if [[ "${idx}" -ge 5 && "${protected}" != "true" ]]; then
      info "Deleting old release: releases/${candidate}/"
      aws_cli s3 rm "${S3_BUCKET_URI}/releases/${candidate}/" \
        --recursive \
        --region "${AWS_REGION}" \
        --profile "${AWS_PROFILE}" || warn "Failed to delete releases/${candidate}/"
    fi
    idx=$((idx + 1))
  done

  ok "Release pruning complete"
}

rollback_to_previous() {
  stage "Rollback to previous release"
  ROLLBACK_STATUS="failed"

  local target="${PREVIOUS_VERSION}"
  if [[ -z "${target}" ]]; then
    target="${CURRENT_VERSION_BEFORE}"
  fi
  if [[ -z "${target}" || "${target}" == "${VERSION}" ]]; then
    err "No previous release available for rollback."
    return 1
  fi

  local prev_uri="${S3_BUCKET_URI}/releases/${target}/"
  info "Restoring ${prev_uri} → production root"

  local tmp_restore
  tmp_restore="$(mktemp -d "${TMPDIR:-/tmp}/career-copilot-fe-rollback-XXXXXX")"
  aws_cli s3 sync "${prev_uri}" "${tmp_restore}/" \
    --region "${AWS_REGION}" \
    --profile "${AWS_PROFILE}"

  if [[ ! -f "${tmp_restore}/index.html" ]]; then
    rm -rf "${tmp_restore}"
    err "Previous release missing index.html"
    return 1
  fi

  aws_cli s3 sync "${tmp_restore}/" "${S3_BUCKET_URI}/" \
    --region "${AWS_REGION}" \
    --profile "${AWS_PROFILE}" \
    --delete \
    --exclude "releases/*" \
    --exclude "deployment-state/*"

  apply_cache_headers "${tmp_restore}" "${S3_BUCKET_URI}/"

  INVALIDATION_ID="$(
    aws_cli cloudfront create-invalidation \
      --distribution-id "${CLOUDFRONT_DISTRIBUTION_ID}" \
      --paths "/*" \
      --profile "${AWS_PROFILE}" \
      --query 'Invalidation.Id' \
      --output text
  )"

  if verify_public_url; then
    printf '%s' "${target}" | aws_cli s3 cp - "${S3_BUCKET_URI}/${STATE_CURRENT_KEY}" \
      --region "${AWS_REGION}" --profile "${AWS_PROFILE}" --content-type "text/plain"
    ROLLBACK_STATUS="success"
    ok "Rollback to ${target} succeeded (invalidation=${INVALIDATION_ID})"
    rm -rf "${tmp_restore}"
    return 0
  fi

  rm -rf "${tmp_restore}"
  err "Rollback verification failed."
  return 1
}

print_summary() {
  local end_epoch duration
  end_epoch="$(date +%s)"
  duration="$((end_epoch - START_EPOCH))"

  stage "Deployment summary"
  if [[ "${DRY_RUN}" == "true" ]]; then
    printf '%sDry-run complete (no upload / promote / invalidate)%s\n\n' "${C_YELLOW}" "${C_RESET}"
  elif [[ "${ROLLBACK_STATUS}" == "success" ]]; then
    printf '%sDeployment failed; rollback succeeded%s\n\n' "${C_YELLOW}${C_BOLD}" "${C_RESET}"
  elif [[ "${ROLLBACK_STATUS}" == "failed" ]]; then
    printf '%sDeployment failed; rollback failed%s\n\n' "${C_RED}${C_BOLD}" "${C_RESET}"
  else
    printf '%sDeployment successful%s\n\n' "${C_GREEN}${C_BOLD}" "${C_RESET}"
  fi

  cat <<EOF
Version:              ${VERSION}
Frontend directory:   ${FRONTEND_DIRECTORY}
Build directory:      ${FRONTEND_BUILD_DIRECTORY}
S3 release path:      ${S3_RELEASE_URI}
Production bucket:    ${FRONTEND_S3_BUCKET}
CloudFront ID:        ${CLOUDFRONT_DISTRIBUTION_ID}
Public URL:           ${FRONTEND_PUBLIC_URL}
Invalidation ID:      ${INVALIDATION_ID:-n/a}
Rollback status:      ${ROLLBACK_STATUS}
Duration:             ${duration}s
Dry-run:              ${DRY_RUN}

Reminder: set backend CORS_ORIGIN to match FRONTEND_PUBLIC_URL:
  CORS_ORIGIN=${FRONTEND_PUBLIC_URL}
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

  run_frontend_validation
  validate_build_output

  if [[ "${DRY_RUN}" != "true" ]]; then
    read_deployment_state
  else
    info "[dry-run] Skipping remote state read / upload / promote / invalidate"
  fi

  upload_release
  promote_release
  invalidate_cloudfront

  if ! verify_public_url; then
    err "Public frontend verification failed."
    if [[ "${DRY_RUN}" == "true" ]]; then
      die "Unexpected verify failure in dry-run."
    fi
    rollback_to_previous || true
    print_summary
    exit 1
  fi

  update_deployment_state
  prune_old_releases
  print_summary
}

main "$@"
