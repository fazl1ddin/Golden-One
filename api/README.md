# Golden One API

Backend for a credit organization that finances iPhones and can remotely lock
them (Apple MDM Lost Mode) when a loan falls overdue.

Fastify · TypeScript · Prisma · PostgreSQL

---

## Two rules the design turns on

**1. A device is not "locked" until the MDM confirms it.**
Apple MDM is asynchronous — accepting a command means it was queued for APNs
delivery, not that the phone applied it. A phone that is switched off can sit
queued for hours. So a lock moves the device to `LOCK_PENDING`, and only a
confirmation from the MDM moves it to `LOCKED`; a background reconciler polls
for the real outcome. An operator telling a customer "your phone is locked"
must be telling the truth.

**2. The audit trail cannot be rewritten.**
Locking someone's phone is an act under the loan agreement. Audit rows record
who acted, on which device, why, and from which IP — and a database trigger
rejects `UPDATE` and `DELETE`, so the record survives even someone with a psql
prompt.

## Roles

| Role | Can |
|---|---|
| `POS_OPERATOR` | Register devices at the point of sale. **Cannot lock.** |
| `COLLECTIONS` | Work the queue: lock, unlock, locate, sound, read audit. |
| `ADMIN` | Everything, plus users, release, and manual reconciliation. |

The point-of-sale role is deliberately barred from locking: that terminal sits
on a shop counter, often on shared hardware.

## Running it locally

```bash
cp .env.example .env          # then set DATABASE_URL and JWT_SECRET
npm install
npm run migrate:deploy        # apply migrations
npm run seed                  # demo data; prints generated operator passwords
npm run dev                   # http://localhost:4000
```

`npm run seed` never installs a default password. It takes one from
`SEED_*_PASSWORD` or generates a random one and prints it once.

With Docker:

```bash
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))") \
  docker compose up --build -d
docker compose run --rm api npm run migrate:deploy
```

## Checks

```bash
npm run typecheck
npm test                                   # integration tests, real Postgres
npm run smoke -- https://api.example.com   # post-deploy verification
```

The tests are integration tests on purpose: the behaviour that matters — a role
guard refusing a lock, a device staying pending until confirmed, an audit row
that cannot be rewritten — lives in the seams between Fastify, Prisma and the
MDM adapter, which mocks would step straight over.

Point `DATABASE_URL` at a **separate** test database: the suite truncates tables
between tests, and runs serially for that reason.

## API

All `/api` routes except `POST /api/auth/login` require
`Authorization: Bearer <token>`.

| Method | Path | Permission |
|---|---|---|
| `POST` | `/api/auth/login` | public |
| `GET` | `/api/auth/me` | any signed-in user |
| `POST` | `/api/auth/password` | any signed-in user |
| `GET` | `/api/stats` | `device:read` |
| `GET` | `/api/devices` | `device:read` — `?status=&lock=&search=&limit=&cursor=` |
| `GET` | `/api/devices/:id` | `device:read` |
| `POST` | `/api/devices/:id/lock` | `device:lock` |
| `POST` | `/api/devices/:id/unlock` | `device:unlock` |
| `POST` | `/api/devices/:id/locate` | `device:command` |
| `POST` | `/api/devices/:id/sound` | `device:command` |
| `POST` | `/api/devices/:id/release` | `device:release` (contract must be `PAID`) |
| `POST` | `/api/enroll` | `device:enroll` |
| `GET` | `/api/contracts/:id/payments` | `contract:read` |
| `POST` | `/api/contracts/:id/payments` | `contract:payment` |
| `GET` | `/api/audit` | `audit:read` — cursor paginated |
| `POST` | `/api/commands/reconcile` | `user:manage` |
| `POST` | `/api/contracts/recompute` | `user:manage` |
| `GET`/`POST` | `/api/users` | `user:manage` |
| `PATCH` | `/api/users/:id/active` | `user:manage` |
| `GET` | `/health/live`, `/health/ready` | public |

**Idempotency.** Send `Idempotency-Key` on lock/unlock. A retry with the same
key returns the original command (`replayed: true`) instead of sending a second
lock to the phone.

