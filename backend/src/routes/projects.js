import { Router } from 'express';
import { q, one, tx, logEvent } from '../db.js';
import { h, HttpError, requireLead } from '../auth.js';
import { loadProjects, presentProject } from '../services/projects.js';
import { loadPeople } from '../services/people.js';
import { fitScore } from '../services/scoring.js';
import { postToSlack, placementMessage, slackChannelName } from '../services/notify.js';
import * as monday from '../services/monday.js';

const r = Router();
const int = v => { const n = Number(v); if (!Number.isInteger(n)) throw new HttpError(400, 'Expected a whole number.'); return n; };

async function getProject(id) {
  const [p] = await loadProjects({ ids: [id] });
  if (!p) throw new HttpError(404, 'Project not found.');
  return p;
}
const send = async (req, res, id) => res.json(presentProject(await getProject(id), req.me));

r.get('/projects', h(async (req, res) => {
  const status = ['new', 'progress', 'hold', 'done'].includes(req.query.status) ? req.query.status : null;
  let list = await loadProjects({ status });
  if (!status) list = list.filter(p => p.status !== 'done');
  res.json(list.map(p => presentProject(p, req.me)));
}));

r.get('/projects/:id', h(async (req, res) => send(req, res, int(req.params.id))));

/** Edit required skills and seat cap */
r.patch('/projects/:id', requireLead, h(async (req, res) => {
  const id = int(req.params.id);
  const p = await getProject(id);
  const { seatCap, requiredSkills, resetSkills } = req.body;
  await tx(async t => {
    if (seatCap !== undefined) {
      if (!Number.isInteger(seatCap) || seatCap < 1 || seatCap > 20) throw new HttpError(400, 'Seat cap must be 1 to 20.');
      if (seatCap < p.seatsUsed) throw new HttpError(409, `${p.seatsUsed} resources are already placed. Remove someone before lowering the cap.`);
      await t.q('UPDATE projects SET seat_cap = $2 WHERE id = $1', [id, seatCap]);
    }
    if (resetSkills) {
      await t.q('DELETE FROM project_skills WHERE project_id = $1', [id]);
      await t.q('INSERT INTO project_skills(project_id, skill) SELECT $1, skill FROM product_type_skills WHERE product_type = $2', [id, p.productType]);
    } else if (Array.isArray(requiredSkills)) {
      await t.q('DELETE FROM project_skills WHERE project_id = $1', [id]);
      for (const s of new Set(requiredSkills)) {
        if (!(await t.one('SELECT 1 FROM skills WHERE name = $1', [s]))) throw new HttpError(400, `Unknown skill: ${s}`);
        await t.q('INSERT INTO project_skills(project_id, skill) VALUES ($1, $2)', [id, s]);
      }
    }
  });
  await send(req, res, id);
}));

/** Ranked candidates. Filters: minRating (on any required skill), minAvailability, raisedHandOnly */
r.get('/projects/:id/candidates', requireLead, h(async (req, res) => {
  const p = await getProject(int(req.params.id));
  const minRating = Number(req.query.minRating || 0);
  const minAv = Number(req.query.minAvailability || 0);
  const handsOnly = req.query.raisedHandOnly === 'true';
  const onTeam = new Set(p.team.map(t => t.id));
  const hands = new Set(p.interest.map(i => i.id));
  const people = (await loadPeople()).filter(e => !onTeam.has(e.id))
    .filter(e => e.availability >= minAv)
    .filter(e => !handsOnly || hands.has(e.id))
    .filter(e => !minRating || p.requiredSkills.some(s => (e.skills.find(x => x.skill === s)?.rating || 0) >= minRating));
  const ranked = people.map(e => {
    const fit = fitScore(e, p);
    return {
      id: e.id, name: e.name, role: e.role, availability: e.availability, load: e.load,
      score: fit.score, skills: fit.breakdown, wantsThisType: fit.interested, raisedHand: hands.has(e.id),
      growthMatch: e.growth.some(g => p.requiredSkills.includes(g.skill))
    };
  }).sort((a, b) => b.score - a.score);
  res.json(ranked);
}));

