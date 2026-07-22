# Golden One — API (Phase 1 MVP)

Backend for a credit organization that finances iPhones and can **remotely lock**
them via MDM (Lost Mode) when a loan is overdue. Collection operators trigger
lock/unlock manually; **every action is audited**.

See [`../PLAN.md`](../PLAN.md) for the full business context.

## Stack

- **Node.js 22** + **TypeScript** (strict, ESM, `NodeNext`)
- **Fastify 5** HTTP server
- **Prisma 5** ORM on **SQLite** (`dev.db`)
- **Zod** request validation
- Vendor-neutral **MDM abstraction layer** (Mock + Mosyle adapters)

## Setup

```bash
cd api
cp .env.example .env        # a ready-to-use .env is already included for dev
npm install
npm run db:push             # create dev.db from the Prisma schema
npm run seed                # load demo data (mirrors the prototype)
npm run dev                 # start on http://localhost:4000
```

## Scripts

| Script              | What it does                                            |
| ------------------- | ------------------------------------------------------- |
| `npm run dev`       | Start with hot reload (`tsx watch`)                     |
| `npm run build`     | Compile TypeScript to `dist/`                           |
| `npm start`         | Run the compiled server (`dist/server.js`)              |
| `npm run typecheck` | Type-check only (`tsc --noEmit`)                        |
| `npm run db:push`   | Sync the Prisma schema to SQLite                        |
| `npm run seed`      | Seed demo customers/contracts/devices/audit            |
| `npm run smoke`     | Boot the server and curl key endpoints, print PASS/FAIL |

## Environment

| Var                   | Default                              | Notes                                  |
| --------------------- | ------------------------------------ | -------------------------------------- |
| `MDM_PROVIDER`        | `mock`                               | `mock` or `mosyle`                     |
| `MOSYLE_API_URL`      | —                                    | Required when `MDM_PROVIDER=mosyle`    |
| `MOSYLE_ACCESS_TOKEN` | —                                    | Required when `MDM_PROVIDER=mosyle`    |
| `PORT`                | `4000`                               | HTTP port                              |
| `DATABASE_URL`        | `file:./dev.db`                      | SQLite file                            |

## API

All responses are JSON. The acting operator is taken from the `x-actor` request
header or an `actorName` body field (falls back to a default).

| Method & path                   | Description                                                        |
| ------------------------------- | ----------------------------------------------------------------- |
| `GET /health`                   | Liveness + active MDM provider                                    |
| `GET /api/stats`                | Counts: total devices, active contracts, overdue, locked          |
| `GET /api/devices`              | List devices with customer + contract; `?status=` `?lock=` filters |
| `GET /api/devices/:id`          | Device detail incl. contract, recent commands, audit              |
| `POST /api/devices/:id/lock`    | Lost Mode ON — body: `reason`, `message`, `phone`                 |
| `POST /api/devices/:id/unlock`  | Lost Mode OFF — body: `reason`                                    |
| `POST /api/devices/:id/locate`  | Request device location                                           |
| `POST /api/devices/:id/sound`   | Play Lost Mode sound                                              |
| `POST /api/enroll`              | Register customer + contract + device (supervised, ENROLLED)      |
| `GET /api/audit`                | Recent audit log, newest first; `?limit=`                         |

Filters use enum values, e.g. `?status=OVERDUE`, `?lock=LOCKED`.

### Example

```bash
# List overdue, unlocked devices
curl 'http://localhost:4000/api/devices?status=OVERDUE&lock=UNLOCKED'

# Lock a device (Lost Mode)
curl -X POST http://localhost:4000/api/devices/<id>/lock \
  -H 'Content-Type: application/json' -H 'x-actor: Азиз Каримов' \
  -d '{"reason":"Просрочка 12 дней","message":"Оплатите задолженность","phone":"+998 71 200-00-00"}'

# Unlock
curl -X POST http://localhost:4000/api/devices/<id>/unlock \
  -H 'x-actor: Азиз Каримов' -H 'Content-Type: application/json' -d '{"reason":"Оплачено"}'
```

## MDM abstraction

Business logic depends only on the `DeviceManager` interface
(`src/mdm/types.ts`) — never on a concrete vendor:

```ts
interface DeviceManager {
  getEnrollmentStatus(serial): Promise<EnrollmentStatusResult>;
  lock(serial, { message, phone }): Promise<CommandResult>;   // Lost Mode ON
  unlock(serial): Promise<CommandResult>;                     // Lost Mode OFF
  locate(serial): Promise<GeoPoint>;
  playSound(serial): Promise<CommandResult>;
  removeManagement(serial): Promise<CommandResult>;           // contract closed
}
```

- **`MockAdapter`** — in-memory, always succeeds, logs to console. Default for
  local/dev so the full flow works without a real MDM.
- **`MosyleAdapter`** — real request/response shaping against the Mosyle device
  command API. Reads `MOSYLE_API_URL` / `MOSYLE_ACCESS_TOKEN`; throws a clear
  error if they are unset while selected.

The factory (`createDeviceManager`) picks the adapter from `MDM_PROVIDER`.
Adding a vendor = one new file implementing `DeviceManager` + one switch case.

## Architecture

```
src/
  server.ts            entry point
  app.ts               Fastify factory: CORS, error handling, routes
  db.ts                Prisma client singleton
  env.ts               loads .env (Node 22 built-in)
  schemas.ts           Zod request schemas
  routes/index.ts      thin handlers -> services
  services/            business logic (device, enroll, audit)
  mdm/                 DeviceManager interface + Mock/Mosyle adapters + factory
prisma/
  schema.prisma        data model
  seed.ts              demo data
scripts/
  smoke.ts             end-to-end smoke test
```

Route handlers never contain business logic — they validate and delegate to the
service layer. Errors are normalized centrally (`AppError`, `ZodError`,
`MdmError`) to proper HTTP status codes.

## Limitations (MVP scope)

- No authentication/RBAC yet — `x-actor` is trusted (Phase 1). Roles exist in
  the data model for Phase 2.
- No automatic overdue triggers or SMS/push (Phase 2).
- SQLite for simplicity; swap the Prisma datasource for Postgres in production.
- The Mosyle adapter's exact endpoint paths are a reasonable design and should be
  reconciled with Mosyle's production API docs before going live.
