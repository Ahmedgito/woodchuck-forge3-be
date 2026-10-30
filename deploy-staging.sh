#!/usr/bin/env bash
# Deploy the staging / UAT environment (branch uat-replica, AWS standalone).
# All config comes from this server's .env.
set -euo pipefail
exec "$(cd "$(dirname "$0")" && pwd)/deploy/deploy.sh" staging "$@"
