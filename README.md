# Meeting Notes Distiller Web

Meeting Notes Distiller Web is a local, deterministic web application that turns one or more meeting transcript `.txt` files into structured participants, topics, topic summaries, decisions, action items, deadlines, evidence, and problem warnings. It needs no database, API key, paid service, or network connection after dependencies are installed.

## Features

- Drag-and-drop or file-picker upload for multiple `.txt` files.
- Additive upload rounds with duplicate-file suppression and a visible queue.
- Explicit **Analyze Meetings** action; files are never processed merely because they were selected.
- Per-file validation and partial success when another file is empty or unsupported.
- Four normalized format outcomes: speaker-colon, timestamp-dash, timestamp-block, and safe unstructured fallback.
- Evidence-bound participants, topic summaries, conservative decisions, action owners, deadlines, and warnings.
- No-decision, conflicting-date, unassigned-action, empty-transcript, and parse-warning states.
- Separate meeting result cards plus a global action list grouped by owner.
- Valid downloadable Word report with all analyzed sections and grouped actions.
- Responsive Tailwind/shadcn dashboard with loading, empty, success, and error feedback.
- Unit, schema, API, component, artifact-integrity, and Playwright E2E coverage.

## Tech Stack

- **Frontend:** React 19, Vite, TypeScript, Tailwind CSS v4, shadcn/ui primitives, and Lucide React. This keeps the UI typed, responsive, and small without a competing component framework.
- **Backend:** Express 5 and TypeScript. It provides multipart upload analysis and Word export endpoints.
- **Shared:** Zod schemas and TypeScript contracts shared by browser and server.
- **Extraction:** deterministic rules and heuristics, fully offline and reproducible.
- **Testing:** Vitest, Testing Library, Supertest, and Playwright.
- **Report generation:** `docx` for runtime `.docx` creation.

## Architecture

The frontend owns file selection, queue state, API calls, feedback, and rendering. Express validates multipart input, isolates per-file failures, runs domain services, and returns shared structured contracts. Neither route handlers nor React components contain extraction rules.

Processing follows this path:

```text
TXT upload -> validation -> text cleanup -> format normalization
           -> normalized utterances -> deterministic extraction
           -> participants/topics/decisions/actions/flags
           -> shared result -> browser and DOCX report
```

- **Transcript normalization:** `backend/src/domain/normalizer.ts` detects supported layouts, preserves source evidence, joins continuation lines, and safely falls back to unstructured utterances.
- **Extraction:** focused modules extract participants, topics, decisions, actions, and problem flags into the Zod-backed model.
- **Conflict detection:** multi-option discussions without explicit resolution become no-decision flags. Competing dates are grouped by topic before conflict checks, so unrelated deadlines do not conflict.
- **DOCX generation:** the report service renders each meeting, topics, decision status, owner/deadline/evidence, warnings, failures, and global owner grouping.
- **Tests:** unit tests target normalization and semantics; Supertest targets API boundaries; Testing Library targets queue behavior; Playwright targets complete browser workflows.

## Directory Structure

```text
frontend/             React/Vite client and shadcn primitives
backend/              Express API, extraction pipeline, DOCX generation
shared/               Zod contracts and TypeScript domain types
tests/unit/           deterministic parser/extractor tests
tests/api/            Supertest API integration tests
tests/frontend/       React component behavior tests
tests/artifacts/      submission-document OOXML tests
e2e/                  Playwright browser workflows
sample-data/          supported and edge-case transcript examples
docs/                 design records and required submission documents
.claude/skills/       reusable Claude workflow
```

## Local Installation

Prerequisites: Node.js 22 or newer, npm 11 or compatible, and Git. The project has no environment variables or secrets.

```bash
git clone <repository-url>
cd Meeting-Notes-Distiller-Web
npm ci
npm run e2e:install
```

Start the complete application:

```bash
npm run dev
```

Open `http://127.0.0.1:5173`. Vite proxies `/api` to `http://127.0.0.1:8787`.

Start services separately when needed:

```bash
npm run dev:backend
npm run dev:frontend
```

Production build and server:

```bash
npm run build
npm start
```

After a production build, Express serves the frontend at `http://127.0.0.1:8787`.

