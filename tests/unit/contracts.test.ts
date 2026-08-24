import { describe, expect, it } from 'vitest';
import { analysisBatchSchema } from '../../shared/src/contracts.js';

describe('analysis batch contract', () => {
  it('accepts a complete evidence-bound meeting result', () => {
    const parsed = analysisBatchSchema.parse({
      meetings: [
        {
          meetingId: 'meeting-1',
          fileName: 'launch.txt',
          format: 'speaker-colon',
          participants: ['Alice'],
          topics: [
            {
              name: 'Release planning',
              summary: 'Alice discussed release planning.',
              decisions: [{ text: 'Release Friday', evidence: 'We decided to release Friday.' }],
            },
          ],
          actionItems: [
            {
              owner: 'Alice',
              task: 'prepare the server',
              dueDate: 'Thursday',
              evidence: 'Alice will prepare the server by Thursday.',
            },
          ],
          flags: [],
          stats: { utteranceCount: 2, wordCount: 11 },
        },
      ],
      failures: [],
      groupedActionItems: {
        Alice: [
          {
            meetingId: 'meeting-1',
            fileName: 'launch.txt',
            owner: 'Alice',
            task: 'prepare the server',
            dueDate: 'Thursday',
            evidence: 'Alice will prepare the server by Thursday.',
          },
        ],
      },
      processedAt: '2026-08-24T10:00:00.000Z',
    });

    expect(parsed.meetings[0]?.actionItems[0]?.task).toBe('prepare the server');
  });

  it('rejects action items without a task', () => {
    const result = analysisBatchSchema.safeParse({
      meetings: [],
      failures: [],
      groupedActionItems: {
        Unassigned: [{ owner: null, dueDate: null, evidence: 'We need to update it.' }],
      },
      processedAt: '2026-08-24T10:00:00.000Z',
    });

    expect(result.success).toBe(false);
  });
});
