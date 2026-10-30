# Deployment Pipeline Standardization — Plan

> Status: **Implemented (uncommitted) — for review**
> Owner: Backend / DevOps
> Scope: `wc-backend` deployments across all four environments (dev, qa, staging/UAT, production)

### Implementation status (this change)

| Item | File | State |
|---|---|---|
| Portable DB-wait + conditional migrate/seed | `startup.relational.dev.sh` | ✅ done |
| Single deploy entrypoint (warm-container, health-gated swap, rollback) | `deploy/deploy.sh` | ✅ done |
| Rollback to previous image | `deploy/rollback.sh` | ✅ done |
| Per-env wrappers | `deploy-dev.sh` `deploy-qa.sh` `deploy-staging.sh` `deploy-prod.sh` | ✅ done |
| Deploy-control keys documented | `env-example-relational` | ✅ done |
| Readiness endpoint (`/health/ready`, DB ping) | `src/health/*` | ✅ already existed on this branch |
| Graceful shutdown (SIGTERM drain) | `main.ts:33` | ✅ already enabled |
| Reverse proxy for true zero-downtime (Mode A) | — | ⏳ not yet (scripts do Mode B) |

**Downtime today (Mode B):** build + migrate + seed happen on a warm container off the critical path; the live cutover is a single fast boot (~seconds), down from the ~1–3 min all-on-critical-path outage window. See §8A.

> **Must be committed to each deploy branch.** `deploy.sh` runs `git reset --hard origin/$DEPLOY_BRANCH` + `git clean -fd -e .env`, which removes any file not committed to that branch (except `.env`). The deploy scripts therefore only work once merged into `dev`/`qa`/`uat-replica`/`PROD`.

---

## 1. Purpose

Standardize how `wc-backend` is deployed across **four environments running on two different infrastructure shapes**, so that:

