# Orbital Field Desk

A KIM-inspired Warframe farming workspace. Browse Prime equipment and relics, compare refinement and squad odds, and sign in to build a plan from your parts, relic inventory, and farming goals.

## Local setup

Use Node.js 22.12 or later, pnpm, and Docker Compose. Set `POSTGRES_PASSWORD` in an ignored `.env` file, then start the database and cache.

```sh
docker compose up -d postgres redis
pnpm install
```

Create an ignored `.env.local` file. Use the same PostgreSQL password in both files and URL-encode it in the connection string if needed.

```dotenv
DATABASE_URL=postgresql://warframe:YOUR_PASSWORD@127.0.0.1:5432/warframe
REDIS_URL=redis://127.0.0.1:6378
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=REPLACE_WITH_A_RANDOM_SECRET
```

Generate the signing secret with `openssl rand -base64 32`. Always browse at the origin configured in `BETTER_AUTH_URL`.

```sh
pnpm db:migrate
pnpm dev
```

Open `/app` to register. For local admin testing, `pnpm db:admin` creates or verifies `admin@orbital.test` and saves the generated password in `.admin-credentials.local`. Running the bootstrap in production requires explicit authorization via `ALLOW_ADMIN_BOOTSTRAP=1`.

## Data and planning

- Public equipment and relic pages are server-rendered. The relic database sends a paginated projection or a single relic record to the browser.
- WFCD equipment, relic rewards, and mission sources are fresh for an hour. Redis retains successful snapshots for 30 days, with stale data labeled in the UI. An empty production cache and an unavailable upstream produce an unavailable state. `WARFRAME_FIXTURES=1` enables the equipment fixtures in development or tests only. [WFCD equipment](https://github.com/WFCD/warframe-items) · [WFCD drop tables](https://github.com/WFCD/warframe-drop-data)
- PostgreSQL stores equipment ownership, component inventory, relic inventory by refinement, and farming goals separately. New equipment records use WFCD source IDs. Migrations copy legacy inventory and wishlist rows using their existing slugs and retain the original tables in `orbital_archive`. Legacy history stays archived. Completing a goal records equipment ownership without consuming components.
- Goal progress is independent per goal. Shared components and relics are never reserved. The optimizer calculates a per-part plan, including the chance of obtaining all missing copies over repeated opportunities. Squad odds assume independent rolls and one selected reward per opening.
- Time ranking needs player-entered time per opening and per relic collection opportunity. It assumes a common collection duration for compared missions and estimates the collection shortfall after using owned relics when inventory is enabled. Trace costs are measured from Intact. The reports omit acquisition time for Void Traces, and mission reward tables may omit other acquisition sources. Missing sources imply unknown availability.
- TanStack Query loads prices separately from page rendering. The server uses the official Warframe.market item catalog to map component and set names to published identifiers. It uses PC sell listings, which can change and may have insufficient stock for multiple copies. Fresh quotes last two minutes, last-known observations up to one day, and confirmed negative results five minutes. [Warframe.market API](https://docs.warframe.market/docs/intro/)

## Deployment

```sh
pnpm build
node --env-file=.env.local .output/server/index.mjs
```

Set production environment variables through the hosting platform. Configure `BETTER_AUTH_URL` to the public HTTPS origin so Better Auth uses secure cookies. Use a trusted reverse proxy that replaces its client IP header, then configure `AUTH_TRUSTED_IP_HEADER` to that header. Without this setting, production requests share a rate-limit bucket per auth path. Session-bound operations use private, no-store responses. Registration works with email and password. Verification and password recovery require a transactional email provider and are currently unavailable.

All production instances must share one Redis market coordination namespace and database. Redis enforces a global 400 ms start interval, bounded admission and waiting, request leases, and shared upstream backoff. If Redis is unavailable, retained quotes can still be shown and upstream market requests are paused. `MARKET_COORDINATION=local` explicitly enables in-process coordination for single-instance development when no Redis client is available. It has no effect in production.

The market integration identifies itself in its User-Agent and uses the public API budget. Review the current API rules and contact the maintainers through their listed channel before launching publicly if usage or approval is unclear. The integration has not been reviewed by the Warframe.market team. [Warframe.market rules and contact](https://docs.warframe.market/docs/rules/overview/)

## Checks

```sh
pnpm check
pnpm exec tsc --noEmit
pnpm test
pnpm build
```

Automated tests mock upstream market calls. To also run the service integration tests, set `ORBITAL_POSTGRES_TEST=1` with a PostgreSQL account that can create a disposable database, and set `ORBITAL_TEST_REDIS_URL` to a disposable empty Redis instance. Never point the Redis test at the app’s shared market namespace.

```sh
ORBITAL_POSTGRES_TEST=1 ORBITAL_TEST_REDIS_URL=redis://127.0.0.1:16389 \
  node --env-file=.env.local node_modules/vitest/vitest.mjs run --config vitest.config.ts
```
