import type { ErrorRequestHandler } from 'express';
import multer from 'multer';

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof multer.MulterError) {
    const tooLarge = error.code === 'LIMIT_FILE_SIZE';
    response.status(tooLarge ? 413 : 400).json({
      error: tooLarge
        ? 'A transcript exceeds the 10 MB transport safety limit.'
        : 'The uploaded files could not be accepted.',
    });
    return;
  }
  response.status(500).json({ error: 'The server could not complete this request.' });
};
