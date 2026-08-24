import { describe, expect, it } from 'vitest';
import { extractActionItems } from '../../backend/src/domain/actions.js';
import { normalizeTranscript } from '../../backend/src/domain/normalizer.js';

describe('extractActionItems', () => {
  it('keeps a required task without an owner as unassigned', () => {
    const transcript = normalizeTranscript('We need to update the server before Friday.');

    expect(extractActionItems(transcript)).toEqual([
      {
        owner: null,
        task: 'update the server',
        dueDate: 'Friday',
        evidence: 'We need to update the server before Friday.',
      },
    ]);
  });

  it('extracts direct assignments, speaker commitments, and multiple actions', () => {
    const transcript = normalizeTranscript(
      'Alice: Bob, please prepare the production server by Thursday.\n' +
        'Bob: I will verify the database migration tomorrow.\n' +
        'Alice: We need to confirm the launch checklist.',
    );

    expect(extractActionItems(transcript)).toEqual([
      {
        owner: 'Bob',
        task: 'prepare the production server',
        dueDate: 'Thursday',
        evidence: 'Bob, please prepare the production server by Thursday.',
      },
      {
        owner: 'Bob',
        task: 'verify the database migration',
        dueDate: 'tomorrow',
        evidence: 'I will verify the database migration tomorrow.',
      },
      {
        owner: null,
        task: 'confirm the launch checklist',
        dueDate: null,
        evidence: 'We need to confirm the launch checklist.',
      },
    ]);
  });

  it('does not invent an action from ordinary discussion', () => {
    const transcript = normalizeTranscript('Alice: The server performed well in testing.');
    expect(extractActionItems(transcript)).toEqual([]);
  });

  it('supports a deterministic Thai owner, task, and weekday deadline pattern', () => {
    const transcript = normalizeTranscript('มาลี: สมชายจะส่งรายงานภายในวันศุกร์');

    expect(extractActionItems(transcript)).toEqual([
      {
        owner: 'สมชาย',
        task: 'ส่งรายงาน',
        dueDate: 'วันศุกร์',
        evidence: 'สมชายจะส่งรายงานภายในวันศุกร์',
      },
    ]);
  });
});
