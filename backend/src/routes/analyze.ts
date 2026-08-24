import { Router } from 'express';
import multer from 'multer';
import { analyzeUploadedFiles } from '../services/analyze-files.js';

export const analyzeRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 10, fileSize: 10 * 1024 * 1024 },
});

analyzeRouter.post('/', upload.array('files', 10), (request, response) => {
  const files = Array.isArray(request.files) ? request.files : [];
  if (files.length === 0) {
    response.status(400).json({ error: 'Select at least one .txt transcript.' });
    return;
  }
  response.json(analyzeUploadedFiles(files));
});
