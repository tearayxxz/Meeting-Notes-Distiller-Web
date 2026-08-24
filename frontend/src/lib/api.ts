import {
  analysisBatchSchema,
  type AnalysisBatch,
} from '@meeting-distiller/shared';

const readError = async (response: Response, fallback: string): Promise<string> => {
  try {
    const body = (await response.json()) as { error?: unknown };
    return typeof body.error === 'string' ? body.error : fallback;
  } catch {
    return fallback;
  }
};

export const analyzeMeetings = async (files: File[]): Promise<AnalysisBatch> => {
  const form = new FormData();
  files.forEach((file) => form.append('files', file));
  const response = await fetch('/api/analyze', { method: 'POST', body: form });
  if (!response.ok) throw new Error(await readError(response, 'Meeting analysis failed.'));
  return analysisBatchSchema.parse(await response.json());
};

export const createWordReport = async (analysis: AnalysisBatch): Promise<Blob> => {
  const response = await fetch('/api/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ analysis }),
  });
  if (!response.ok) throw new Error(await readError(response, 'Word report generation failed.'));
  return response.blob();
};
