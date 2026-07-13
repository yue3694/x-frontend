#!/usr/bin/env bash
# Create (or update) every Secrets Manager entry the Terraform stack needs.
# Run once before the first `terraform apply`. Re-run safely to refresh values.
#
# Usage:
#   ./infrastructure/scripts/bootstrap-secrets.sh [--region us-east-1] [--project neural-synthesis] [--env production]
# Env overrides (all optional):
#   AWS_REGION, PROJECT_NAME, ENVIRONMENT, DATABASE_URL, AUTH_JWT_SECRET, GITHUB_PAT, CLOUDFLARE_TOKEN
set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
PROJECT="${PROJECT_NAME:-neural-synthesis}"
ENV="${ENVIRONMENT:-production}"
PREFIX="${PROJECT}-${ENV}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --region)  REGION="$2";  shift 2 ;;
    --project) PROJECT="$2"; shift 2 ;;
    --env)     ENV="$2";     shift 2 ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

upsert_secret() {
  # $1 = logical name, $2 = secret name (no prefix), $3 = value
  local name="$1"  suffix="$2"  value="$3"
  local full="${PREFIX}/${suffix}"
  if aws secretsmanager describe-secret --secret-id "$full" --region "$REGION" >/dev/null 2>&1; then
    aws secretsmanager put-secret-value --secret-id "$full" --secret-string "$value" --region "$REGION" >/dev/null
    echo "  updated: $name -> $full"
  else
    aws secretsmanager create-secret --name "$full" --secret-string "$value" --region "$REGION" >/dev/null
    echo "  created: $name -> $full"
  fi
  aws secretsmanager describe-secret --secret-id "$full" --region "$REGION" \
    --query 'ARN' --output text
}

# Read value from env, or prompt the user (TTY only). If both are empty and a
# default applies (random secret), generate it and print once.
resolve() {
  # $1 = var name, $2 = prompt label, $3 = optional default command (will be eval'd)
  local v="${!1:-}"
  if [[ -n "$v" ]]; then echo "$v"; return; fi
  if [[ -n "${3:-}" ]]; then
    echo "# generated for $1" >&2
    eval "$3"
    return
  fi
  if [[ -t 0 ]]; then
    read -r -p "$2: " v
    echo "$v"
  else
    echo "ERROR: $1 is required and not set" >&2
    exit 2
  fi
}

echo "==> Bootstrapping secrets in ${REGION} (prefix=${PREFIX})"

# 1. DATABASE_URL (string, full connection string)
DATABASE_URL="$(resolve DATABASE_URL 'DATABASE_URL (postgres://...)')"
upsert_secret "database_url" "database-url" "$DATABASE_URL"

# 2. AUTH_JWT_SECRET (raw 32+ byte secret, generated if missing)
AUTH_JWT_SECRET="$(resolve AUTH_JWT_SECRET 'AUTH_JWT_SECRET' 'openssl rand -hex 32')"
upsert_secret "auth_jwt_secret" "auth-jwt" "$AUTH_JWT_SECRET"

# 3. GITHUB_PAT — CodeBuild's SECRETS_MANAGER auth requires the secret to be
# JSON with a "username" and "token" field, not a bare PAT string. The username
# is the literal "x-access-token" per GitHub's PAT Basic auth contract.
GITHUB_PAT="$(resolve GITHUB_PAT 'GITHUB_PAT (ghp_...)')"
GITHUB_PAT_JSON="$(printf '{"username":"x-access-token","token":"%s"}' "$GITHUB_PAT")"
upsert_secret "github_pat" "github-pat" "$GITHUB_PAT_JSON"

# 4. CLOUDFLARE_TOKEN (plain string, used as Bearer header)
CLOUDFLARE_TOKEN="$(resolve CLOUDFLARE_TOKEN 'CLOUDFLARE_TOKEN')"
upsert_secret "cloudflare_token" "cloudflare" "$CLOUDFLARE_TOKEN"

echo
echo "==> Done. ARNs:"
echo "  database_url_secret_arn    = arn:aws:secretsmanager:${REGION}:$(aws sts get-caller-identity --query Account --output text):secret:${PREFIX}/database-url"
echo "  auth_jwt_secret_arn        = arn:aws:secretsmanager:${REGION}:$(aws sts get-caller-identity --query Account --output text):secret:${PREFIX}/auth-jwt"
echo "  github_pat_secret_arn      = arn:aws:secretsmanager:${REGION}:$(aws sts get-caller-identity --query Account --output text):secret:${PREFIX}/github-pat"
echo "  cloudflare_token_secret_arn= arn:aws:secretsmanager:${REGION}:$(aws sts get-caller-identity --query Account --output text):secret:${PREFIX}/cloudflare"
echo
echo "Copy the four *_secret_arn values into infra/terraform/terraform.tfvars."
