import { Router } from 'express';
import { q, one, tx } from '../db.js';
import { h, HttpError, requireLead, selfOrLead } from '../auth.js';
import { loadPeople, presentPeople } from '../services/people.js';

const r = Router();
const int = v => { const n = Number(v); if (!Number.isInteger(n)) throw new HttpError(400, 'Expected a whole number.'); return n; };

async function respondPerson(req, res, id) {
  const [p] = await presentPeople(await loadPeople([id], { engineersOnly: false }), req.me);
  if (!p) throw new HttpError(404, 'Person not found.');
  res.json(p);
}

/** The signed-in person's own full profile */
r.get('/me', h(async (req, res) => respondPerson(req, res, req.me.id)));

/** Engineers with filters: skill, minAvailability, interest, overdue, q (name or skill) */
r.get('/engineers', h(async (req, res) => {
  let list = await loadPeople();
  const { skill, interest, q: text } = req.query;
  const minAv = Number(req.query.minAvailability || 0);
  if (skill) list = list.filter(p => p.skills.some(s => s.skill === skill));
  if (interest) list = list.filter(p => p.interests.includes(interest));
  if (minAv) list = list.filter(p => p.availability >= minAv);
  if (req.query.overdue === 'true') list = list.filter(p => p.checkinOverdue);
  if (text) {
    const t = String(text).toLowerCase();
    list = list.filter(p => p.name.toLowerCase().includes(t) || p.skills.some(s => s.skill.toLowerCase().includes(t)));
  }
  list.sort((a, b) => b.availability - a.availability || a.name.localeCompare(b.name));
  res.json(await presentPeople(list, req.me));
}));

r.get('/engineers/:id', h(async (req, res) => respondPerson(req, res, int(req.params.id))));

/** Availability (counts as a check-in), goals, onboarding flag */
r.patch('/engineers/:id', h(async (req, res) => {
  const id = int(req.params.id); selfOrLead(req, id);
  const { availability, goals, onboarded } = req.body;
  if (availability !== undefined) {
    if (![1, 2, 3, 4, 5].includes(availability)) throw new HttpError(400, 'Availability must be 1 (Full) to 5 (Open).');
    await q('UPDATE people SET availability = $2, last_checkin = now() WHERE id = $1', [id, availability]);
  }
  if (goals !== undefined) await q('UPDATE people SET goals = $2 WHERE id = $1', [id, String(goals).slice(0, 2000)]);
  if (onboarded !== undefined) await q('UPDATE people SET onboarded = $2 WHERE id = $1', [id, !!onboarded]);
  await respondPerson(req, res, id);
}));

/** "Nothing changed" check-in: refresh the timestamp without editing availability */
r.post('/engineers/:id/checkin', h(async (req, res) => {
  const id = int(req.params.id); selfOrLead(req, id);
  await q('UPDATE people SET last_checkin = now() WHERE id = $1', [id]);
  await respondPerson(req, res, id);
}));

/** Add or update a skill. Any change by the engineer sends the rating back for manager review. */
r.put('/engineers/:id/skills/:skill', h(async (req, res) => {
  const id = int(req.params.id); selfOrLead(req, id);
  const skill = req.params.skill;
  const { rating, kind = 'client', badge = null, evidence = '' } = req.body;
  if (![1, 2, 3, 4, 5].includes(rating)) throw new HttpError(400, 'Rating must be 1 to 5.');
  if (!['client', 'learning'].includes(kind)) throw new HttpError(400, 'Kind must be client or learning.');
  if (!(await one('SELECT 1 FROM skills WHERE name = $1', [skill]))) throw new HttpError(400, `Unknown skill: ${skill}`);
  const confirmNow = req.me.is_lead && req.me.id !== id;
  await q(
    `INSERT INTO person_skills(person_id, skill, rating, kind, badge, evidence, confirmed_by, confirmed_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
     ON CONFLICT (person_id, skill) DO UPDATE SET rating = $3, kind = $4, badge = $5, evidence = $6,
       confirmed_by = CASE WHEN person_skills.rating = $3 AND person_skills.kind = $4 THEN COALESCE($7, person_skills.confirmed_by) ELSE $7 END,
       confirmed_at = CASE WHEN person_skills.rating = $3 AND person_skills.kind = $4 THEN COALESCE($8, person_skills.confirmed_at) ELSE $8 END,
       updated_at = now()`,
    [id, skill, rating, kind, badge, String(evidence).slice(0, 1000), confirmNow ? req.me.id : null, confirmNow ? new Date() : null]);
  await respondPerson(req, res, id);
}));

r.delete('/engineers/:id/skills/:skill', h(async (req, res) => {
  const id = int(req.params.id); selfOrLead(req, id);
  await q('DELETE FROM person_skills WHERE person_id = $1 AND skill = $2', [id, req.params.skill]);
  await respondPerson(req, res, id);
}));

/** Manager review: confirm a self-rating */
r.post('/engineers/:id/skills/:skill/confirm', requireLead, h(async (req, res) => {
  const id = int(req.params.id);
  const row = await one(
    `UPDATE person_skills SET confirmed_by = $3, confirmed_at = now() WHERE person_id = $1 AND skill = $2 RETURNING skill`,
    [id, req.params.skill, req.me.id]);
  if (!row) throw new HttpError(404, 'That skill is not on this profile.');
  await respondPerson(req, res, id);
}));

/** Replace product interests or growth areas wholesale */
for (const [path, table, column, ref] of [
  ['interests', 'person_interests', 'product_type', 'product_types'],
  ['growth', 'person_growth', 'skill', 'skills']
]) {
  r.put(`/engineers/:id/${path}`, h(async (req, res) => {
    const id = int(req.params.id); selfOrLead(req, id);
    const values = Array.isArray(req.body) ? [...new Set(req.body.map(String))] : null;
    if (!values) throw new HttpError(400, 'Send an array of names.');
    const known = (await q(`SELECT name FROM ${ref} WHERE name = ANY($1)`, [values])).map(x => x.name);
    const unknown = values.filter(v => !known.includes(v));
    if (unknown.length) throw new HttpError(400, `Unknown: ${unknown.join(', ')}`);
    await tx(async t => {
      await t.q(`DELETE FROM ${table} WHERE person_id = $1`, [id]);
      for (const v of values) await t.q(`INSERT INTO ${table}(person_id, ${column}) VALUES ($1, $2)`, [id, v]);
    });
    await respondPerson(req, res, id);
  }));
}

/** Leads add new people (engineers sign in by email once added) */
r.post('/people', requireLead, h(async (req, res) => {
  const { email, name, role = null, isLead = false, isEngineer = true } = req.body;
  if (!email || !name) throw new HttpError(400, 'Email and name are required.');
  const row = await one(
    `INSERT INTO people(email, name, role, is_lead, is_engineer) VALUES (lower($1), $2, $3, $4, $5)
     ON CONFLICT (email) DO NOTHING RETURNING id`, [email, name, role, !!isLead, !!isEngineer]);
  if (!row) throw new HttpError(409, `${email} already has a profile.`);
  res.status(201);
  await respondPerson(req, res, row.id);
}));

export default r;
