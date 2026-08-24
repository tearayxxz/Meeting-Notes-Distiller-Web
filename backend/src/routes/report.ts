import { Router } from 'express';
import { reportRequestSchema } from '@meeting-distiller/shared';
import { generateWordReport } from '../services/report.js';

export const reportRouter = Router();

reportRouter.post('/', async (request, response, next) => {
  const parsed = reportRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: 'Report data is invalid. Analyze meetings again and retry.' });
    return;
  }

  try {
    const report = await generateWordReport(parsed.data.analysis);
    response
      .status(200)
      .type('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
      .attachment('Meeting_Notes_Distiller_Report.docx')
      .send(report);
  } catch (error) {
    next(error);
  }
});
