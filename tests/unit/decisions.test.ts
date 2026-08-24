import { describe, expect, it } from 'vitest';
import { extractDecisions } from '../../backend/src/domain/decisions.js';
import { normalizeTranscript } from '../../backend/src/domain/normalizer.js';

describe('extractDecisions', () => {
  it('does not convert suggestions or options into decisions', () => {
    const transcript = normalizeTranscript(
      'Alice: Maybe we should deploy Monday.\nBob: Tuesday might be safer.',
    );
    expect(extractDecisions(transcript)).toEqual([]);
  });

  it('extracts explicit final decisions and retains evidence', () => {
    const transcript = normalizeTranscript('Alice: We decided to launch on Tuesday.');

    expect(extractDecisions(transcript)).toEqual([
      {
        text: 'Launch on Tuesday',
        evidence: 'We decided to launch on Tuesday.',
      },
    ]);
  });

  it('recognizes a Thai explicit-decision phrase', () => {
    const transcript = normalizeTranscript('สมชาย: เราตัดสินใจเปิดตัววันจันทร์');
    expect(extractDecisions(transcript)[0]?.text).toBe('เปิดตัววันจันทร์');
  });

  it('recognizes a collective will statement as an explicit decision', () => {
    const transcript = normalizeTranscript('Alice: We will launch on Friday.');
    expect(extractDecisions(transcript)).toEqual([
      { text: 'Launch on Friday', evidence: 'We will launch on Friday.' },
    ]);
  });

  it('does not promote a tentative collective will statement', () => {
    const transcript = normalizeTranscript('Alice: Maybe we will launch on Friday.');
    expect(extractDecisions(transcript)).toEqual([]);
  });

  it('does not promote uncertainty inside a collective will statement', () => {
    const transcript = normalizeTranscript('Alice: We will maybe launch on Friday.');
    expect(extractDecisions(transcript)).toEqual([]);
  });

  it('does not promote a collective commitment to consider an option', () => {
    const transcript = normalizeTranscript('Alice: We will consider launching on Friday.');
    expect(extractDecisions(transcript)).toEqual([]);
  });
});
