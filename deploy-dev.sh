#!/usr/bin/env bash
# Deploy the dev environment. All config comes from this server's .env.
# (dev/qa are normally run by Jenkins; this wrapper exists for manual parity.)
set -euo pipefail
exec "$(cd "$(dirname "$0")" && pwd)/deploy/deploy.sh" dev "$@"
