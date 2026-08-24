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
      },
    ]);
  });

  it('returns no utterances for blank or BOM-only input', () => {
    expect(normalizeTranscript('\uFEFF\r\n  ').utterances).toEqual([]);
  });
});
