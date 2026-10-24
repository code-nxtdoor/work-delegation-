import { pathToFileURL } from 'node:url';
import express from 'express';
import { config } from './config.js';
import { pool, q, migrate } from './db.js';
import { identify, HttpError } from './auth.js';
import peopleRoutes from './routes/people.js';
import projectRoutes from './routes/projects.js';
import adminRoutes, { webhookRouter } from './routes/admin.js';
import * as monday from './services/monday.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);
app.use(express.json({ limit: '256kb' }));

app.get('/api/health', async (_req, res) => {
  try { await q('SELECT 1'); res.json({ ok: true, monday: monday.isConfigured() }); }
  catch (err) { res.status(503).json({ ok: false, error: err.message }); }
});

// Who can use the "Viewing as" switch in dev mode
app.get('/api/dev/users', async (_req, res, next) => {
  if (config.authMode !== 'dev') return res.status(404).end();
  try { res.json(await q('SELECT email, name, is_lead AS "isLead" FROM people ORDER BY is_lead DESC, name')); }
  catch (err) { next(err); }
});

app.use('/api', webhookRouter);
app.use('/api', identify, peopleRoutes, projectRoutes, adminRoutes);

app.use('/api', (_req, _res, next) => next(new HttpError(404, 'Not found.')));
app.use((err, _req, res, _next) => {
  const status = err.status || (err.type === 'entity.parse.failed' ? 400 : 500);
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 && !err.status ? 'Something went wrong on the server.' : err.message });
});

async function start() {
  for (let attempt = 1; ; attempt++) {
    try { await migrate(); break; }
    catch (err) {
      if (attempt >= 15) throw err;
      console.log(`database not ready (${err.code || err.message}); retrying in 2s`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  const server = app.listen(config.port, () => console.log(`API listening on :${config.port} (auth: ${config.authMode}, monday: ${monday.isConfigured() ? 'connected' : 'off'})`));

  if (monday.isConfigured() && config.monday.syncMinutes > 0) {
    const run = () => monday.syncBoard().catch(err => console.error('scheduled sync failed:', err.message));
    run();
    setInterval(run, config.monday.syncMinutes * 60e3).unref();
  }

  const stop = () => server.close(() => pool.end().then(() => process.exit(0)));
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}

// Start when run directly (node src/index.js); stay passive when imported by tests.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  start().catch(err => { console.error(err); process.exit(1); });
}

export default app;
