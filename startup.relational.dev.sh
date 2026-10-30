#!/usr/bin/env bash
set -e

# Portability fix: wait on the DB host from the environment, not a hardcoded
# service name. On local/compose DATABASE_HOST=postgres; on AWS it is the RDS
# endpoint. A hardcoded `postgres:5432` is what caused the prod outage
# (`nc: bad address 'postgres'`) — see docs/deployment-pipeline-plan.md.
/opt/wait-for-it.sh "${DATABASE_HOST:-postgres}:${DATABASE_PORT:-5432}" -t 60

# Migrations/seed run on boot by default (unchanged behavior). deploy.sh sets
# these to false on the final cutover container once the warm container has
# already applied them, so the production swap boots as fast as possible.
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  npm run migration:run
fi
if [ "${RUN_SEED:-true}" = "true" ]; then
  npm run seed:run:relational
fi

npm run start:prod
