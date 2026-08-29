import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../../server.js';

describe('production deployment entry', () => {
  it('exports the complete Express application for the serverless runtime', async () => {
    const response = await request(app).get('/api/health').expect(200);

    expect(response.body).toEqual({ status: 'ok' });
  });
});
