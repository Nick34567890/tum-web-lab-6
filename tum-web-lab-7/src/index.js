import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { PORT, CORS_ORIGINS } from './config.js';
import { openApiSpec } from './swagger.js';
import tokenRouter from './routes/token.js';
import steamRouter from './routes/steam.js';
import { createCollectionRouter } from './routes/collection.js';
import { COLLECTIONS, preload } from './store.js';

const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      if (CORS_ORIGINS.includes('*') || CORS_ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: false,
  })
);

app.get('/', (_req, res) => {
  res.json({
    name: 'Game Activity Tracker API',
    docs: '/docs',
    token: '/token',
    collections: COLLECTIONS.map((c) => `/api/${c}`),
  });
});

app.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));
app.get('/openapi.json', (_req, res) => res.json(openApiSpec));

app.use('/token', tokenRouter);
app.use('/api/steam', steamRouter);
for (const name of COLLECTIONS) {
  app.use(`/api/${name}`, createCollectionRouter(name));
}

app.use((req, res) => {
  res.status(404).json({ error: `Not found: ${req.method} ${req.originalUrl}` });
});

app.use((err, _req, res, _next) => {
  console.error('[error]', err);
  if (res.headersSent) return;
  res.status(500).json({ error: 'Internal server error.', detail: String(err.message ?? err) });
});

preload()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`> Game Activity Tracker API listening on http://localhost:${PORT}`);
      console.log(`> Swagger UI:        http://localhost:${PORT}/docs`);
      console.log(`> OpenAPI JSON:      http://localhost:${PORT}/openapi.json`);
      console.log(`> Token endpoint:    http://localhost:${PORT}/token`);
    });
  })
  .catch((err) => {
    console.error('Failed to start:', err);
    process.exit(1);
  });
