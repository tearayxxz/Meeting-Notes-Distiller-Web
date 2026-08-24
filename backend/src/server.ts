import { createApp } from './app.js';

const port = Number.parseInt(process.env.PORT ?? '8787', 10);
createApp().listen(port, () => {
  console.log(`Meeting Notes Distiller API listening on http://localhost:${port}`);
});
