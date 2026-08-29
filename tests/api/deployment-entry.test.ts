import { readFileSync } from 'node:fs';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../../server.js';

describe('production deployment entry', () => {
  it('exports the complete Express application for the serverless runtime', async () => {
    const response = await request(app).get('/api/health').expect(200);

    expect(response.body).toEqual({ status: 'ok' });
  });

  it('imports Express directly so Vercel can detect the server entrypoint', () => {
    const source = readFileSync(new URL('../../server.ts', import.meta.url), 'utf8');

    expect(source).toMatch(/from ['"]express['"]/u);
  });

  it('provides a root TypeScript project for the Vercel function compiler', () => {
    const config = JSON.parse(
      readFileSync(new URL('../../tsconfig.json', import.meta.url), 'utf8'),
    ) as { extends?: string; include?: string[] };

    expect(config.extends).toBe('./tsconfig.base.json');
    expect(config.include).toContain('server.ts');
  });
});
