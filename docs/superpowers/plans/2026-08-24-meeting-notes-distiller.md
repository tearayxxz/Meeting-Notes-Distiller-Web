# Meeting Notes Distiller Web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver, test, document, and prepare a deterministic offline meeting-transcript analysis web application for assignment submission.

**Architecture:** npm-workspace TypeScript monorepo with React/Vite frontend, Express backend, shared contracts, deterministic normalization/extraction modules, in-memory multipart processing, and DOCX export. Tests are split into Vitest/Supertest unit/API coverage and Playwright browser workflows.

**Tech Stack:** Node.js 22+, TypeScript, React, Vite, Tailwind CSS, shadcn/ui-compatible primitives, Lucide React, Express, Multer, Zod, docx, Vitest, Supertest, Playwright, ExcelJS.

**Spec:** `docs/superpowers/specs/2026-08-24-meeting-notes-distiller-design.md`

## Global Constraints

- Core extraction must run offline with no API keys.
- Keep `frontend/`, `backend/`, `shared/`, `tests/`, and `e2e/` visible at repository root.
- Do not add authentication, persistence, Supabase, or hosted-service dependencies.
- Preserve missing owner/deadline as `null`; present them as `Unassigned` and `Not specified`.
- Never turn possibility language into a final decision.
- Keep per-file errors isolated within a batch.
- Required assignment artifacts are `CLAUDE.md` and `.claude/skills/<name>/SKILL.md`.
- Use test-first red-green cycles for behavioral production code.

---

### Task 1: Workspace and shared contracts

**Files:**
- Create: `package.json`, `tsconfig.base.json`, `shared/package.json`, `shared/tsconfig.json`
- Create: `shared/src/contracts.ts`, `shared/src/index.ts`
- Test: `tests/unit/contracts.test.ts`

**Interfaces:**
- Produces: `MeetingAnalysis`, `AnalysisBatch`, `ActionItem`, `ProblemFlag`, `TopicResult`, `FileFailure`, and report-request Zod schemas.

- [ ] Write a failing contract test that parses a complete result and rejects an action item missing `task`.
- [ ] Run `npm test -- tests/unit/contracts.test.ts` and confirm failure because shared contracts do not exist.
- [ ] Add workspace manifests, strict TypeScript settings, typed interfaces, and Zod schemas.
- [ ] Re-run focused test and confirm pass.
- [ ] Run `npm run typecheck` and fix contract/build-boundary errors.

### Task 2: Transcript normalization

**Files:**
- Create: `backend/src/domain/normalizer.ts`
- Test: `tests/unit/normalizer.test.ts`
- Create: `tests/fixtures/format-a.txt`, `format-b.txt`, `format-c.txt`, `missing-speaker.txt`

**Interfaces:**
- Consumes: raw text.
- Produces: `normalizeTranscript(text: string): NormalizedTranscript` containing ordered `{speaker, timestamp, text, lineNumber}` utterances and detected format.

- [ ] Write failing tests for Format A, Format B, Format C, continuation lines, blank lines, duplicate labels, and unknown-speaker content.
- [ ] Run focused normalizer tests and confirm expected module-not-found failure.
- [ ] Implement newline/BOM normalization and three ordered parser strategies without semantic extraction.
- [ ] Run focused tests to green, then refactor repeated line handling while green.

### Task 3: Deterministic extraction engine

**Files:**
- Create: `backend/src/domain/participants.ts`, `topics.ts`, `decisions.ts`, `actions.ts`, `flags.ts`, `extractor.ts`, `text-utils.ts`
- Test: `tests/unit/extractor.test.ts`, `tests/unit/decisions.test.ts`, `tests/unit/actions.test.ts`, `tests/unit/flags.test.ts`
- Create: remaining deterministic fixtures under `tests/fixtures/` and copies under `sample-data/`

**Interfaces:**
- Consumes: `extractMeeting(fileName: string, transcript: NormalizedTranscript, meetingId?: string)`.
- Produces: `MeetingAnalysis` with evidence-bound topics, decisions, actions, and flags.

- [ ] Write and run failing participant/topic tests, including duplicate participants and no invented participant from unlabelled text.
- [ ] Implement participant deduplication and deterministic topic buckets; run focused tests to green.
- [ ] Write and run failing decision tests proving suggestions are not decisions and explicit resolutions are.
- [ ] Implement conservative decision extraction; run focused tests to green.
- [ ] Write and run failing action tests for `We need to update the server before Friday.`, direct assignments, multiple actions, missing deadline, and Thai obligation language.
- [ ] Implement assignment/obligation patterns, owner validation against speakers/evidence, deadline extraction, and evidence retention; run focused tests to green.
- [ ] Write and run failing no-decision and unresolved-date-conflict tests.
- [ ] Implement flags using option markers, resolution markers, date candidates, and shared subject terms; run focused tests to green.
- [ ] Add orchestration tests for empty, malformed, no-action, and multiple-meeting inputs; run all unit tests.

### Task 4: Express analysis and report APIs

**Files:**
- Create: `backend/package.json`, `backend/tsconfig.json`, `backend/src/app.ts`, `backend/src/server.ts`
- Create: `backend/src/routes/analyze.ts`, `backend/src/routes/report.ts`, `backend/src/services/analyze-files.ts`, `backend/src/services/report.ts`, `backend/src/middleware/errors.ts`
- Test: `tests/api/analyze-api.test.ts`, `tests/api/report-api.test.ts`

**Interfaces:**
- Produces: `POST /api/analyze` multipart endpoint and `POST /api/report` JSON-to-DOCX endpoint.

