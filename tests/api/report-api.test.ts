import AdmZip from 'adm-zip';
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../backend/src/app.js';
import { extractMeeting } from '../../backend/src/domain/extractor.js';
import { normalizeTranscript } from '../../backend/src/domain/normalizer.js';
import { groupActionItems } from '../../backend/src/services/analyze-files.js';

const app = createApp();

const binaryParser = (
  response: NodeJS.ReadableStream,
  callback: (error: Error | null, body?: Buffer) => void,
): void => {
  const chunks: Buffer[] = [];
  response.on('data', (chunk: Buffer) => chunks.push(chunk));
  response.on('end', () => callback(null, Buffer.concat(chunks)));
  response.on('error', (error: Error) => callback(error));
};

const analysis = {
  meetings: [
    extractMeeting(
      'release-review.txt',
      normalizeTranscript(
        'Alice: We decided to release Friday.\nAlice: Bob, please prepare the server by Thursday.',
      ),
      'meeting-report',
    ),
  ],
  failures: [],
  groupedActionItems: {},
  processedAt: '2026-08-24T10:00:00.000Z',
};
analysis.groupedActionItems = groupActionItems(analysis.meetings);

describe('POST /api/report', () => {
  it('rejects malformed report requests without a stack trace', async () => {
    const response = await request(app).post('/api/report').send({ analysis: { meetings: 'wrong' } }).expect(400);
    expect(response.body.error).toBe('Report data is invalid. Analyze meetings again and retry.');
    expect(JSON.stringify(response.body)).not.toContain('at ');
  });

  it('returns a readable Word OOXML report containing actual results', async () => {
    const response = await request(app)
      .post('/api/report')
      .send({ analysis })
      .buffer(true)
      .parse(binaryParser)
      .expect(200);

    expect(response.headers['content-type']).toContain(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    expect(response.headers['content-disposition']).toContain('Meeting_Notes_Distiller_Report.docx');
    expect(response.body.subarray(0, 2).toString()).toBe('PK');

    const archive = new AdmZip(response.body);
    expect(archive.getEntry('[Content_Types].xml')).not.toBeNull();
    const documentXml = archive.readAsText('word/document.xml');
    expect(documentXml).toContain('release-review.txt');
    expect(documentXml).toContain('prepare the server');
    expect(documentXml).toContain('Bob');
    expect(documentXml).toContain('Thursday');
    expect(documentXml).toContain('We decided to release Friday.');
  });
});
