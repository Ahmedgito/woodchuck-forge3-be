#!/usr/bin/env bash
# Deploy the production environment (branch PROD, AWS standalone).
# All config comes from this server's .env.
set -euo pipefail
exec "$(cd "$(dirname "$0")" && pwd)/deploy/deploy.sh" prod "$@"
