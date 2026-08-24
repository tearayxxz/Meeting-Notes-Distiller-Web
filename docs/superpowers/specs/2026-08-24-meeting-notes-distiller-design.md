# Meeting Notes Distiller Web Design

## Purpose and scope

Build a local, deterministic web application that accepts one or more UTF-8 `.txt` meeting transcripts, normalizes multiple speaker formats, extracts structured meeting information, displays per-meeting and global results, and exports the results as a valid Word report. Core use requires no API key, database, authentication, or network service.

The repository starts empty. No instructor sample files are present, so representative deterministic fixtures will be added without claiming instructor provenance.

## Architecture decision

Use an npm-workspace TypeScript monorepo with five clearly named areas:

- `frontend/`: React, Vite, Tailwind CSS, selective local shadcn/ui primitives, and Lucide React icons.
- `backend/`: Express API, transcript normalization, extraction engine, aggregation, and DOCX export.
- `shared/`: TypeScript contracts used by both frontend and backend.
- `tests/`: unit and API tests plus deterministic fixtures.
- `e2e/`: Playwright browser workflows.

This keeps one language and one package manager across the project while preserving the assignment's frontend/backend separation. Next.js was rejected because its integrated server model makes that separation less obvious. React plus FastAPI was rejected because two language toolchains add cost without improving required offline behavior.

Supabase and Vercel-managed services are deliberately excluded. The product has no persistence, users, secrets, or cloud resource requirement. Vite's static build and Express server can still be deployed later without coupling core behavior to a platform.

## Shared data model

`shared/src/contracts.ts` defines serializable contracts for normalized utterances, topic results, decisions, action items, problem flags, per-file failures, meeting analyses, analysis batches, and report requests. Missing owners are represented as `null` in the domain model and displayed/exported as `Unassigned`; missing deadlines are `null` and displayed/exported as `Not specified`.

Problem flag types include `no-decision`, `conflict`, `unassigned-action`, `empty-transcript`, and `parse-warning`. Results preserve transcript evidence for each action item. No field may contain invented participant names, owners, deadlines, or decisions.

## Processing flow

1. Browser validates selected filenames and keeps an additive, de-duplicated queue.
2. User explicitly selects **Analyze Meetings**.
3. Browser posts files as multipart form data to `POST /api/analyze`.
4. Backend validates extension, count, size, decoding, and non-empty content independently per file.
5. Normalizer recognizes:
   - `Speaker: utterance`
   - `[HH:MM] Speaker - utterance`
   - two-line `HH:MM Speaker` followed by utterance text
   - unlabelled lines as unknown-speaker utterances
6. Extractor derives participants only from explicit speaker labels; groups utterances into heuristic topic buckets; writes evidence-bound summaries; recognizes explicit resolution language as decisions; recognizes assignment/obligation language as action items; and extracts nearby date phrases.
7. No-decision detection flags option-bearing discussion without resolution. Conflict detection flags multiple unresolved date values for a common subject.
8. API returns successful meeting analyses and per-file errors in one batch.
9. Frontend renders each meeting, global action items grouped by owner, and a global warning area.
10. `POST /api/report` accepts the typed batch and returns an OOXML `.docx` file.

## Extraction boundaries

Normalization and semantic extraction stay separate. The normalizer converts source text into ordered utterances with optional speaker and timestamp. The extractor consumes only that normalized structure plus filename. This allows format tests independent of semantic tests.

Topic extraction uses deterministic keyword families (release/deployment, infrastructure/server, marketing, schedule, budget, product, and general discussion) and emits concise evidence-bound summaries. Unknown topics fall back to a short phrase based on transcript terms, not external knowledge.

Decision recognition requires explicit finality or agreement phrases such as `decided`, `agreed`, `approved`, `final decision`, `we will`, or an accepted proposal. Possibility language (`could`, `might`, `maybe`, `possible`, `consider`) is never sufficient by itself.

Action recognition covers direct assignments (`Bob, please ...`), obligation language (`Alice will ...`, `Alice needs to ...`), and collective/unowned requirements (`We need to ...`, `Need to ...`). Date extraction handles weekdays, month-date forms, ISO dates, relative phrases such as `tomorrow`, and `by`/`before` deadlines. Missing data stays missing.

## API and error handling

`POST /api/analyze` accepts up to ten `.txt` files. A 10 MiB transport cap prevents unbounded memory use; the service then enforces the 1 MiB transcript limit per file so an oversized file can fail without discarding valid peers. Unsupported extensions, invalid UTF-8, empty files, invalid payloads, and processing exceptions become sanitized per-file errors. A request with no files returns HTTP 400.

`POST /api/report` validates a structured analysis batch before generation. Invalid report data returns a generic 400 response. Unexpected errors return a generic 500 response; stack traces remain server-side. DOCX output uses the `docx` package and descriptive headings, tables, lists, warning styling, page breaks, and document properties.

## Frontend design

The page uses a responsive dashboard layout with a compact header, custom drag/drop upload surface, file cards, clear primary analysis button, status alert, result tabs, meeting cards, owner-grouped action cards, and prominent amber/red warnings. Tailwind provides layout and responsive styling. Local shadcn-compatible `Button`, `Card`, `Badge`, `Alert`, `Tabs`, `Separator`, `Progress`, and `Tooltip` primitives are included only where used. Lucide icons communicate upload, analysis, warning, people, tasks, and download actions.

States are explicit: initial empty, selected files, processing, partial success, success, validation error, API error, and report-generation error. Keyboard focus, labels, live status, contrast, and mobile wrapping are part of acceptance behavior. Animations are limited to short hover/focus transitions and a progress indicator.

## Testing strategy

- Vitest unit tests cover Formats A-C, unknown speakers, duplicate participants, missing-owner action items, deadlines, multiple action items, decision conservatism, no-decision warnings, conflicts, empty content, unsupported content, no-action meetings, and a supported Thai transcript pattern.
- Supertest integration tests cover multipart single/multi-file analysis, partial failure, validation, structured API output, and downloadable DOCX signatures.
- Playwright covers the main upload/analyze/display flow, additive multi-file selection, no-decision warning, grouped actions, unsupported-file feedback, and report download.
- Artifact verification opens generated DOCX/XLSX files as ZIP packages and checks required OOXML entries. DOCX is also parsed for expected text; XLSX workbooks are loaded and checked for sheets, headers, and representative rows.

## Assignment documents

Scripts generate `docs/Meeting_Notes_Distiller_SRS.docx`, `docs/Unit_Test_Cases.xlsx`, and `docs/SIT_UAT_Test_Cases.xlsx` from implementation metadata and actual test catalogs. Generated documents describe only implemented behavior. README and `CLAUDE.md` use commands that exist in root `package.json`.

A Claude-compatible reusable workflow lives at `.claude/skills/transcript-regression-test/SKILL.md`. It guides adding a fixture, writing normalization/extraction expectations, running focused tests, checking report impact, and documenting supported-format changes.

## Constraints and limitations

- Heuristic extraction cannot match human or LLM understanding for ambiguous natural language.
- Only plain-text transcripts and documented speaker patterns are supported.
- Relative deadlines remain literal rather than converted to calendar dates.
- Conflict detection focuses on unresolved date alternatives sharing subject terms.
- Files are processed in memory and are not persisted.
- Core behavior is deterministic and offline; no optional LLM path is included.

## Acceptance and verification

Required gates are clean dependency installation, lint, unit/API tests, production build, Playwright E2E, generated artifact verification, `git diff --check`, secret scan, and final Git status/diff inspection. Failures must be fixed or reported exactly; no passing result may be claimed without a fresh successful command.