- A deploy is **one command per environment**, reproducible, and identical in logic everywhere.
- The **same startup image works on both** self-hosted (local) and managed (AWS) infrastructure — no environment-specific hardcoding.
- A bad deploy **fails safe** (health-check + rollback) instead of taking the environment down.
- Configuration lives in **one place per server** (that server's `.env`).

This plan is the direct outcome of a production incident (see §2) where a redeploy left prod unable to start.

---

## 2. Background — the incident (post-mortem)

A prod redeploy left the container in a crash loop:

```
wait-for-it.sh: waiting 15 seconds for postgres:5432
nc: bad address 'postgres'   (repeating) → container Exited (143)
```

### What happened
- The container's startup script (`startup.relational.dev.sh`) runs `wait-for-it.sh postgres:5432` — a **hardcoded** DB hostname.
- On **local** servers that host Postgres/Redis as docker-compose services, `postgres` resolves.
- On **AWS**, the database is **RDS** (`DATABASE_HOST=<rds-endpoint>`), and the container is run standalone with no `postgres` service on its network — so the name never resolves, `set -e` aborts, and the app never starts.

### Contributing factors
- The prod git checkout had **uncommitted hand-edits** to report files and was **12 commits behind** `origin/PROD` — an unreproducible, drifted state.
- Repo files were **root-owned** (from prior `sudo` operations), so `git reset` failed with permission errors.
- The container had **`RestartPolicy=no`**, so once it exited it stayed down until manually restarted.
- The startup ran `migration:run` **and `seed:run`** on every boot.

### Recovery
Bypassing the broken `postgres` wait and running `migration:run → seed → start:prod` directly brought prod back up. A pending migration (`AddS3LinkCompressionExtension`) applied cleanly; reports resumed generating.

---

## 3. Root causes this plan must fix

| # | Root cause | Fix in this plan |
|---|---|---|
| R1 | Startup hardcodes `postgres:5432` → breaks on RDS | Wait on `$DATABASE_HOST:$DATABASE_PORT` (§7) |
| R2 | Deploys from a dirty / behind git checkout | Clean, reproducible checkout (`fetch` + `reset --hard origin/$BRANCH`); never `sudo git` (§8) |
| R3 | No health-check / rollback → outage on bad deploy | Health-check new container before removing old; keep `:previous` image (§8, §10) |
| R4 | `RestartPolicy=no` → crash stays down | `--restart unless-stopped` (§10) |
| R5 | Hardcoded branch/container per copy of `script.sh` → wrong-branch/drift | One `deploy.sh`, per-env values from `.env` (§6) |
| R6 | Root-owned repo files | Deploy user owns the checkout; docker via docker-group or scoped sudo (§10) |

---

## 4. Environments

| Env | Branch | Infra | DB | Redis | Run mode | Deploy today |
|---|---|---|---|---|---|---|
| dev | `dev` | local company server | self-hosted (compose) | self-hosted (compose) | **compose** | Jenkins (self-hosted) |
| qa | `qa` | local company server | self-hosted (compose) | self-hosted (compose) | **compose** | Jenkins (self-hosted) |
| staging / UAT | `uat-replica` | AWS EC2 | RDS | ElastiCache | **standalone** | manual script |
| production | `PROD` | AWS EC2 | RDS | ElastiCache | **standalone** | `script.sh` (manual) |

**Key axis:** *local = DB/Redis as docker services; AWS = external managed DB/Redis.* The pipeline must respect both without hardcoding hostnames.

Confirmed operational facts (from prod `.env`): `CAMERA_TIMEZONE=America/Detroit` (crons run in Eastern; weekly report = Mon 08:00 ET); Redis = ElastiCache endpoint.

---

## 5. Design principles

1. **One script, many environments.** A single `deploy.sh` contains all logic; behavior is parameterized by the server's `.env`. No per-env copies to drift.
2. **`.env` is the single per-environment source of truth.** Each server already has its own `.env`; we add a few deploy-control keys to it.
3. **The image is environment-agnostic.** It reads all hosts/ports from env at runtime. The same built image can run anywhere.
4. **Fail safe, not fail down.** Never remove the running container until the replacement is proven healthy.
5. **Reproducible.** Deploys always come from a clean checkout of a known branch — never hand-edits.

---

## 6. Target architecture

### 6.1 Layout
```
deploy/
  deploy.sh              # single source of truth for deploy logic
deploy-dev.sh           # thin wrapper: exec deploy/deploy.sh dev
deploy-qa.sh            # thin wrapper: exec deploy/deploy.sh qa
deploy-staging.sh       # thin wrapper: exec deploy/deploy.sh staging   (branch uat-replica)
deploy-prod.sh          # thin wrapper: exec deploy/deploy.sh prod
```
Humans run `./deploy-prod.sh`; Jenkins runs `deploy/deploy.sh dev` / `qa`. All four share the same core.

### 6.2 `.env` additions (per server)
Add a small deploy-control block to each server's existing `.env`:

```bash
# --- deploy control (per environment) ---
DEPLOY_BRANCH=PROD          # dev | qa | uat-replica | PROD
DEPLOY_MODE=standalone      # standalone (AWS) | compose (local)
APP_CONTAINER=backend-api-cont
APP_IMAGE=backend-api-image
APP_PORT=3000
HEALTH_PATH=/api            # endpoint to probe for readiness
RUN_MIGRATIONS=true
RUN_SEED=true               # kept as-is per current behavior; can be tuned later
# --- app config already present ---
DATABASE_HOST=...   DATABASE_PORT=5432
REDIS_HOST=...      REDIS_PORT=6379
WORKER_HOST=...
```

`.env` is **not** in git (per-server secret). It is passed to the container via `--env-file .env` and also `source`d by `deploy.sh` for the control values.

---

## 7. The critical portability fix (do this first)

Change the startup DB-wait from a hardcoded host to the env-provided host:

```bash
# startup.relational.dev.sh  (before)
/opt/wait-for-it.sh postgres:5432

# (after)
/opt/wait-for-it.sh "$DATABASE_HOST:$DATABASE_PORT" -t 60
```

- On local: `DATABASE_HOST=postgres` → resolves on the compose network (unchanged behavior).
- On AWS: `DATABASE_HOST=<rds-endpoint>` → waits for RDS.

This single change makes **one image boot correctly on every environment** and is what would have prevented the outage. (If any `wait-for-it redis:6379` is ever added, apply the same treatment with `$REDIS_HOST:$REDIS_PORT`. Today there is none.)

---

## 8. `deploy.sh` — reference behavior

> Illustrative; final script to be reviewed before adoption.

```bash
#!/usr/bin/env bash
set -euo pipefail

ENV_NAME="${1:?usage: deploy.sh <dev|qa|staging|prod>}"
cd "$(dirname "$0")/.."               # repo root

# 1) Load per-env control values + app env from the server's .env
set -a; source ./.env; set +a
: "${DEPLOY_BRANCH:?}" "${APP_CONTAINER:?}" "${APP_IMAGE:?}" "${APP_PORT:?}"

# 2) Clean, reproducible checkout (NO sudo git)
git fetch origin
git reset --hard "origin/${DEPLOY_BRANCH}"     # fail-safe: known state, no hand-edits
git clean -fd -e .env                          # keep the .env, drop stray files

# 3) Build a uniquely-tagged image; keep the current one as :previous for rollback
NEW_TAG="${APP_IMAGE}:$(git rev-parse --short HEAD)"
docker image tag "${APP_IMAGE}:current" "${APP_IMAGE}:previous" 2>/dev/null || true
docker build -t "${NEW_TAG}" -t "${APP_IMAGE}:current" .

# 4) Run migrations (and seed, if enabled) explicitly — not silently inside startup
[ "${RUN_MIGRATIONS:-true}" = true ] && \
  docker run --rm --env-file .env "${NEW_TAG}" npm run migration:run
[ "${RUN_SEED:-false}" = true ] && \
  docker run --rm --env-file .env "${NEW_TAG}" npm run seed:run:relational

# 5) Start replacement under a temp name on a temp port; warm it up FULLY
#    while the current container keeps serving traffic (zero downtime so far).
STAGE="${APP_CONTAINER}-new"
STAGE_PORT="$((APP_PORT+1))"
docker rm -f "${STAGE}" 2>/dev/null || true
docker run -d --name "${STAGE}" --env-file .env \
  --restart unless-stopped -p "${STAGE_PORT}:${APP_PORT}" "${NEW_TAG}"

# Block until the NEW container is actually ready (Nest booted, DB+Redis wired).
if ! healthcheck "http://localhost:${STAGE_PORT}${HEALTH_PATH:-/api}"; then
  echo "Health check failed — leaving current deploy untouched"; docker rm -f "${STAGE}"; exit 1
fi

# 6) Cut traffic over to the already-warm container. See §8A for the two modes:
#    - proxy mode (zero downtime): reload the reverse proxy to point at STAGE_PORT
#    - proxy-less mode (seconds): promote STAGE onto APP_PORT without a cold reboot
switch_traffic_to "${STAGE}" "${STAGE_PORT}"    # defined in §8A

# 7) Final health-check on the live endpoint; roll back on failure
healthcheck "http://localhost:${APP_PORT}${HEALTH_PATH:-/api}" || rollback_to_previous
```

`DEPLOY_MODE=compose` (local dev/qa) takes a parallel path that uses `docker compose up -d --build backend` so Postgres/Redis services come up alongside — same script, one branch on `$DEPLOY_MODE`.

> **Migration/seed note:** migrations/seed are run once, explicitly, before the swap — not on every container boot. Startup keeps only the DB-wait + `start:prod`. (`RUN_SEED` is left `true` to preserve current behavior; recommended to set `false` on staging/prod later.)

---

## 8A. Downtime — where it comes from and how we remove it

### 8A.1 Why today's deploy is slow (the minutes)
Today's `script.sh` does, in order, **with nothing serving the whole time**:

```
docker rm -f old            # ← downtime STARTS here
docker run new  →  wait-for-it DB  →  migration:run  →  seed:run  →  Nest boot  →  ready
                                                                                   # ← downtime ENDS here
```

So the outage window is **DB-wait + migrations + seed + full Nest boot** — easily 1–3+ minutes, and longer if migrations/seed are heavy. Two independent problems are bundled into that window:

1. **Slow work is on the critical path.** Migrations and seed run *after* the old container is already gone.
2. **Only one container ever exists.** The new one is cold-started in place, so the port is dark until it finishes booting.

### 8A.2 Fix #1 — take slow work off the critical path (no new infra)
This is already baked into §8 and is the single biggest win:

- **Build the image first** — `docker build` runs while the old container keeps serving. No downtime.
- **Run migrations & seed out-of-band** — against the DB, from a throwaway `docker run --rm`, *before* the swap, while old still serves.
- **Warm the new container on a temp port** and health-check it to *fully ready* **before** touching the old one.

After this, the only thing left in the outage window is the traffic cut itself — not boot/migrate/seed. That already drops downtime from minutes to, at worst, one Nest boot.

### 8A.3 Fix #2 — remove the boot from the window too (choose one)

**The constraint:** two containers can't both publish host port `APP_PORT`. So to get to *zero* you need something in front that can flip traffic. Two supported modes, selected by `ZERO_DOWNTIME` / `DEPLOY_MODE` in `.env`:

#### Mode A — reverse proxy (recommended, true ~0 downtime)
Put nginx (or Traefik/Caddy) on `APP_PORT`; the app containers listen on internal ports only.

```
        clients → nginx :3000 ──▶ upstream ──▶ blue  :3001   (live)
                                              └▶ green :3002   (warming)
```

`switch_traffic_to green 3002`:
1. rewrite the upstream to `:3002`,
2. `nginx -s reload` — a **graceful** reload: existing connections drain on the old worker, new connections go to green. No dropped requests, no dark port.
3. stop blue.

Downtime ≈ **0**. This is the standard answer and the one I recommend for staging/prod. Traefik/Caddy do the same with automatic health-based switching and need no manual reload.

#### Mode B — proxy-less fast swap (seconds, no new infra)
If we don't want a proxy yet, keep the warm-container approach but make the swap as tight as possible:

```
# green already warm & healthy on STAGE_PORT
docker stop --time 20 "${APP_CONTAINER}"     # SIGTERM: let in-flight requests drain
docker rm  -f "${APP_CONTAINER}"
docker rm  -f "${STAGE}"                       # free the temp name
docker run -d --name "${APP_CONTAINER}" --env-file .env \
  --restart unless-stopped -p "${APP_PORT}:${APP_PORT}" "${NEW_TAG}"   # boots warm-image
```

Because migrations/seed are already done, the remaining gap is just one Nest boot (~tens of seconds), not minutes. Honest tradeoff: **this is low-downtime, not zero-downtime.** It needs no infra change and is a fine interim state for dev/qa.

> To get Mode B closer to zero without a proxy you'd need to re-publish a port on a running container, which Docker doesn't support — hence the proxy is the real fix. Don't over-engineer around it.

### 8A.4 Two things the app must do for graceful cutovers
Independent of mode, in-flight requests only survive the swap if the app shuts down cleanly:

- **`app.enableShutdownHooks()`** so NestJS handles SIGTERM (finishes in-flight requests, closes DB/Redis, stops Bull workers cleanly) instead of being killed mid-request. ✅ **Already enabled** — `main.ts:33`. No change needed; `docker stop --time 20` gives it room to drain.
- **A real readiness endpoint** so the health-check gates on *actually ready*, not just "port open." ✅ **Already present** — a terminus `HealthModule` (`src/health/health.controller.ts`, wired at `app.module.ts:81`, both routes prefix-excluded in `main.ts`) exposes:
  - `GET /health` — liveness (heap ceiling), and
  - `GET /health/ready` — readiness (**DB ping** + heap).
  Both are public (`@SkipAll()`), so no auth. `deploy.sh` uses `HEALTH_PATH=/health/ready` as the cutover gate — the swap only proceeds once the new container can actually reach the database.

### 8A.5 Expected downtime after each step

| State | Downtime per deploy |
|---|---|
| Today (`script.sh`, everything on critical path) | ~1–3+ min |
| Fix #1 only (build/migrate/seed off critical path, warm container) | ~1 Nest boot |
| Fix #1 + Mode B (proxy-less fast swap) | seconds (one boot, drained) |
| Fix #1 + Mode A (reverse proxy flip) | ~0 |

Recommendation: ship **Fix #1 everywhere** immediately (it's already in `deploy.sh`), run **Mode B** on dev/qa, and stand up the **reverse proxy (Mode A)** for staging/prod where downtime actually hurts.

---

## 9. Jenkins (dev / qa)

- dev/qa remain automated in **self-hosted Jenkins**.
- Jenkins pipeline calls the **same** `deploy/deploy.sh dev` / `qa` (with `DEPLOY_MODE=compose` in those servers' `.env`), so all four environments converge on one deploy path.
- No divergence between "what Jenkins does" and "what a human does on AWS."

---

## 10. Safety features (built into `deploy.sh`)

| Feature | Behavior |
|---|---|
| Clean checkout | `git reset --hard origin/$DEPLOY_BRANCH` — no dirty-tree/hand-edit deploys |
| No `sudo git` | git runs as the deploy user; only docker uses elevated rights (docker group preferred over sudo) |
| Tagged images | `:previous` retained every deploy for instant rollback |
| Blue/green swap | New container fully warmed + health-checked on a temp port before any traffic cut (§8A) |
| Low / zero downtime | Slow work off the critical path; reverse-proxy flip (~0) or proxy-less fast swap (seconds) — §8A |
| Restart policy | `--restart unless-stopped` so a crash self-recovers |
| Explicit migrations | Run once per deploy, off the critical path, visible in logs, not hidden in startup |
| Portable DB wait | `$DATABASE_HOST` — works on RDS and local Postgres |

---

## 11. Rollout plan (phased, low-risk)

1. **Phase 0 — startup fix (highest priority):** change the DB-wait to `$DATABASE_HOST:$DATABASE_PORT`; verify a clean boot on all four environments. This alone removes the outage class.
2. **Phase 1 — introduce `deploy.sh` + `.env` control keys**, tested on **dev** first.
3. **Phase 2 — qa** via Jenkins using `deploy.sh`.
4. **Phase 3 — staging (`uat-replica`)** on AWS standalone mode.
5. **Phase 4 — production** last, only after 1–3 are green. Keep the old `script.sh` as a documented fallback until prod has deployed cleanly at least twice.

---

## 12. Verification / testing

For each environment after adopting `deploy.sh`:
- Container reaches **"Nest application successfully started"** and the health endpoint returns 200.
- **DB connectivity** confirmed (migrations query succeeds).
- **Redis/queues** confirmed (a report or queued job actually processes end-to-end — not just "app booted").
- **Rollback drill:** intentionally fail a deploy (bad tag) and confirm the previous container stays serving / `:previous` restores.

---

## 13. Rollback strategy

- Every deploy leaves `${APP_IMAGE}:previous`.
- Rollback = `docker rm -f $APP_CONTAINER && docker run … ${APP_IMAGE}:previous` (wrap as `deploy/rollback.sh <env>`).
- Because migrations run forward-only, prefer **backward-compatible migrations**; document any that aren't so rollback is a conscious decision.

---

## 14. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Extra port during blue/green swap conflicts | Use `APP_PORT+1` only transiently; release immediately after swap |
| Seed on prod has side effects | Kept as-is now; flagged to switch `RUN_SEED=false` on staging/prod |
| `.env` drift between servers | `.env.example` documents required keys; a `deploy.sh` preflight asserts all required keys exist and fails early if missing |
| Non-backward-compatible migration during rollback | Review migrations for backward-compat; note exceptions in PR |
| Secrets exposure | `.env` never committed; rotate any secret that leaves the server |

---

## 15. Operational runbook (quick reference)

```bash
# Normal deploy
./deploy-prod.sh                      # or deploy-staging / deploy-qa / deploy-dev

# Watch startup
docker logs -f backend-api-cont

# Emergency: restore previous image
./deploy/rollback.sh prod

# Emergency: start current image, skip the DB-wait (last resort)
docker rm -f backend-api-cont
docker run -d --name backend-api-cont -p 3000:3000 --env-file .env backend-api-image \
  sh -c "npm run migration:run && npm run seed:run:relational && npm run start:prod"
```

---

## 16. Open decisions

1. **`DEPLOY_MODE=compose` details for dev/qa** — confirm the exact compose file/service names used on the local servers.
2. **Seed policy** — keep `RUN_SEED=true` everywhere (current), or move staging/prod to `false`?
3. ~~**Health endpoint**~~ — ✅ **Resolved.** `/health/ready` (terminus, DB ping) already exists and is what `deploy.sh` probes. Optionally extend it with a Redis indicator for an even stronger readiness signal.
4. **docker permissions** — add the deploy user to the `docker` group (drop `sudo`), or keep scoped `sudo`?
5. **Image registry** — build-on-server (current) vs push/pull from a registry (ECR) for AWS envs?
6. **Downtime target / proxy** — is a reverse proxy (nginx/Traefik/Caddy) acceptable to introduce on staging/prod for true zero-downtime (Mode A, §8A.3), or do we stay proxy-less "seconds" (Mode B) for now? **The scripts as implemented do Mode B.** Recommendation: proxy on staging/prod later, Mode B everywhere for now.

---

### Appendix A — before/after of the one line that caused the outage
```diff
- /opt/wait-for-it.sh postgres:5432
+ /opt/wait-for-it.sh "$DATABASE_HOST:$DATABASE_PORT" -t 60
```