- [ ] Write and run failing Supertest cases for no files, one file, multiple files, unsupported extension, empty file, and mixed success/failure.
- [ ] Implement Multer memory upload with ten-file and 1 MiB limits, sanitized failures, and successful result preservation; run API tests to green.
- [ ] Write and run failing report tests for invalid input, DOCX MIME/disposition, ZIP signature, and expected document text.
- [ ] Implement professional DOCX headings, lists, tables, warnings, owner groups, and page breaks; run report tests to green.
- [ ] Add generic error middleware and verify stack traces are absent from API responses.

### Task 5: React dashboard

**Files:**
- Create: `frontend/package.json`, `frontend/tsconfig.json`, `frontend/vite.config.ts`, `frontend/index.html`
- Create: `frontend/src/main.tsx`, `App.tsx`, `index.css`, `lib/api.ts`, `lib/utils.ts`
- Create: `frontend/src/components/ui/{button,card,badge,alert,tabs,separator,progress,tooltip}.tsx`
- Create: `frontend/src/components/UploadZone.tsx`, `FileQueue.tsx`, `MeetingCard.tsx`, `GlobalActions.tsx`, `ProblemPanel.tsx`, `EmptyState.tsx`
- Test: `tests/frontend/app.test.tsx`

**Interfaces:**
- Consumes: analysis/report API and shared contracts.
- Produces: accessible upload, analysis, results, grouped actions, warnings, and download UI.

- [ ] Write and run failing component tests for empty state, additive/de-duplicated file queue, unsupported type feedback, explicit analyze action, and rendered structured result.
- [ ] Configure Vite, Tailwind, test environment, aliases, and only required dependencies.
- [ ] Implement local shadcn-compatible primitives and responsive dashboard shell; run focused frontend tests to green.
- [ ] Implement custom drag/drop queue, remove control, loading/progress states, partial errors, and API client; run tests to green.
- [ ] Implement meeting/topic/decision/action/warning cards, tabs, global owner grouping, and report download; run tests to green.
- [ ] Verify keyboard labels, focus styles, ARIA live status, contrast, and mobile wrapping via tests and browser inspection.

### Task 6: Playwright browser automation

**Files:**
- Create: `playwright.config.ts`, `e2e/meeting-analysis.spec.ts`

**Interfaces:**
- Consumes: root development servers and `tests/fixtures`.

- [ ] Write E2E tests for upload/analyze/results, additive uploads, no-decision warning, grouped actions, unsupported extension feedback, and Word download.
- [ ] Run Playwright and confirm initial failures identify missing integration details.
- [ ] Fix only integration defects exposed by E2E, adding unit regressions for domain defects.
- [ ] Re-run Playwright until all configured Chromium tests pass.

### Task 7: Assignment artifacts and generation scripts

**Files:**
- Create: `CLAUDE.md`, `.claude/skills/transcript-regression-test/SKILL.md`
- Create: `scripts/generate-docs.mjs`, `scripts/verify-artifacts.mjs`, `scripts/test-catalog.mjs`
- Generate: `docs/Meeting_Notes_Distiller_SRS.docx`, `docs/Unit_Test_Cases.xlsx`, `docs/SIT_UAT_Test_Cases.xlsx`
- Test: `tests/scripts/artifacts.test.ts`

**Interfaces:**
- Produces: assignment instructions, reusable regression workflow, and three verified Office documents sourced from real implementation/test catalogs.

- [ ] Write and run failing artifact tests for required paths, OOXML ZIP entries, sheet names, headers, mandatory edge-case rows, and readable content.
- [ ] Write `CLAUDE.md` with actual stack, style, layout, commands, and project rules.
- [ ] Write Claude Skill with purpose, trigger, inputs, exact fixture/test procedure, validation, and expected output.
- [ ] Implement one metadata catalog shared by test documentation generation and verification.
- [ ] Generate SRS DOCX and test-case XLSX workbooks with professional headings, widths, filters, frozen rows, statuses, and implementation references.
- [ ] Run artifact tests and `npm run verify:artifacts` to green.

### Task 8: README and repository readiness

**Files:**
- Create: `README.md`
- Modify: root `package.json`, `.gitignore`

**Interfaces:**
- Produces: clean-machine setup, actual commands, accurate architecture/design/format/skill/change-log/limitations documentation.

- [ ] Document overview, features, stack rationale, architecture, directory tree, clean installation, all commands, usage, supported formats, design decisions, Claude Skill, CLAUDE.md change log, limitations, and GitHub publication steps.
- [ ] Ensure every README command maps to an existing root script and execute each verification command.
- [ ] Scan docs for unsupported claims, fake commands, placeholders, and mismatched filenames.
- [ ] Confirm `.gitignore` excludes dependencies, builds, coverage, reports, environments, logs, editor, and OS files while retaining required generated Office documents.

### Task 9: Fresh final verification and submission review

**Files:**
- Review all tracked and untracked files.

**Interfaces:**
- Produces: evidence-backed final report and optional public GitHub URL only when authentication is available.

- [ ] Remove dependency directories and run `npm ci` to prove lockfile installation.
- [ ] Run `npm run lint`, `npm test`, `npm run build`, `npm run e2e`, and `npm run verify:artifacts`; record exact exit results.
- [ ] Start backend and frontend through documented commands and verify health/page responses.
- [ ] Run `git diff --check`, inspect `git status`, review complete diff, scan for secrets/debugging/TODOs, and confirm ignored junk is absent.
- [ ] Check `gh --version` and `gh auth status`; create/push a public repository only if authenticated and safe.
- [ ] Otherwise provide exact `gh repo create Meeting-Notes-Distiller-Web --public --source=. --remote=origin --push` and plain Git remote/push alternatives.
