# Full-Stack Calculator

A calculator built with a **React + TypeScript** frontend and a **Go** REST microservice that follows **hexagonal architecture** (ports & adapters). Each tier runs in its **own Docker container**.

Supported operations: addition, subtraction, multiplication, division, exponentiation, square root and percentage.

```
.
├── backend/                 Go REST API (hexagonal)
│   ├── cmd/server/          Composition root: wires the core to adapters
│   └── internal/
│       ├── core/
│       │   ├── domain/      Operations, Calculation, domain errors (pure Go)
│       │   ├── ports/       Calculator interface (driving port)
│       │   └── service/     Use-case implementation of the port
│       └── adapters/
│           └── httpapi/     HTTP/JSON driving adapter + middleware
├── frontend/                React + TypeScript (Vite), served by nginx in Docker
│   └── src/
│       ├── api/             HTTP client for the backend
│       ├── domain/          Operation metadata (labels, arity, formatting)
│       ├── hooks/           useCalculator: state, validation, API calls
│       ├── components/      Presentational components
│       └── utils/           Input parsing & number formatting
├── docker-compose.yml       Two containers: backend + frontend
└── PROMPTS.md               AI prompts used to build this
```

---

## Quick start (Docker)

Requires Docker Desktop (or Docker Engine + Compose v2).

```bash
docker compose up --build
```

| Container             | URL                     | Description                                   |
|-----------------------|-------------------------|-----------------------------------------------|
| `calculator-frontend` | http://localhost:3000   | React app served by nginx, proxies `/api` to the backend |
| `calculator-backend`  | http://localhost:8080   | Go REST API                                   |

Both images run the unit tests during the build, so a broken build never produces an image.

Stop with `docker compose down`.

---

## Running without Docker

### Backend (Go 1.23+)

```bash
cd backend
go run ./cmd/server          # listens on :8080 (override with PORT=9090)
```

### Frontend (Node 20+)

```bash
cd frontend
npm install
npm run dev                  # http://localhost:5173, proxies /api -> http://localhost:8080
```

Set `VITE_PROXY_TARGET` to point the dev proxy at a different backend, or `VITE_API_BASE_URL` at build time to call an absolute API URL.

---

## Tests & coverage

### Backend

```bash
cd backend
go test ./...                                   # run all tests
go test -coverprofile=coverage.out ./internal/...
go tool cover -func=coverage.out                # summary
go tool cover -html=coverage.out                # HTML report
```

| Package                       | Coverage |
|-------------------------------|----------|
| `internal/core/domain`        | 100%     |
| `internal/core/service`       | 96.8%    |
| `internal/adapters/httpapi`   | 100%     |
| **Total (`internal/...`)**    | **99.1%** |

`cmd/server` (wiring only) is excluded from the figure.

### Frontend

```bash
cd frontend
npm test                     # run once
npm run coverage             # text summary + HTML report in frontend/coverage/
```

Vitest + React Testing Library: **58 tests**, **99.6% statement coverage**. The tests cover input validation, number formatting, the API client (success, API errors, network failures, malformed responses) and full UI flows (calculate, Enter to submit, square root mode, validation, error display, loading state, clear, history pagination and limit).

---

## API

Base path: `/api/v1`. All responses are JSON.

| Method | Path                               | Description                          |
|--------|------------------------------------|--------------------------------------|
| GET    | `/healthz`                         | Liveness check                       |
| GET    | `/api/v1/operations`               | List supported operations and arity  |
| POST   | `/api/v1/operations/{operation}`   | Perform a calculation                |

`{operation}` is one of `add`, `subtract`, `multiply`, `divide`, `power`, `sqrt`, `percentage`.

Request body: `{"operands": [number, ...]}`. Binary operations take 2 operands and `sqrt` takes 1.

### Examples

```bash
# Addition
curl -X POST localhost:8080/api/v1/operations/add \
  -H 'Content-Type: application/json' -d '{"operands":[2,3]}'
# 200 {"operation":"add","operands":[2,3],"result":5}

# Division
curl -X POST localhost:8080/api/v1/operations/divide \
  -H 'Content-Type: application/json' -d '{"operands":[10,4]}'
# 200 {"operation":"divide","operands":[10,4],"result":2.5}

# Square root (one operand)
curl -X POST localhost:8080/api/v1/operations/sqrt \
  -H 'Content-Type: application/json' -d '{"operands":[16]}'
# 200 {"operation":"sqrt","operands":[16],"result":4}

# Percentage: 15% of 200
curl -X POST localhost:8080/api/v1/operations/percentage \
  -H 'Content-Type: application/json' -d '{"operands":[15,200]}'
# 200 {"operation":"percentage","operands":[15,200],"result":30}

# Division by zero
curl -X POST localhost:8080/api/v1/operations/divide \
  -H 'Content-Type: application/json' -d '{"operands":[1,0]}'
# 422 {"error":{"code":"DIVISION_BY_ZERO","message":"division by zero"}}

# Invalid data
curl -X POST localhost:8080/api/v1/operations/add \
  -H 'Content-Type: application/json' -d '{"operands":["x",1]}'
# 400 {"error":{"code":"INVALID_REQUEST","message":"request body must be JSON like {\"operands\": [number, ...]}"}}
```

