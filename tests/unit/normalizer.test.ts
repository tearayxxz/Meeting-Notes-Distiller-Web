import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { normalizeTranscript } from '../../backend/src/domain/normalizer.js';

const fixture = (name: string): string =>
  readFileSync(fileURLToPath(new URL(`../fixtures/${name}`, import.meta.url)), 'utf8');

describe('normalizeTranscript', () => {
  it('normalizes Format A speaker-colon lines and continuation text', () => {
    const result = normalizeTranscript(`${fixture('format-a.txt')}Additional release detail.`);

    expect(result.format).toBe('speaker-colon');
    expect(result.utterances).toHaveLength(3);
    expect(result.utterances[0]).toMatchObject({ speaker: 'Alice', timestamp: null });
    expect(result.utterances[2]?.text).toContain('Additional release detail.');
  });

  it('normalizes Format B timestamped dash lines', () => {
    const result = normalizeTranscript(fixture('format-b.txt'));

    expect(result.format).toBe('timestamp-dash');
    expect(result.utterances[1]).toEqual({
      speaker: 'Bob',
      timestamp: '09:02',
      text: 'I agree.',
      lineNumber: 2,
      kind: 'speech',
    });
  });

  it('normalizes Format C timestamp-and-speaker blocks', () => {
    const result = normalizeTranscript(fixture('format-c.txt'));

    expect(result.format).toBe('timestamp-block');
    expect(result.utterances.map(({ speaker }) => speaker)).toEqual(['Alice', 'Bob', 'Alice']);
    expect(result.utterances[2]?.timestamp).toBe('09:05');
  });

  it('keeps unlabelled text as one unknown-speaker utterance', () => {
    const result = normalizeTranscript(fixture('missing-speaker.txt'));

    expect(result.format).toBe('unstructured');
    expect(result.utterances).toEqual([
      {
        speaker: null,
        timestamp: null,
        text: 'We need to update the server before Friday. The deployment checklist also needs review.',
        lineNumber: 1,
        kind: 'note',
      },
    ]);
  });

  it('returns no utterances for blank or BOM-only input', () => {
    expect(normalizeTranscript('\uFEFF\r\n  ').utterances).toEqual([]);
  });

  it('keeps rough-note bullets separate instead of treating metadata as a speaker', () => {
    const result = normalizeTranscript(fixture('instructor-01-no-decisions-brainstorm.txt'));

    expect(result.format).toBe('unstructured');
    expect(result.utterances.map(({ speaker }) => speaker).filter(Boolean)).toEqual([]);
    expect(result.utterances.length).toBeGreaterThan(10);
    expect(result.utterances).toContainEqual(
      expect.objectContaining({ kind: 'metadata', text: 'ppl: whole product team + 2 from design' }),
    );
    expect(result.utterances).toContainEqual(
      expect.objectContaining({ kind: 'note', text: "Sam thinks mobile, says that's where the growth is" }),
    );
  });

  it('distinguishes Markdown sections and metadata from real speakers', () => {
    const result = normalizeTranscript(fixture('instructor-02-structured-with-followups.txt'));

    expect(result.format).toBe('speaker-colon');
    expect([...new Set(result.utterances.map(({ speaker }) => speaker).filter(Boolean))]).toEqual([
      'Marcus',
      'Priya',
      'Dana',
      'Tomás',
    ]);
    expect(result.utterances).toContainEqual(
      expect.objectContaining({ kind: 'metadata', text: 'Attendees: Priya, Marcus, Dana, Tomás' }),
    );
    expect(result.utterances).toContainEqual(
      expect.objectContaining({ kind: 'heading', text: 'Database performance' }),
    );
    expect(result.utterances).toContainEqual(
      expect.objectContaining({ kind: 'note', text: 'Whether to adopt the new logging library — Marcus to research, no deadline set yet.' }),
    );
  });

  it('does not add Thai date and attendee labels as participants', () => {
    const result = normalizeTranscript(fixture('instructor-04-thai-conflicting-launch.txt'));

    expect([...new Set(result.utterances.map(({ speaker }) => speaker).filter(Boolean))]).toEqual([
      'เอลีนา',
      'โก้',
      'วี',
      'โซเฟีย',
    ]);
    expect(result.utterances).toContainEqual(
      expect.objectContaining({ kind: 'metadata', text: expect.stringContaining('ผู้เข้าร่วม:') }),
    );
  });
});