/** Place someone. Resources take a seat; shadows don't. */
r.post('/projects/:id/assignments', requireLead, h(async (req, res) => {
  const id = int(req.params.id);
  const personId = int(req.body.personId);
  const kind = req.body.kind === 'shadow' ? 'shadow' : 'resource';
  await tx(async t => {
    const p = await t.one('SELECT seat_cap FROM projects WHERE id = $1 FOR UPDATE', [id]);
    if (!p) throw new HttpError(404, 'Project not found.');
    if (!(await t.one('SELECT 1 FROM people WHERE id = $1', [personId]))) throw new HttpError(404, 'Person not found.');
    if (kind === 'resource') {
      const { n } = await t.one(
        `SELECT count(*)::int AS n FROM assignments WHERE project_id = $1 AND kind = 'resource' AND person_id <> $2`, [id, personId]);
      if (n >= p.seat_cap) throw new HttpError(409, `All ${p.seat_cap} seats are filled. Raise the cap or add them as a shadow.`);
    }
    await t.q(
      `INSERT INTO assignments(project_id, person_id, kind) VALUES ($1, $2, $3)
       ON CONFLICT (project_id, person_id) DO UPDATE SET kind = $3`, [id, personId, kind]);
    await t.q('UPDATE projects SET notified_at = NULL WHERE id = $1', [id]);
  });
  res.status(201);
  await send(req, res, id);
}));

r.delete('/projects/:id/assignments/:personId', requireLead, h(async (req, res) => {
  const id = int(req.params.id);
  await q('DELETE FROM assignments WHERE project_id = $1 AND person_id = $2', [id, int(req.params.personId)]);
  await q('UPDATE projects SET notified_at = NULL WHERE id = $1', [id]);
  await send(req, res, id);
}));

/** Engineers raise a hand while the interest window is open */
r.post('/projects/:id/interest', h(async (req, res) => {
  const id = int(req.params.id);
  const p = await one('SELECT status, interest_closes_at FROM projects WHERE id = $1', [id]);
  if (!p) throw new HttpError(404, 'Project not found.');
  if (p.status !== 'new' || !p.interest_closes_at || new Date(p.interest_closes_at) <= new Date()) {
    throw new HttpError(409, 'The interest window has closed. Message the engagement lead directly if you still want in.');
  }
  await q('INSERT INTO project_interest(project_id, person_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [id, req.me.id]);
  await send(req, res, id);
}));

r.delete('/projects/:id/interest', h(async (req, res) => {
  const id = int(req.params.id);
  await q('DELETE FROM project_interest WHERE project_id = $1 AND person_id = $2', [id, req.me.id]);
  await send(req, res, id);
}));

/** Draft of the placement message, for preview before sending */
r.get('/projects/:id/notice', requireLead, h(async (req, res) => {
  const p = await getProject(int(req.params.id));
  res.json({ channel: slackChannelName(p), text: placementMessage(p), slackConfigured: !!process.env.SLACK_WEBHOOK_URL, mondayConfigured: monday.isConfigured() });
}));

/** Notify the team and optionally write them back to Monday's People column */
r.post('/projects/:id/notify', requireLead, h(async (req, res) => {
  const id = int(req.params.id);
  const p = await getProject(id);
  if (!p.team.some(t => t.as === 'resource')) throw new HttpError(409, 'Place at least one resource first.');
  const writeBack = req.body.writeBack !== false;
  const result = { slack: null, monday: null };

  result.slack = await postToSlack(placementMessage(p)).catch(err => ({ sent: false, reason: err.message }));
  if (writeBack) {
    result.monday = await monday.writeBackTeam(p, { setStatusInProgress: p.status === 'new' })
      .catch(err => ({ written: false, reason: err.message }));
  }
  await q(`UPDATE projects SET notified_at = now(), status = CASE WHEN status = 'new' THEN 'progress' ELSE status END WHERE id = $1`, [id]);
  await logEvent('notify', `Placement notice for ${p.name}: ${result.slack.sent ? 'posted to Slack' : 'Slack not sent (' + result.slack.reason + ')'}.`);
  res.json({ ...result, project: await getProject(id) });
}));

export default r;