Through the frontend container, the same endpoints are available at `http://localhost:3000/api/v1/...`.

### Error codes

| HTTP | Code                    | When                                              |
|------|-------------------------|---------------------------------------------------|
| 400  | `INVALID_REQUEST`       | Malformed/empty JSON, non-numeric or `null` operand, unknown fields, body > 1 KiB |
| 400  | `INVALID_OPERAND_COUNT` | Wrong number of operands for the operation        |
| 404  | `UNSUPPORTED_OPERATION` | Unknown operation in the path                     |
| 405  | n/a                     | Wrong HTTP method                                 |
| 422  | `DIVISION_BY_ZERO`      | Divisor is 0                                      |
| 422  | `NEGATIVE_SQUARE_ROOT`  | `sqrt` of a negative number                       |
| 422  | `UNDEFINED_RESULT`      | Result overflows or is NaN (e.g. `10^400`, `(-8)^0.5`) |
| 500  | `INTERNAL_ERROR`        | Unexpected failure (panics are recovered)         |

---

## Design decisions

### Backend: hexagonal architecture
- **Domain (`core/domain`)** has no dependencies at all. It defines `Operation`, `Calculation`, the operation catalogue (name, arity, description) and sentinel errors such as `ErrDivisionByZero`.
- **Port (`core/ports.Calculator`)** is the only thing driving adapters depend on. Adding a gRPC or CLI adapter would not touch the core.
- **Service (`core/service`)** implements the port. All business rules live here: arity checks, finite-input checks, division by zero, negative square roots, overflow/NaN detection, and normalising `-0` to `0`.
- **HTTP adapter (`adapters/httpapi`)** only translates. It decodes JSON, maps domain errors to HTTP status codes and error codes, and encodes responses. It is tested against both the real service and a stub port.
- **Composition root (`cmd/server`)** wires everything and handles server timeouts and graceful shutdown.
- No driven/secondary adapters are needed because there is no persistence. A history store, for example, would be added as a new driven port plus an adapter, without changing the HTTP layer.
- **Standard library only.** Go 1.22+ `net/http` routing (`POST /api/v1/operations/{operation}`) and `log/slog` cover every need, so there are zero third-party dependencies.

### API design
- **One resource per operation** (`POST /operations/{op}`) with a uniform `{"operands": [...]}` body. This gives REST-style endpoints per operation while keeping a single validation path and making new operations a one-line catalogue change.
- **Stable error codes** (`DIVISION_BY_ZERO`, …) alongside human messages, so clients can branch on codes without parsing text.
- **400 vs 422**: 400 means the request is malformed. 422 means the request is well-formed but mathematically invalid.
- **Strict decoding**: unknown fields, trailing data, `null` operands (which Go would otherwise silently decode as `0`) and bodies over 1 KiB are rejected.
- **Percentage** is defined as `a% of b = a × b / 100`.

### Frontend
- **`useCalculator` hook** owns all state and logic. Components are purely presentational. The API function is **injected** (`calculateFn` prop/argument), so UI tests run without network mocking.
- **Client-side validation** (`parseOperand`) gives instant feedback (empty, malformed, overflow) and avoids pointless requests. The **server remains the source of truth** for math errors, which are shown in the display.
- **Stale-response protection**: a request counter makes sure only the latest response updates the UI. The submit button is disabled while a request is in flight.
- **Number formatting** trims float noise (`0.1 + 0.2` → `0.3`) and switches to exponent notation for very large or very small values.
- **Accessibility & responsiveness**: labelled inputs, `aria-invalid`/`aria-describedby` for errors, `role="radiogroup"` for operations, an `aria-live` result region, `inputMode="decimal"` for mobile keyboards, a layout that adapts to narrow screens, and dark mode.
- **Same-origin API**: in development Vite proxies `/api`, and in Docker nginx does. This removes the need for CORS configuration.

### Docker
- **Two containers**, as requested: `backend` (distroless, non-root, static Go binary, about 14 MB image) and `frontend` (nginx serving the static build and reverse-proxying `/api` to `backend:8080` over the Compose network).
- Multi-stage builds that run the tests before producing the image.

### Assumptions
- Numbers are IEEE-754 doubles. Results that cannot be represented (overflow, NaN) are errors rather than `Infinity`.
- Calculations are stateless. History lives only in the browser session, is capped at 50 entries and is paginated 5 per page (it jumps back to page 1 when a new result arrives).
