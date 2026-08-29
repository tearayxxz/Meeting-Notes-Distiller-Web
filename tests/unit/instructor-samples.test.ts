import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { extractMeeting } from '../../backend/src/domain/extractor.js';
import { normalizeTranscript } from '../../backend/src/domain/normalizer.js';

const analyzeFixture = (name: string) => {
  const text = readFileSync(fileURLToPath(new URL(`../fixtures/${name}`, import.meta.url)), 'utf8');
  return extractMeeting(name, normalizeTranscript(text), `meeting-${name}`);
};

describe('instructor meeting-note samples', () => {
  it('extracts unresolved product planning from the English rough notes without a false decision', () => {
    const result = analyzeFixture('instructor-01-no-decisions-brainstorm.txt');

    expect(result.participants).toEqual(['Sam', 'Lena']);
    expect(result.topics.map(({ name }) => name)).toEqual(
      expect.arrayContaining(['Product planning', 'Budget and costs']),
    );
    expect(result.topics.flatMap(({ decisions }) => decisions)).toEqual([]);
    expect(result.actionItems).toContainEqual(
      expect.objectContaining({ owner: null, task: expect.stringMatching(/mobile churn/iu), dueDate: null }),
    );
    expect(result.actionItems).toHaveLength(1);
    expect(result.flags.map(({ type }) => type)).toEqual(
      expect.arrayContaining(['no-decision', 'unassigned-action']),
    );
  });

  it('extracts section topics, final decisions, and four follow-up actions from structured notes', () => {
    const result = analyzeFixture('instructor-02-structured-with-followups.txt');

    expect(result.participants).toEqual(['Priya', 'Marcus', 'Dana', 'Tomás']);
    expect(result.topics.map(({ name }) => name)).toEqual(
      expect.arrayContaining(['Database performance', 'On-call rotation', 'Incident postmortem', 'Parking lot']),
    );
    expect(result.topics.flatMap(({ decisions }) => decisions).map(({ text }) => text)).toEqual([
      'Add the index this sprint',
      'Move to a fair round-robin starting next month',
    ]);
    expect(result.actionItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ owner: 'Marcus', task: 'add the index this sprint', dueDate: 'Friday' }),
        expect.objectContaining({ owner: 'Dana', task: 'draft the new schedule and circulate for feedback', dueDate: 'Thursday' }),
        expect.objectContaining({ owner: 'Tomás', task: 'write the postmortem doc', dueDate: 'next Monday' }),
        expect.objectContaining({ owner: 'Marcus', task: 'research whether to adopt the new logging library', dueDate: null }),
      ]),
    );
    expect(result.actionItems).toHaveLength(4);
    expect(result.flags.map(({ type }) => type)).toContain('no-decision');
  });

  it('extracts Thai rough-note participants and unresolved work without inventing a decision', () => {
    const result = analyzeFixture('instructor-03-thai-no-decisions-roadmap.txt');

    expect(result.participants).toEqual(['แซม', 'เลน่า']);
    expect(result.topics.map(({ name }) => name)).toEqual(
      expect.arrayContaining(['Product planning', 'Budget and costs']),
    );
    expect(result.topics.flatMap(({ decisions }) => decisions)).toEqual([]);
    expect(result.actionItems).toContainEqual(
      expect.objectContaining({ owner: null, task: 'ดึงข้อมูล churn ของมือถือมาดู', dueDate: null }),
    );
    expect(result.actionItems).toHaveLength(1);
    expect(result.flags.map(({ type }) => type)).toEqual(
      expect.arrayContaining(['no-decision', 'unassigned-action']),
    );
  });

  it('retains the Thai launch resolution while flagging unresolved launch and freeze conflicts', () => {
    const result = analyzeFixture('instructor-04-thai-conflicting-launch.txt');

    expect(result.participants).toEqual(['เอลีนา', 'โก้', 'วี', 'โซเฟีย']);
    expect(result.topics.map(({ name }) => name)).toEqual(
      expect.arrayContaining(['Release planning', 'Product planning', 'Marketing campaign']),
    );
    expect(result.topics.flatMap(({ decisions }) => decisions).map(({ text }) => text)).toEqual(
      expect.arrayContaining(['Add the analytics dashboard', 'Launch on วันที่ 30']),
    );
    expect(result.actionItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ owner: 'โก้', task: 'ทำ dashboard ให้เสร็จ', dueDate: 'วันที่ 25' }),
        expect.objectContaining({ owner: 'วี', task: 'ออกประกาศแก้ไข', dueDate: null }),
      ]),
    );
    expect(result.flags.map(({ type }) => type)).toEqual(
      expect.arrayContaining(['no-decision', 'conflict']),
    );
    expect(
      result.flags.find(({ type }) => type === 'no-decision')?.evidence.join(' '),
    ).toMatch(/ตกลงว่ายังไง/u);
    const conflictEvidence = result.flags
      .filter(({ type }) => type === 'conflict')
      .flatMap(({ evidence }) => evidence)
      .join(' ');
    expect(result.flags.map(({ message }) => message)).toContain(
      'Published launch dates conflict with the final meeting date (วันที่ 30); a correction is still required.',
    );
    expect(conflictEvidence).toMatch(/วันที่ 28/iu);
    expect(conflictEvidence).toMatch(/วันที่ 30/iu);
  });
});
