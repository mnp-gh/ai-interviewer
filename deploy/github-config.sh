#!/usr/bin/env bash
# Copies production settings from a local env file into GitHub, where each deploy reads them
# (see "Continuous deployment" in the Readme). Run it from anywhere in a checkout:
#
#   deploy/github-config.sh [file]     # default: .env.production at the repo root (git-ignored)
#
# The file uses server/.env syntax (KEY=value, # comments). Each key goes where the workflow expects it:
#   VITE_*                              repository variable (read when the image is built; public)
#   SITE_ADDRESS, DEPLOY_HOST/USER/PATH,
#   budgets, MAINTENANCE_MODE, PARSE_MODEL   production environment variable (plain settings)
#   everything else                     production environment secret (keys, connection strings, tokens)
# Only keys in the file are set; nothing in GitHub is removed. Values are never printed.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
FILE=${1:-.env.production}
ENVIRONMENT=production
[ -f "$FILE" ] || { echo "No $FILE: create it with KEY=value lines (see server/.env.example)." >&2; exit 1; }
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)

# Set by docker-compose.yml on the server: a value here would be ignored.
SKIP='^(HOST|PORT|PUBLIC_ORIGIN|CLIENT_IP_HEADER)$'
PLAIN='^(SITE_ADDRESS|DEPLOY_HOST|DEPLOY_USER|DEPLOY_PATH|DAILY_[A-Z_]+|AI_CALLS_PER_MINUTE|ACCOUNT_ACTIONS_PER_MINUTE|MAINTENANCE_MODE|PARSE_MODEL)$'

echo "Setting $FILE on $REPO ($ENVIRONMENT):"
while IFS= read -r line || [ -n "$line" ]; do
  line=${line%$'\r'}
  [[ $line =~ ^[[:space:]]*(#|$) ]] && continue
  [[ $line =~ ^[[:space:]]*(export[[:space:]]+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]] || { echo "  skipped an unreadable line" >&2; continue; }
  key=${BASH_REMATCH[2]}
  value=${BASH_REMATCH[3]}
  # Strip one pair of surrounding quotes, as dotenv does.
  [[ $value =~ ^\"(.*)\"$ || $value =~ ^\'(.*)\'$ ]] && value=${BASH_REMATCH[1]}

  if [[ $key =~ $SKIP ]]; then
    echo "  $key: skipped (docker-compose.yml sets it)"
  elif [ -z "$value" ]; then
    echo "  $key: skipped (empty)"
  elif [[ $key == VITE_* ]]; then
    gh variable set "$key" --repo "$REPO" --body "$value" >/dev/null
    echo "  $key: repository variable"
  elif [[ $key =~ $PLAIN ]]; then
    gh variable set "$key" --repo "$REPO" --env "$ENVIRONMENT" --body "$value" >/dev/null
    echo "  $key: environment variable"
  else
    printf '%s' "$value" | gh secret set "$key" --repo "$REPO" --env "$ENVIRONMENT" >/dev/null
    echo "  $key: environment secret"
  fi
done < "$FILE"

echo "Done. Run the workflow (Actions → CI/CD → Run workflow) to deploy the new settings."