**`arrears`.** Every contract in a device payload carries a computed `arrears`:
the amount that clears the overdue position *today*, capped at the outstanding
balance, `0` when the contract is current. It is derived on read rather than
stored, so it cannot drift between the nightly recompute and the moment a
customer is at the counter paying. One instalment is not the same as enough —
a customer three months behind who pays one stays overdue and stays locked.

## Payments and collections

`POST /api/contracts/:id/payments` records money received and moves the contract
to its new position. Two rules are worth knowing:

- **A part-payment does not buy time.** Each *whole* instalment covered pushes
  the due date one month forward; anything less reduces the balance and leaves
  the date where it was. Otherwise a customer could pay 1 so'm to postpone a
  lock indefinitely.
- **Clearing the arrears releases the phone by itself.** If the payment takes
  the contract out of `OVERDUE`, every locked device on it is unlocked without
  waiting for anyone to press a button. Leaving a paid-up customer locked out is
  the worst failure this product has, so the automatic action is the permissive
  one. A failed unlock is written to the audit log and never rolls back the
  payment — the money arrived either way.

The collections worker (`COLLECTIONS_INTERVAL_MS`) recomputes arrears, then
warns customers who are `WARN_AFTER_DAYS` overdue, no more often than
`WARN_COOLDOWN_DAYS`. It locks automatically **only** when `AUTO_LOCK_ENABLED`
is true, which it is not by default: taking someone's phone without an operator
deciding to is a policy choice with legal weight, and it should be switched on
deliberately rather than inherited. With it off, the loop still warns, so nobody
is locked without notice.

Notifications currently go to the log (`LogNotifier`) and report
`delivered: false`. That is deliberate — the audit trail records that no channel
was configured, rather than implying a customer was told when they were not.
Wiring a real SMS provider means implementing one `Notifier`.

## MDM adapters

Business logic depends only on the `DeviceManager` interface
(`src/mdm/types.ts`), so swapping vendors touches one file.

- `MockAdapter` — development and tests. Queues commands and settles them on a
  status poll, mirroring real MDM rather than pretending everything succeeds
  instantly. Can simulate an offline phone.
- `MosyleAdapter` — Mosyle Business. **Reconcile its endpoint paths against
  Mosyle's current API docs before going live**; the shapes here are a
  reasonable design, not a verified contract. Mosyle needs **two** secrets: the
  API key (`MOSYLE_ACCESS_TOKEN`, sent in the request body) and an administrator
  login (`MOSYLE_EMAIL` / `MOSYLE_PASSWORD`) that is exchanged for the short-lived
  JWT in the `Authorization` header. An expired JWT is re-obtained and the call
  retried once, so a token expiry never surfaces as a failed lock. Any vendor
  status the adapter does not recognise maps to `PENDING` — an unknown reply must
  never be read as "the phone is locked".

## Security posture

- Passwords hashed with scrypt (memory-hard, from Node's standard library).
- Tokens carry a `tokenVersion`: deactivating a user or changing a password
  invalidates existing tokens **immediately** rather than at expiry.
- The acting user comes from the verified token — never from a request header.
- Per-user rate limits, tighter on login and on device commands.
- Helmet headers; CORS restricted to an explicit origin allowlist.
- Config validated at boot: a production start with a wildcard CORS origin, a
  short `JWT_SECRET`, or `MDM_PROVIDER=mock` fails immediately.
- Authorization headers and passwords are redacted from logs.

## Operational notes

- Run `npm run migrate:deploy` as a release step, not on container start —
  several replicas booting at once must not race to migrate.
- `/health/live` is liveness; `/health/ready` also checks the database and
  returns 503 when it is unreachable.
- Shutdown is graceful: in-flight requests finish, so an MDM command is never
  abandoned halfway.
- `npm run seed` truncates every table, including the audit log. It exists for
  development — never point it at production.

## Known gaps

- Mosyle endpoint paths need verifying against the live API (above).
- Warnings have no delivery channel: `LogNotifier` writes to the log and reports
  `delivered: false`. An SMS/push provider is Phase 3 in `PLAN.md`.
- No integration with the bank's own credit system; payments are entered by an
  operator at the counter rather than reconciled from a ledger feed.
- No refresh tokens: sessions last `JWT_EXPIRES_IN` (default 12h) and then
  require signing in again, which suits a staffed console.
