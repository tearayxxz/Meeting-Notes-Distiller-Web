# CLAUDE.md

## Tech stack

- Frontend: React 19, Vite, TypeScript, Tailwind CSS v4, selected shadcn/ui primitives, and Lucide React.
- Backend: Express 5 and TypeScript.
- Shared contracts: TypeScript and Zod in `shared/`.
- Testing: Vitest, Testing Library, Supertest, and Playwright.
- Reports: `docx` for runtime Word export. Core extraction is deterministic and offline.

## Coding style

- Use strict TypeScript and descriptive camelCase for variables/functions; use PascalCase for React components and exported types.
- Keep files focused. Parsing normalizes syntax; extraction derives semantics; UI renders structured results.
- Format through ESLint-compatible project conventions. Avoid `any`; validate network boundaries with shared Zod schemas.
- Return safe user-facing errors. Never expose stack traces or silently discard per-file failures.
- Preserve transcript evidence for decisions, actions, and conflict flags. Never invent owners, dates, participants, or decisions.
- Add deterministic tests for every extraction behavior change and every bug fix.

## Directory layout

- `frontend/`: React interface and reusable UI primitives.
- `backend/`: Express routes, transcript domain pipeline, and report generation.
- `shared/`: API contracts and structured domain schemas.
- `tests/`: unit, API, frontend component, and artifact integrity tests.
- `e2e/`: Playwright browser workflows.
- `sample-data/`: deterministic representative transcripts.
- `docs/`: design notes and required submission documents.
- `.claude/skills/`: reusable repository workflows for Claude.

## Commands

- `npm run dev` — run frontend and backend together.
- `npm run dev:backend` — run only the API with watch mode.
- `npm run dev:frontend` — run only Vite.
- `npm test` — run all Vitest unit, API, component, and artifact tests once.
- `npm run lint` — run ESLint with zero warnings allowed.
- `npm run typecheck` — type-check all workspaces.
- `npm run build` — build shared contracts, backend, and frontend.
- `npm run e2e` — run Playwright browser tests.
- `npm run verify:artifacts` — validate required DOCX/XLSX OOXML structure and required text.
- `npm run verify` — run lint, tests, build, E2E, and artifact validation.

## Project rules

1. Never mix transcript parsing or extraction rules into React components or Express route handlers.
2. Keep normalization separate from semantic extraction and keep both directly unit-testable.
3. Do not invent transcript content. Use `null` internally and `Unassigned`/`Not specified` at presentation boundaries.
4. Treat suggestions as decisions only when later evidence explicitly resolves them.
5. Preserve successful results when another file in a batch fails where practical.
6. Validate API payloads using `shared/` schemas and return safe errors.
7. Required behavior changes must include tests; fixtures must remain deterministic and offline.
8. Run the smallest relevant tests while editing, then full verification before declaring completion.
9. Use shadcn/ui selectively; do not add another component framework.
10. Do not commit secrets, local environment files, dependencies, coverage, Playwright output, or build artifacts.
