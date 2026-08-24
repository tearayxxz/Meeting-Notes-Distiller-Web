---
name: transcript-regression-test
description: Validate a new meeting transcript fixture against normalization and deterministic extraction, then add focused regression coverage without inventing expected content.
---

# Transcript Regression Test

## Purpose

Use this workflow whenever a new transcript format, language pattern, extraction example, or parser regression is introduced. It keeps normalization and semantic expectations traceable to transcript evidence.

## When to use

- Adding an instructor-provided or representative transcript fixture.
- Supporting a new speaker/timestamp layout.
- Fixing participant, topic, decision, action, deadline, or warning extraction.
- Confirming a malformed transcript remains isolated and does not crash a batch.

## Inputs

- The `.txt` fixture or exact transcript text.
- The expected format classification and normalized utterances.
- Only evidence-supported expected participants, topics, decisions, actions, dates, and flags.

## Procedure

1. Preserve the original fixture. Add representative copies under `tests/fixtures/` and, when useful to users, `sample-data/`.
2. Inspect the raw line structure, timestamps, speaker labels, encoding, and continuation lines.
3. Add or update a focused test in `tests/unit/normalizer.test.ts` before changing the normalizer.
4. Run `npm test -- tests/unit/normalizer.test.ts` and confirm the new test fails for the intended reason.
5. Make the smallest normalization change in `backend/src/domain/normalizer.ts`.
6. Add semantic tests in the relevant files: `actions.test.ts`, `decisions.test.ts`, `flags.test.ts`, or `extractor.test.ts`.
7. Keep suggestions distinct from decisions. Represent missing owners/dates as `null`; never infer absent people or deadlines.
8. Run the focused test files, then `npm test -- tests/unit`.
9. If upload or rendering behavior changed, add API or Playwright coverage and run it.
10. Update README supported formats or limitations only when observable support changed.

## Validation

- The fixture is deterministic and contains no secrets.
- Normalized utterances retain the source text and correct speaker/timestamp where present.
- Participants come only from speaker metadata.
- Decisions require explicit resolution evidence.
- Every action and conflict keeps supporting evidence.
- Blank, malformed, or unsupported files produce structured failures without breaking successful files.
- Focused tests and the full relevant suite pass.

## Expected output

- A preserved fixture.
- One or more focused regression tests with evidence-based assertions.
- A minimal parser/extractor change when required.
- Updated user documentation only when supported behavior changed.
- Recorded commands and actual pass/fail results.
