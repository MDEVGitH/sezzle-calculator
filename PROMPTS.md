# Prompts used

This project was built with **Claude Code** (Anthropic's CLI coding agent, model Claude Opus 5.5) as a pair-programming assistant. I defined the requirements and architecture, reviewed each step, and made the decisions noted below.

> **Note on wording:** the prompts below have been edited for clarity and structure. They keep the exact scope and constraints of what was asked during the session.

---

## Prompt 1: Build the full-stack calculator

```text
You are a senior full-stack engineer. Build a production-quality calculator
application from the assignment below, prioritizing correctness, clarity and
maintainability over extra features.

## Scope
- Operations: addition, subtraction, multiplication, division, plus the
  optional exponentiation, square root and percentage.
- Frontend: React + TypeScript. Intuitive UI, client-side input validation,
  clear error messages, responsive layout with basic mobile support.
- Backend: Go REST microservice that exposes the operations, validates input,
  handles edge cases (division by zero, invalid data) and returns JSON.

## Architectural constraints
- The backend must follow hexagonal architecture (ports & adapters):
  - a pure domain layer with no framework or transport dependencies,
  - a driving port (interface) that adapters depend on,
  - a service implementing the use cases,
  - an HTTP adapter responsible only for translation and error mapping,
  - a composition root in cmd/ that wires everything together.
- Prefer the Go standard library; avoid unnecessary dependencies.
- Return stable, machine-readable error codes alongside human-readable messages.

## Deployment
- Run the frontend and the backend in two separate Docker containers,
  orchestrated with docker-compose.
- Use multi-stage builds, small and non-root runtime images, and run the
  unit tests as part of the image build.

## Quality
- Unit tests for both layers covering key functionality and edge cases,
  with a coverage report.
- A README with setup instructions, how to run each tier (with and without
  Docker), API usage examples and the design decisions and assumptions.

## Process
1. Start by presenting an implementation plan.
2. Implement it.
3. Run the application locally and verify it end to end.
4. Run the test suites and report coverage.
5. Push the result to my GitHub repository.
```

**Decision during the session:** Go, Docker Desktop (with WSL2) and the GitHub CLI were not installed on the machine. When the agent asked, I chose to install them via `winget` so the solution could be verified locally in containers.

---

## Prompt 2: Paginate the calculation history

```text
Add pagination to the calculation history panel in the frontend.

Requirements:
- Show a fixed number of entries per page, with Previous/Next controls
  and a "Page X of Y" indicator.
- Disable the controls at the first and last page, and hide the paginator
  when all entries fit on a single page.
- When a new calculation is added, return to the first page so the latest
  result is always visible.
- Keep the page in range if the history shrinks.
- Raise the history cap so pagination is meaningful.
- Cover the behaviour with unit tests, keep the existing suite green,
  update the README, and rebuild the frontend container.
```

---

## What the agent produced

1. **Plan:** hexagonal Go backend (domain, port, service, HTTP adapter), React + TypeScript frontend (API client, hook, presentational components), two Dockerfiles plus docker-compose, README, and tests for both layers.
2. **Backend:** standard library only, with table-driven tests. Coverage is 99.1% on `internal/`.
3. **Frontend:** built with Vite, Vitest and React Testing Library. 58 tests, 99.6% statement coverage.
4. **Verification:** ran the backend natively and smoke-tested every endpoint and error case with curl. Then built and ran both containers with `docker compose up --build`, and verified the frontend, the nginx `/api` proxy and the fallback that serves the app on unknown page routes.
5. **Pagination:** added history pagination (5 per page, cap of 50) with dedicated tests.
6. **Delivery:** published the repository to GitHub.
