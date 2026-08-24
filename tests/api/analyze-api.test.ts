import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../backend/src/app.js';

const app = createApp();

describe('POST /api/analyze', () => {
  it('rejects requests without files using a safe client message', async () => {
    const response = await request(app).post('/api/analyze').expect(400);
    expect(response.body).toEqual({ error: 'Select at least one .txt transcript.' });
  });

  it('analyzes one transcript into structured results', async () => {
    const response = await request(app)
      .post('/api/analyze')
      .attach(
        'files',
        Buffer.from(
          'Alice: We decided to release Friday.\nAlice: Bob, please prepare the server by Thursday.',
        ),
        'launch.txt',
      )
      .expect(200);

    expect(response.body.failures).toEqual([]);
    expect(response.body.meetings).toHaveLength(1);
    expect(response.body.meetings[0]).toMatchObject({
      fileName: 'launch.txt',
      participants: ['Alice'],
      actionItems: [{ owner: 'Bob', task: 'prepare the server', dueDate: 'Thursday' }],
    });
    expect(response.body.groupedActionItems.Bob).toHaveLength(1);
  });

  it('preserves valid results when another uploaded file is unsupported', async () => {
    const response = await request(app)
      .post('/api/analyze')
      .attach('files', Buffer.from('Alice: We decided to launch Monday.'), 'valid.txt')
      .attach('files', Buffer.from('not a transcript'), 'notes.pdf')
      .expect(200);

    expect(response.body.meetings.map(({ fileName }: { fileName: string }) => fileName)).toEqual([
      'valid.txt',
    ]);
    expect(response.body.failures).toEqual([
      {
        fileName: 'notes.pdf',
        code: 'unsupported-type',
        message: 'Only .txt transcript files are supported.',
      },
    ]);
  });

  it('reports an empty file independently while processing another file', async () => {
    const response = await request(app)
      .post('/api/analyze')
      .attach('files', Buffer.from('We need to update the server before Friday.'), 'task.txt')
      .attach('files', Buffer.from('  \r\n'), 'empty.txt')
      .expect(200);

    expect(response.body.meetings).toHaveLength(1);
    expect(response.body.failures[0]).toMatchObject({ fileName: 'empty.txt', code: 'empty-file' });
    expect(response.body.groupedActionItems.Unassigned[0]).toMatchObject({
      fileName: 'task.txt',
      task: 'update the server',
    });
  });

  it('keeps valid results when another text file exceeds the application limit', async () => {
    const response = await request(app)
      .post('/api/analyze')
      .attach('files', Buffer.from('Alice: We decided to launch Monday.'), 'valid.txt')
      .attach('files', Buffer.alloc(1024 * 1024 + 1, 65), 'oversized.txt')
      .expect(200);

    expect(response.body.meetings).toHaveLength(1);
    expect(response.body.failures).toContainEqual(
      expect.objectContaining({ fileName: 'oversized.txt', code: 'file-too-large' }),
    );
  });

  it('reports invalid UTF-8 as a per-file upload failure', async () => {
    const response = await request(app)
      .post('/api/analyze')
      .attach('files', Buffer.from('Alice: We decided to launch Monday.'), 'valid.txt')
      .attach('files', Buffer.from([0xc3, 0x28]), 'invalid.txt')
      .expect(200);

    expect(response.body.meetings).toHaveLength(1);
    expect(response.body.failures).toContainEqual(
      expect.objectContaining({ fileName: 'invalid.txt', code: 'invalid-upload' }),
    );
  });

  it('groups an owner whose name matches an object prototype property', async () => {
    const response = await request(app)
      .post('/api/analyze')
      .attach('files', Buffer.from('Constructor: I will prepare the release notes Friday.'), 'owner.txt')
      .expect(200);

    expect(response.body.groupedActionItems.Constructor).toHaveLength(1);
    expect(response.body.groupedActionItems.Constructor[0].task).toBe('prepare the release notes');
  });
});

describe('GET /api/health', () => {
  it('reports service readiness without exposing internals', async () => {
    const response = await request(app).get('/api/health').expect(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('does not opt arbitrary third-party origins into CORS', async () => {
    const response = await request(app)
      .get('/api/health')
      .set('Origin', 'https://attacker.example')
      .expect(200);
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});
