import { describe, expect, it } from 'vitest';
import { extractMeeting } from '../../backend/src/domain/extractor.js';
import { normalizeTranscript } from '../../backend/src/domain/normalizer.js';

describe('extractMeeting', () => {
  it('deduplicates participants and separates release and infrastructure topics', () => {
    const result = extractMeeting(
      'launch.txt',
      normalizeTranscript(
        'Alice: We should release Friday.\n' +
          'Bob: The production server needs preparation.\n' +
          'Alice: We decided to release Friday.',
      ),
      'meeting-fixed',
    );

    expect(result.participants).toEqual(['Alice', 'Bob']);
    expect(result.topics.map(({ name }) => name)).toEqual(
      expect.arrayContaining(['Release planning', 'Infrastructure preparation']),
    );
    expect(result.topics.every(({ summary }) => summary.length > 10)).toBe(true);
    expect(result.meetingId).toBe('meeting-fixed');
  });

  it('does not invent participants for unlabelled content', () => {
    const result = extractMeeting(
      'unlabelled.txt',
      normalizeTranscript('We need to update the server before Friday.'),
    );
    expect(result.participants).toEqual([]);
    expect(result.actionItems[0]?.owner).toBeNull();
  });

  it('returns a structured empty analysis instead of throwing', () => {
    const result = extractMeeting('empty.txt', normalizeTranscript(''));
    expect(result.topics).toEqual([]);
    expect(result.flags).toContainEqual(expect.objectContaining({ type: 'empty-transcript' }));
  });

  it('handles malformed control characters without crashing', () => {
    const result = extractMeeting('malformed.txt', normalizeTranscript('\u0000\u0001 broken notes'));
    expect(result.fileName).toBe('malformed.txt');
    expect(result.participants).toEqual([]);
  });
});
