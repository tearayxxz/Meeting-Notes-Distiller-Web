import { describe, expect, it } from 'vitest';
import { extractActionItems } from '../../backend/src/domain/actions.js';
import { extractDecisions } from '../../backend/src/domain/decisions.js';
import { detectProblemFlags } from '../../backend/src/domain/flags.js';
import { normalizeTranscript } from '../../backend/src/domain/normalizer.js';

const flagsFor = (text: string) => {
  const transcript = normalizeTranscript(text);
  return detectProblemFlags(
    transcript,
    extractDecisions(transcript),
    extractActionItems(transcript),
  );
};

describe('detectProblemFlags', () => {
  it('flags a multi-option meeting with no final decision', () => {
    const flags = flagsFor(
      'Alice: We could launch Monday.\n' +
        'Bob: Tuesday might be safer.\n' +
        'Charlie: Wednesday is also possible.',
    );

    expect(flags).toContainEqual(
      expect.objectContaining({
        type: 'no-decision',
        message: expect.stringContaining('No decision detected'),
      }),
    );
  });

  it('flags non-date alternatives without inventing a choice', () => {
    const flags = flagsFor(
      'Alice: We could use PostgreSQL.\n' +
        'Bob: MySQL might be safer.\n' +
        'Charlie: SQLite is also possible.',
    );

    expect(flags.map(({ type }) => type)).toContain('no-decision');
  });

  it('flags unresolved conflicting dates for a common go-live subject', () => {
    const flags = flagsFor(
      'Alice: Go-live should be October 2.\nBob: Let\'s prepare for October 5.',
    );

    expect(flags).toContainEqual(
      expect.objectContaining({
        type: 'conflict',
        message: expect.stringContaining('Multiple go-live dates'),
      }),
    );
  });

  it('does not flag date options resolved by an explicit decision', () => {
    const flags = flagsFor(
      'Alice: Monday or Tuesday could work.\nBob: We decided to launch on Tuesday.',
    );
    expect(flags.map(({ type }) => type)).not.toContain('no-decision');
    expect(flags.map(({ type }) => type)).not.toContain('conflict');
  });

  it('does not treat an action deadline as a conflicting release date', () => {
    const flags = flagsFor(
      'Alice: We should release the application next Friday.\n' +
        'Bob: I agree.\n' +
        'Alice: Bob, please prepare the production server by Thursday.',
    );

    expect(flags.map(({ type }) => type)).not.toContain('conflict');
  });

  it('does not combine dates from unrelated meeting topics into a conflict', () => {
    const flags = flagsFor(
      'Alice: We could launch Monday.\n' +
        'Bob: The budget review might happen Tuesday.',
    );

    expect(flags.map(({ type }) => type)).not.toContain('conflict');
  });

  it('does not inherit an unrelated general dated statement into the prior topic', () => {
    const flags = flagsFor(
      'Alice: We could launch Monday.\n' +
        'Bob: The retrospective is Tuesday.',
    );

    expect(flags.map(({ type }) => type)).not.toContain('conflict');
  });

  it('does not inherit an unrelated modal sentence into the prior topic', () => {
    const flags = flagsFor(
      'Alice: We could launch Monday.\n' +
        'Bob: The retrospective might happen Tuesday.',
    );

    expect(flags.map(({ type }) => type)).not.toContain('conflict');
    expect(flags.map(({ type }) => type)).not.toContain('no-decision');
  });

  it('does not inherit a date-led alternative that names another subject', () => {
    const flags = flagsFor(
      'Alice: We could launch Monday.\n' +
        'Bob: Tuesday might be safer for the retrospective.',
    );

    expect(flags.map(({ type }) => type)).not.toContain('conflict');
    expect(flags.map(({ type }) => type)).not.toContain('no-decision');
  });

  it('does not inherit a preparation statement that names another subject', () => {
    const flags = flagsFor(
      'Alice: We could launch Monday.\n' +
        "Bob: Let's prepare for the retrospective on October 5.",
    );

    expect(flags.map(({ type }) => type)).not.toContain('conflict');
  });

  it('flags each unassigned action item without changing its owner', () => {
    const flags = flagsFor('We need to update the server before Friday.');
    expect(flags).toContainEqual(
      expect.objectContaining({ type: 'unassigned-action', evidence: ['We need to update the server before Friday.'] }),
    );
  });
});
