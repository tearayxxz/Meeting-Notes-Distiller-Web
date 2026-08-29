import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { errorHandler } from './middleware/errors.js';
import { analyzeRouter } from './routes/analyze.js';
import { reportRouter } from './routes/report.js';

export const createApp = (app = express()) => {
  app.disable('x-powered-by');
  app.use(express.json({ limit: '5mb' }));
  app.get('/api/health', (_request, response) => response.json({ status: 'ok' }));
  app.use('/api/analyze', analyzeRouter);
  app.use('/api/report', reportRouter);

  const frontendDist = resolve(dirname(fileURLToPath(import.meta.url)), '../../frontend/dist');
  if (existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.get(/^(?!\/api).*/u, (_request, response) => response.sendFile(resolve(frontendDist, 'index.html')));
  }

  app.use(errorHandler);
  return app;
};
