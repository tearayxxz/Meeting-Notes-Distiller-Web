# Meeting Notes Distiller Web

Meeting Notes Distiller Web is a local, deterministic web application that turns one or more meeting transcript `.txt` files into structured participants, topics, topic summaries, decisions, action items, deadlines, evidence, and problem warnings. It needs no database, API key, paid service, or network connection after dependencies are installed.

## Features

- Drag-and-drop or file-picker upload for multiple `.txt` files.
- Additive upload rounds with duplicate-file suppression and a visible queue.
- Explicit **Analyze Meetings** action; files are never processed merely because they were selected.
- Per-file validation and partial success when another file is empty or unsupported.
- Four normalized format outcomes: speaker-colon, timestamp-dash, timestamp-block, and safe unstructured fallback.
- Mixed Markdown meeting notes with titles, metadata, attendee lists, section headings, bullets, and dialogue are normalized without turning labels into speakers.
- Evidence-bound participants, topic summaries, conservative decisions, action owners, deadlines, and warnings.
- Regression-tested English and Thai instructor samples cover unresolved brainstorming, structured follow-ups, launch-date conflicts, and contradictory freeze/dashboard work.
- No-decision, conflicting-date, unassigned-action, empty-transcript, and parse-warning states.
- A compact meeting navigator with `Meeting 1 of N`, progress, direct file selection, and one detailed meeting card at a time.
- Valid downloadable Word report with all analyzed sections and grouped actions.
- Responsive Tailwind/shadcn dashboard with reduced-motion-safe Motion transitions plus loading, empty, success, and error feedback.
- Light, Dark, and original **Web-Slinger** appearance themes. The selected theme is remembered in `localStorage`; Web-Slinger adds a restrained one-shot web effect and comic-style warning stamps without delaying analysis.
- Adaptive layered 2.5D depth across Light, Dark, and Web-Slinger themes, with bounded desktop pointer tilt, touch-safe press feedback, and reduced-motion static fallbacks.
- Non-blocking sun/moon horizon transitions for direct Light/Dark switching.
- Unit, schema, API, component, artifact-integrity, and Playwright E2E coverage.

## Tech Stack

- **Frontend:** React 19, Vite, TypeScript, Tailwind CSS v4, shadcn/ui primitives, Lucide React, and Motion for React. This keeps the UI typed and responsive while adding restrained, accessible transitions without another component framework.
- **Backend:** Express 5 and TypeScript. It provides multipart upload analysis and Word export endpoints.
- **Shared:** Zod schemas and TypeScript contracts shared by browser and server.
- **Extraction:** deterministic rules and heuristics, fully offline and reproducible.
- **Testing:** Vitest, Testing Library, Supertest, and Playwright.
- **Report generation:** `docx` for runtime `.docx` creation.

## Architecture

The frontend owns file selection, queue state, API calls, feedback, animated meeting navigation, and rendering. Express validates multipart input, isolates per-file failures, runs domain services, and returns shared structured contracts. Neither route handlers nor React components contain extraction rules.

Processing follows this path:

```text
TXT upload -> validation -> text cleanup -> format normalization
           -> normalized utterances -> deterministic extraction
           -> participants/topics/decisions/actions/flags
           -> shared result -> browser and DOCX report
```

- **Transcript normalization:** `backend/src/domain/normalizer.ts` detects supported layouts and types every retained entry as speech, note, heading, or metadata. It keeps bullet evidence separate, joins genuine dialogue continuations, and safely falls back to structured unlabelled notes.
- **Extraction:** focused modules extract participants from real speakers, attendee/facilitator metadata, and narrowly tested narrative-name patterns; section headings drive structured topics while deterministic language rules derive decisions, actions, and flags.
- **Conflict detection:** multi-option discussions and explicitly unresolved sections become no-decision flags. Competing dates are grouped by topic, and the tested Thai launch fixture additionally detects contradictory feature-freeze and dashboard timing.
- **DOCX generation:** the report service renders each meeting, topics, decision status, owner/deadline/evidence, warnings, failures, and global owner grouping.
- **Layered interface:** `TiltSurface` applies bounded, desktop-only pointer depth to the five focused surfaces from pure depth geometry, while CSS theme tokens supply Light, Dark, and Web-Slinger perspective, contrast, and decorative styling.
- **Theme transitions:** `CelestialTransition` is a click-through, non-blocking sun/moon overlay for direct Light/Dark switches; Web-Slinger uses its separate click-through THWIP effect. Theme selection persists immediately under `meeting-distiller-theme`.
- **2.5D limitation:** The interface uses CSS/Motion 2.5D perspective rather than WebGL or true 3D models; touch devices intentionally omit pointer and gyroscope tracking.
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
5. Optionally choose Light, Dark, or Web-Slinger from the header; the browser remembers the selection on this device.
6. Review each meeting, decisions, action items, evidence, and warnings.
7. Review global actions grouped by owner, including **Unassigned**.
8. Click **Download Word Report** to save the combined analysis.

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