Quality commands:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run e2e
npm run verify:artifacts
npm run verify
```

## Usage

1. Open the application.
2. Drag transcript files into the upload area or use the file picker.
3. Add more `.txt` files in later selection rounds if needed.
4. Click **Analyze Meetings**.
5. Review each meeting, decisions, action items, evidence, and warnings.
6. Review global actions grouped by owner, including **Unassigned**.
7. Click **Download Word Report** to save the combined analysis.

## Supported Transcript Formats

Format A — speaker and colon:

```text
Alice: We should release next Friday.
Bob: I agree.
```

Format B — bracketed timestamp and dash:

```text
[09:00] Alice - We should release next Friday.
[09:02] Bob - I agree.
```

Format C — timestamp/speaker header followed by body:

```text
09:00 Alice
We should release next Friday.
```

Unlabelled prose is also retained as an unstructured transcript with no invented speaker. English is the primary extraction language; targeted Thai assignment, weekday, and explicit-decision patterns are covered.

## Design Decisions

- **Stack selection:** one TypeScript workspace gives shared types, fast local setup, strong tests, and mature DOCX/browser tooling without infrastructure.
- **Frontend/backend separation:** upload and display remain in `frontend/`; file handling, extraction, and report generation remain in `backend/`; contracts remain in `shared/`.
- **Parser strategy:** line-format normalization is independent of semantic extraction, so new transcript syntax can be added without changing the UI.
- **Deterministic extraction:** transparent keyword and phrase patterns provide offline reproducibility. No LLM or paid API is required.
- **Topics and summaries:** configured subject vocabularies group only matching utterances; summaries describe the evidence instead of generating unsupported facts.
- **Decision recognition:** only explicit agreement/resolution phrases or unqualified collective commitments such as “we will launch” create decisions. Proposals, consideration language, and alternatives alone become no-decision warnings where applicable.
- **Action recognition:** assignment, commitment, requirement, deadline, and targeted Thai patterns are used. Missing fields stay absent in the model and display as **Unassigned** or **Not specified**.
- **Conflict detection:** competing dates around a common subject are flagged unless explicit decision evidence resolves the discussion.
- **DOCX strategy:** the server creates OOXML in memory and returns it directly; no report data is persisted.
- **Testing strategy:** semantics are verified below the HTTP layer, API behavior is integrated with Supertest, and only major user journeys use Playwright.

## Error Handling

Unsupported extensions and oversized selections are rejected with user-facing feedback. Empty files, invalid UTF-8, oversized files, and per-file processing failures are returned by filename while successful meetings remain available. The server has a 10 MiB transport safety cap and enforces the 1 MiB application limit per file. It validates report payloads and sends safe messages instead of stack traces. Download failures remain visible in the current result view.

## CLAUDE.md Change Log

`CLAUDE.md` was created after the implementation commands and directory responsibilities were known. No post-creation instruction changes were required.

## Claude Skill

The reusable skill is **transcript-regression-test** at `.claude/skills/transcript-regression-test/SKILL.md`. It guides adding a transcript fixture, testing normalization first, adding evidence-based semantic expectations, running focused and broad regressions, and updating format documentation. This workflow repeats whenever an instructor sample, language pattern, or extraction bug appears, so a reusable skill keeps changes consistent and prevents invented expectations.

## Submission Documents

- `docs/Meeting_Notes_Distiller_SRS.docx` — requirements and product specification for the implemented system.
- `docs/Unit_Test_Cases.xlsx` — cases generated from implemented unit, component, and API tests.
- `docs/SIT_UAT_Test_Cases.xlsx` — actual system-integration and user-acceptance browser/API flows.

The workbook source of truth is `scripts/test-catalog.mjs`; `scripts/build_test_workbooks.mjs` consumes it with the Codex workspace document runtime. `npm run verify:artifacts` validates the committed Office Open XML outputs without requiring that authoring runtime.

## Known Limitations

- Extraction is heuristic, not general natural-language understanding; unusual phrasing may be missed.
- English has the broadest rule coverage. Thai support is intentionally limited to tested phrases.
- Conflict detection focuses on unresolved date alternatives with shared launch/release context; it does not solve arbitrary logical contradictions.
- Topic categories use a fixed vocabulary. Unmatched content receives a general-discussion topic rather than a generated taxonomy.
- Relative deadlines are retained as written and are not converted to calendar dates.
- Files are processed in memory and not persisted. The API limits individual uploads and batch count to protect local resources.
