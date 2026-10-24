import { Router } from 'express';
import { q, setting } from '../db.js';
import { h, HttpError, requireLead } from '../auth.js';
import { config } from '../config.js';
import * as monday from '../services/monday.js';

const r = Router();

/** Catalogs the UI needs: skills with learning paths, product types with default skills, role requirements */
r.get('/reference', h(async (_req, res) => {
  const [skills, types, typeSkills, roles, reqs] = await Promise.all([
    q('SELECT name, learning_path AS "learningPath" FROM skills ORDER BY name'),
    q('SELECT name FROM product_types ORDER BY name'),
    q('SELECT product_type, skill FROM product_type_skills ORDER BY skill'),
    q('SELECT name FROM roles ORDER BY name'),
    q('SELECT role, skill, min_rating FROM role_requirements ORDER BY skill')
  ]);
  res.json({
    skills,
    productTypes: types.map(t => ({ name: t.name, skills: typeSkills.filter(s => s.product_type === t.name).map(s => s.skill) })),
    roles: roles.map(x => ({ name: x.name, requirements: reqs.filter(rr => rr.role === x.name).map(rr => ({ skill: rr.skill, min: rr.min_rating })) }))
  });
}));

const SETTINGS = {
  skill_visibility: v => ['leads', 'all'].includes(v),
  checkin_days: v => Number.isInteger(v) && v >= 1 && v <= 90,
  interest_window_hours: v => Number.isInteger(v) && v >= 1 && v <= 168,
  default_seat_cap: v => Number.isInteger(v) && v >= 1 && v <= 20
};

r.get('/settings', h(async (_req, res) => {
  const rows = await q('SELECT key, value FROM settings');
  res.json(Object.fromEntries(rows.map(x => [x.key, x.value])));
}));

r.patch('/settings', requireLead, h(async (req, res) => {
  for (const [k, v] of Object.entries(req.body || {})) {
    if (!SETTINGS[k]) throw new HttpError(400, `Unknown setting: ${k}`);
    if (!SETTINGS[k](v)) throw new HttpError(400, `Invalid value for ${k}.`);
    await q('INSERT INTO settings(key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2', [k, JSON.stringify(v)]);
  }
  const rows = await q('SELECT key, value FROM settings');
  res.json(Object.fromEntries(rows.map(x => [x.key, x.value])));
}));

/* ---------- Monday ---------- */

r.get('/monday/status', h(async (_req, res) => {
  const last = await q(`SELECT created_at FROM sync_events WHERE kind = 'sync' ORDER BY created_at DESC LIMIT 1`);
  const counts = await q(`SELECT kind, count(*)::int AS n FROM sync_events WHERE created_at > now() - interval '24 hours' GROUP BY kind`);
  const { n } = (await q('SELECT count(*)::int AS n FROM projects WHERE monday_item_id IS NOT NULL'))[0];
  res.json({
    connected: monday.isConfigured(),
    boardId: config.monday.boardId || null,
    syncMinutes: config.monday.syncMinutes,
    lastSync: last[0]?.created_at || null,
    projectsFromMonday: n,
    last24h: Object.fromEntries(counts.map(c => [c.kind, c.n])),
    columns: config.monday.columns,
    statusLabels: config.monday.statusLabels,
    interestWindowHours: await setting('interest_window_hours')
  });
}));

r.get('/monday/events', h(async (req, res) => {
  const limit = Math.min(200, Number(req.query.limit) || 50);
  res.json(await q('SELECT id, kind, message, created_at AS "createdAt" FROM sync_events ORDER BY created_at DESC, id DESC LIMIT $1', [limit]));
}));

r.post('/monday/sync', requireLead, h(async (_req, res) => res.json(await monday.syncBoard())));

r.get('/monday/columns', requireLead, h(async (_req, res) => {
  if (!monday.isConfigured()) throw new HttpError(400, 'Monday is not connected. Set MONDAY_API_TOKEN and MONDAY_BOARD_ID.');
  res.json(await monday.fetchColumns());
}));

r.post('/monday/webhooks/register', requireLead, h(async (req, res) => {
  if (!monday.isConfigured()) throw new HttpError(400, 'Monday is not connected.');
  const { publicUrl } = req.body || {};
  if (!/^https:\/\//.test(publicUrl || '')) throw new HttpError(400, 'publicUrl must be the https address where Monday can reach this API.');
  res.json(await monday.registerWebhooks(publicUrl));
}));

export default r;

/**
 * Webhook receiver. Mounted before auth: Monday calls it, not a signed-in user.
 * Monday first sends {"challenge": "..."} and expects it echoed back.
 */
export const webhookRouter = Router().post('/monday/webhook', h(async (req, res) => {
  if (req.body?.challenge) return res.json({ challenge: req.body.challenge });
  if (config.monday.webhookSecret && req.query.secret !== config.monday.webhookSecret) throw new HttpError(401, 'Bad webhook secret.');
  res.json({ ok: true }); // answer fast; Monday retries slow responses
  monday.handleWebhookEvent(req.body?.event).catch(err =>
    q(`INSERT INTO sync_events(kind, message) VALUES ('error', $1)`, [`Webhook failed: ${err.message}`]).catch(() => {}));
}));