Mixed structured notes — metadata, Markdown sections, bullets, and dialogue:

```text
Attendees: Priya, Marcus, Dana
### Topic 1: Database performance
Marcus: A missing index is increasing latency.
Priya: Decision — add the index this sprint. Marcus owns it, due Friday.
```

Unlabelled prose and rough-note bullets are retained without invented speakers. English is the primary extraction language; tested Thai support includes participant metadata, narrative names, assignments, bare day dates, explicit resolutions, unresolved discussions, and launch/freeze conflicts.

## Design Decisions

- **Stack selection:** one TypeScript workspace gives shared types, fast local setup, strong tests, and mature DOCX/browser tooling without infrastructure.
- **Frontend/backend separation:** upload and display remain in `frontend/`; file handling, extraction, and report generation remain in `backend/`; contracts remain in `shared/`.
- **Parser strategy:** line-format normalization is independent of semantic extraction. Typed normalized entries prevent dates, attendee labels, and Markdown headings from leaking into participant or semantic results.
- **Deterministic extraction:** transparent keyword and phrase patterns provide offline reproducibility. No LLM or paid API is required.
- **Topics and summaries:** explicit Markdown topic headings create separate sections when present; otherwise configured subject vocabularies group evidence. Summaries describe retained evidence instead of generating unsupported facts.
- **Decision recognition:** only explicit agreement/resolution phrases or unqualified collective commitments such as “we will launch” create decisions. Proposals, consideration language, and alternatives alone become no-decision warnings where applicable.
- **Action recognition:** assignment, commitment, requirement, deadline, and targeted Thai patterns are used. Missing fields stay absent in the model and display as **Unassigned** or **Not specified**.
- **Conflict detection:** competing dates around a common subject are flagged unless explicit decision evidence resolves the discussion. Explicit unresolved language can retain a warning after a nominal decision when the transcript still shows a real contradiction.
- **DOCX strategy:** the server creates OOXML in memory and returns it directly; no report data is persisted.
- **Testing strategy:** semantics are verified below the HTTP layer, API behavior is integrated with Supertest, and only major user journeys use Playwright.

## Error Handling

Unsupported extensions and oversized selections are rejected with user-facing feedback. Empty files, invalid UTF-8, oversized files, and per-file processing failures are returned by filename while successful meetings remain available. The server has a 10 MiB transport safety cap and enforces the 1 MiB application limit per file. It validates report payloads and sends safe messages instead of stack traces. Download failures remain visible in the current result view.

## CLAUDE.md Change Log

- Initial creation documented the implemented stack, commands, responsibilities, testing expectations, and deterministic extraction rules.
- On 2026-08-25, the frontend stack and UI rules were updated to include Motion for React and reduced-motion requirements because the approved multi-meeting navigator introduced animated transitions.
- On 2026-08-27, normalization rules were clarified to require typed speech/note/heading/metadata entries after instructor samples exposed metadata labels being misidentified as participants.

## Claude Skill

The reusable skill is **transcript-regression-test** at `.claude/skills/transcript-regression-test/SKILL.md`. It guides adding a transcript fixture, testing normalization first, adding evidence-based semantic expectations, running focused and broad regressions, and updating format documentation. This workflow repeats whenever an instructor sample, language pattern, or extraction bug appears, so a reusable skill keeps changes consistent and prevents invented expectations.

## Submission Documents

- `docs/Meeting_Notes_Distiller_SRS.docx` — requirements and product specification for the implemented system.
- `docs/Unit_Test_Cases.xlsx` — cases generated from implemented unit, component, and API tests.
- `docs/SIT_UAT_Test_Cases.xlsx` — actual system-integration and user-acceptance browser/API flows.

The workbook source of truth is `scripts/test-catalog.mjs`; `scripts/build_test_workbooks.mjs` consumes it with the Codex workspace document runtime. `npm run verify:artifacts` validates the committed Office Open XML outputs without requiring that authoring runtime.

## Known Limitations

- Extraction is heuristic, not general natural-language understanding; unusual phrasing may be missed.
- English has the broadest rule coverage. Thai support is deterministic and limited to the documented, regression-tested participant, decision, action, date, and conflict patterns.
- Conflict detection covers unresolved date alternatives with shared launch/release context and the tested freeze/dashboard contradiction; it does not solve arbitrary logical contradictions.
- Topic categories use a fixed vocabulary. Unmatched content receives a general-discussion topic rather than a generated taxonomy.
- Relative deadlines are retained as written and are not converted to calendar dates.
- Files are processed in memory and not persisted. The API limits individual uploads and batch count to protect local resources.
