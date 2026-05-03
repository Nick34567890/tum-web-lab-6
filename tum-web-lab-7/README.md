# Lab 7 — Game Activity Tracker API

REST back-end for the Lab 6 client. CRUD over four entities (`library`,
`planner`, `wishlist`, `history`), JWT-based authorization with role and
permission claims, pagination, and Swagger UI documentation.

Built to satisfy the Lab 7 spec (`lab7_task.md`):

- ✅ JWT-protected CRUD for the entities from Lab 6
- ✅ JWT carries `role` and `permissions` claims
- ✅ JWT expires in 1 minute (demo)
- ✅ `/token` endpoint accepts role/permissions via JSON `POST` or query `GET`
- ✅ Pagination with `?limit=&offset=`
- ✅ Appropriate HTTP status codes (200/201/204/400/401/403/404/409)
- ✅ Swagger UI at `/docs`
- ✅ Connected to the Lab 6 React client

## Stack

- **Node.js 18+** (uses `fetch`, `node --watch`, ESM)
- **Express 4**
- **jsonwebtoken** for JWT issuance/verification
- **swagger-ui-express** for the interactive docs
- File-based persistence at `data/db.json` (seeded from `data/seed.json` on first run)

## Run

```bash
cd tum-web-lab-7
npm install
npm start          # production-like
# or
npm run dev        # auto-restart with --watch
```

The server listens on `http://localhost:4000` by default. Configure with:

| Env var         | Default                              | Description                         |
| --------------- | ------------------------------------ | ----------------------------------- |
| `PORT`          | `4000`                               | HTTP port                           |
| `JWT_SECRET`    | dev placeholder                      | Replace in production               |
| `JWT_EXPIRES_IN`| `60s`                                | JWT lifetime (lab spec: 1 minute)   |
| `CORS_ORIGINS`  | `http://localhost:5173,http://localhost:4173` | Comma-separated allow-list |

## Endpoints (overview)

| Method | Path                       | Permission required | Notes                         |
| ------ | -------------------------- | ------------------- | ----------------------------- |
| GET    | `/`                        | —                   | Service info                  |
| GET    | `/health`                  | —                   | Liveness probe                |
| GET    | `/docs`                    | —                   | Swagger UI                    |
| GET    | `/openapi.json`            | —                   | OpenAPI 3.0 spec              |
| POST   | `/token`                   | —                   | Issue JWT (body)              |
| GET    | `/token`                   | —                   | Issue JWT (query)             |
| GET    | `/api/{collection}`        | `READ`              | Paginated list                |
| GET    | `/api/{collection}/:appid` | `READ`              | Single entry                  |
| POST   | `/api/{collection}`        | `WRITE`             | Create (409 on duplicate)     |
| PUT    | `/api/{collection}/:appid` | `WRITE`             | Replace/patch fields          |
| DELETE | `/api/{collection}/:appid` | `DELETE`            | Remove (204 on success)       |

`{collection}` ∈ `library | planner | wishlist | history`.

## Roles & permissions

Tokens carry `role` and `permissions` claims. Either is enough — explicit
`permissions` win over `role`.

| Role      | Permissions granted        |
| --------- | -------------------------- |
| `ADMIN`   | `READ`, `WRITE`, `DELETE`  |
| `WRITER`  | `READ`, `WRITE`            |
| `VISITOR` | `READ`                     |

Custom example: `permissions: ["READ", "WRITE"]` → behaves like `WRITER`.

## Quick demo with curl

```bash
# 1) Get an ADMIN token
TOKEN=$(curl -s -X POST http://localhost:4000/token \
  -H 'content-type: application/json' \
  -d '{"role":"ADMIN"}' | jq -r .token)

# 2) List library (paginated)
curl -s "http://localhost:4000/api/library?limit=10&offset=0" \
  -H "authorization: Bearer $TOKEN" | jq

# 3) Create an entry
curl -s -X POST http://localhost:4000/api/library \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"appid":1086940,"name":"Baldur'\''s Gate 3","developer":"Larian Studios"}'

# 4) Update it
curl -s -X PUT http://localhost:4000/api/library/1086940 \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"developer":"Larian"}'

# 5) Delete it
curl -s -X DELETE http://localhost:4000/api/library/1086940 \
  -H "authorization: Bearer $TOKEN" -i

# 6) Try with VISITOR (should 403 on writes)
VTOKEN=$(curl -s "http://localhost:4000/token?role=VISITOR" | jq -r .token)
curl -s -X DELETE http://localhost:4000/api/library/730 \
  -H "authorization: Bearer $VTOKEN" -i        # expects 403
```

After 60 seconds the token will be rejected with `401 Token expired.` —
request a new one from `/token`.

## Pagination

`GET /api/{collection}` returns:

```json
{
  "collection": "library",
  "total": 137,
  "limit": 10,
  "offset": 20,
  "count": 10,
  "items": [ /* up to `limit` entries */ ]
}
```

Defaults: `limit=50`, `offset=0`. Either may be `0+`. `400` is returned
for negative values.

## Status codes used

| Status | When                                                  |
| ------ | ----------------------------------------------------- |
| 200    | Successful read / update / token issue                |
| 201    | Resource created (with `Location` header)             |
| 204    | Successful delete                                     |
| 400    | Malformed body, missing required fields, bad query    |
| 401    | Missing / invalid / expired JWT                       |
| 403    | JWT lacks the required permission                     |
| 404    | Entry / route not found                               |
| 409    | `appid` already exists in this collection             |
| 500    | Unhandled server error                                |

## Connecting the Lab 6 client

The Lab 6 React app (`../tum-web-lab-6`) has been updated to consume this
API. See [`../tum-web-lab-6/README.md`](../tum-web-lab-6/README.md) and
the new `Lab 7 integration` section there.

In short:

1. `npm install && npm start` here (port `4000`).
2. `cd ../tum-web-lab-6 && npm run dev` (port `5173`).
3. Open the app — the new top **AuthBar** shows the API URL, lets you
   pick a role (`ADMIN/WRITER/VISITOR`), and counts the JWT down from 60s.
4. All add/edit/remove actions in Library / Planner / Calendar are
   mirrored to the API. Refreshing the page reloads from the server.
5. Pick `VISITOR` and try to add a game — the request is `403`'d by the
   server (the optimistic local update will still happen so you can see
   the warning in DevTools console).

## Project layout

```
tum-web-lab-7/
├── README.md
├── package.json
├── data/
│   ├── seed.json        # initial data, used the first time db.json is missing
│   └── db.json          # generated at runtime, gitignored
└── src/
    ├── index.js         # Express bootstrap
    ├── config.js        # env-driven settings (PORT, JWT_*, CORS_*)
    ├── auth.js          # JWT sign/verify + permission middleware
    ├── store.js         # JSON-file persistence
    ├── swagger.js       # OpenAPI 3.0 spec
    └── routes/
        ├── token.js     # POST/GET /token
        └── collection.js  # CRUD factory used by all four collections
```
