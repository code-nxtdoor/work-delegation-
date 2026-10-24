/**
 * Monday.com integration
 *  - Read:       GraphQL API (https://api.monday.com/v2), board items paged with items_page / next_items_page
 *  - Real time:  webhooks POST to /api/monday/webhook; each event re-fetches the item and upserts it
 *  - Write-back: change_multiple_column_values sets the People (and optionally Status) column
 * Monday owns projects, status, timeline and assignments. This service mirrors them into Postgres.
 */
import { config } from '../config.js';
import { q, one, tx, setting, logEvent } from '../db.js';

const M = config.monday;
const API = M.apiUrl;
const ITEM_FIELDS = 'id name column_values { id type text value }';
const STATE_LABEL = { new: 'New', progress: 'In progress', hold: 'On hold', done: 'Done' };

export const isConfigured = () => Boolean(M.token && M.boardId);

export async function gql(query, variables = {}) {
  const headers = { 'Content-Type': 'application/json', Authorization: M.token };
  if (M.apiVersion) headers['API-Version'] = M.apiVersion;
  const res = await fetch(API, { method: 'POST', headers, body: JSON.stringify({ query, variables }) });
  let body = {};
  try { body = await res.json(); } catch { /* non-JSON error page */ }
  if (!res.ok || body.errors || body.error_message) {
    const msg = body.errors?.map(e => e.message).join('; ') || body.error_message || `HTTP ${res.status}`;
    throw new Error(`Monday API: ${msg}`);
  }
  return body.data;
}

/* ---------- reading ---------- */

export async function fetchBoardItems() {
  const first = await gql(
    `query ($board: [ID!]) { boards(ids: $board) { id name items_page(limit: 100) { cursor items { ${ITEM_FIELDS} } } } }`,
    { board: [String(M.boardId)] });
  const board = first.boards?.[0];
  if (!board) throw new Error(`Board ${M.boardId} was not found, or the token's user can't see it.`);
  const items = [...board.items_page.items];
  let cursor = board.items_page.cursor;
  while (cursor) {
    const page = await gql(
      `query ($cursor: String!) { next_items_page(limit: 100, cursor: $cursor) { cursor items { ${ITEM_FIELDS} } } }`,
      { cursor });
    items.push(...page.next_items_page.items);
    cursor = page.next_items_page.cursor;
  }
  return { board: { id: board.id, name: board.name }, items };
}

export async function fetchItem(id) {
  const d = await gql(`query ($ids: [ID!]) { items(ids: $ids) { ${ITEM_FIELDS} } }`, { ids: [String(id)] });
  return d.items?.[0] || null;
}

/** Board columns, so whoever sets this up can copy the right column IDs into .env */
export async function fetchColumns() {
  const d = await gql(`query ($board: [ID!]) { boards(ids: $board) { id name columns { id title type } } }`,
    { board: [String(M.boardId)] });
  return d.boards?.[0] || null;
}

/** Link Monday users to dashboard profiles by work email. */
export async function linkUsers() {
  let page = 1, linked = 0;
  for (;;) {
    const d = await gql('query ($page: Int) { users(limit: 200, page: $page) { id email } }', { page });
    const users = d.users || [];
    for (const u of users) {
      if (!u.email) continue;
      const r = await one(
        `UPDATE people SET monday_user_id = $1
          WHERE lower(email) = lower($2) AND (monday_user_id IS NULL OR monday_user_id <> $1) RETURNING id`,
        [u.id, u.email]);
      if (r) linked++;
    }
    if (users.length < 200) break;
    page++;
  }
  return linked;
}

/* ---------- mapping ---------- */

const parse = v => { try { return v ? JSON.parse(v) : null; } catch { return null; } };
const col = (item, id) => (id ? item.column_values.find(c => c.id === id) : null);

export function mapStatus(label) {
  const l = String(label || '').trim().toLowerCase();
  for (const [state, labels] of Object.entries(M.statusLabels)) {
    if (labels.some(x => x.toLowerCase() === l)) return state;
  }
  return 'new';
}

export function mapItem(item) {
  const C = M.columns;
  const timeline = parse(col(item, C.timeline)?.value);
  const people = parse(col(item, C.people)?.value);
  const cap = Number(col(item, C.seatCap)?.text);
  return {
    mondayItemId: String(item.id),
    name: item.name,
    client: col(item, C.client)?.text || '',
    productType: col(item, C.productType)?.text || null,
    status: mapStatus(col(item, C.status)?.text),
    startsOn: timeline?.from || null,
    endsOn: timeline?.to || null,
    seatCap: cap > 0 ? Math.min(20, Math.round(cap)) : null,
    mondayUserIds: (people?.personsAndTeams || []).filter(p => p.kind === 'person').map(p => String(p.id))
  };
}

const warned = new Set();
async function resolvePeople(mondayIds) {
  if (!mondayIds.length) return [];
  let rows = await q('SELECT id, monday_user_id FROM people WHERE monday_user_id = ANY($1::bigint[])', [mondayIds]);
  const known = new Set(rows.map(r => String(r.monday_user_id)));
  const unknown = mondayIds.filter(id => !known.has(id));
  if (unknown.length) {
    const d = await gql('query ($ids: [ID!]) { users(ids: $ids) { id name email } }', { ids: unknown });
    for (const u of d.users || []) {
      const r = await one(
        'UPDATE people SET monday_user_id = $1 WHERE lower(email) = lower($2) RETURNING id, monday_user_id', [u.id, u.email]);
      if (r) rows.push(r);
      else if (!warned.has(u.id)) {
        warned.add(u.id);
        await logEvent('error', `${u.name} (${u.email}) is on the Monday board but has no dashboard profile, so they were skipped.`);
      }
    }
  }
  return rows.map(r => r.id);
}

/* ---------- upsert ---------- */

export async function upsertItem(item, { via = 'sync' } = {}) {
  const m = mapItem(item);
  const personIds = await resolvePeople(m.mondayUserIds);
  const hours = Number(await setting('interest_window_hours')) || 24;
  const defaultCap = Number(await setting('default_seat_cap')) || 3;

  return tx(async t => {
    if (m.productType) await t.q('INSERT INTO product_types(name) VALUES ($1) ON CONFLICT DO NOTHING', [m.productType]);
    const existing = await t.one('SELECT id, status FROM projects WHERE monday_item_id = $1 FOR UPDATE', [m.mondayItemId]);
    const events = [];
    let id;
    if (!existing) {
      const row = await t.one(
        `INSERT INTO projects(monday_item_id, name, client, product_type, status, seat_cap, interest_closes_at, starts_on, ends_on, synced_at)
         VALUES ($1, $2, $3, $4, $5::text, $6,
                 CASE WHEN $5::text = 'new' THEN now() + make_interval(hours => $7::int) END, $8, $9, now())
         RETURNING id`,
        [m.mondayItemId, m.name, m.client, m.productType, m.status, m.seatCap ?? defaultCap, hours, m.startsOn, m.endsOn]);
      id = row.id;
      await t.q(
        `INSERT INTO project_skills(project_id, skill)
         SELECT $1, skill FROM product_type_skills WHERE product_type = $2 ON CONFLICT DO NOTHING`, [id, m.productType]);
      events.push(`New project from Monday: ${m.name}` +
        (m.status === 'new' ? `. Posted to engineers with a ${hours}-hour interest window.` : ` (${STATE_LABEL[m.status]}).`));
    } else {
      id = existing.id;
      await t.q(
        `UPDATE projects SET name = $2, client = $3, product_type = $4, status = $5, starts_on = $6, ends_on = $7,
                seat_cap = COALESCE($8, seat_cap), synced_at = now() WHERE id = $1`,
        [id, m.name, m.client, m.productType, m.status, m.startsOn, m.endsOn, m.seatCap]);
      if (existing.status !== m.status) events.push(`Status changed: ${m.name} → ${STATE_LABEL[m.status]}.`);
    }
    // The People column is the record of who's assigned. Mirror it; leave shadows and unsynced placements alone.
    await t.q(`DELETE FROM assignments WHERE project_id = $1 AND source = 'monday' AND NOT (person_id = ANY($2::int[]))`, [id, personIds]);
    for (const pid of personIds) {
      await t.q(
        `INSERT INTO assignments(project_id, person_id, kind, source) VALUES ($1, $2, 'resource', 'monday')
         ON CONFLICT (project_id, person_id) DO UPDATE SET kind = 'resource', source = 'monday'`, [id, pid]);
    }
    for (const msg of events) {
      await t.q('INSERT INTO sync_events(kind, message, payload) VALUES ($1, $2, $3)', [via, msg, { itemId: m.mondayItemId }]);
    }
    return { id, created: !existing, statusChanged: !!existing && existing.status !== m.status };
  });
}

/* ---------- full sync, webhooks ---------- */

let running = null;
export function syncBoard() {
  if (!isConfigured()) return Promise.reject(Object.assign(new Error('Monday is not connected. Set MONDAY_API_TOKEN and MONDAY_BOARD_ID.'), { status: 400 }));
  if (running) return running;
  running = (async () => {
    try {
      await linkUsers();
      const { board, items } = await fetchBoardItems();
      let created = 0, changed = 0;
      for (const it of items) {
        const r = await upsertItem(it, { via: 'sync' });
        created += r.created ? 1 : 0;
        changed += r.statusChanged ? 1 : 0;
      }
      await logEvent('sync', `Read ${items.length} items from ${board.name}. ${created} new, ${changed} status change${changed === 1 ? '' : 's'}.`);
      return { board, items: items.length, created, changed };
    } catch (err) {
      await logEvent('error', `Sync failed: ${err.message}`);
      throw err;
    }
  })().finally(() => { running = null; });
  return running;
}

/** Handle one webhook event. We re-read the item instead of trusting the event body. */
export async function handleWebhookEvent(event) {
  const itemId = event?.pulseId ?? event?.itemId;
  if (!itemId) return;
  if (event.boardId && String(event.boardId) !== String(M.boardId)) return;
  const item = /delete|archive/.test(event.type || '') ? null : await fetchItem(itemId);
  if (!item) {
    const r = await one(`UPDATE projects SET status = 'done' WHERE monday_item_id = $1 RETURNING name`, [itemId]);
    if (r) await logEvent('webhook', `${r.name} was archived or deleted on Monday, so it's closed here.`);
    return;
  }
  const r = await upsertItem(item, { via: 'webhook' });
  if (!r.created && !r.statusChanged) await logEvent('webhook', `${item.name} updated on Monday.`);
}

/** Subscribe the board's events to this API. publicUrl is where Monday can reach /api/monday/webhook. */
export async function registerWebhooks(publicUrl, events = ['create_item', 'change_column_value', 'item_archived', 'item_deleted']) {
  const url = new URL('/api/monday/webhook', publicUrl);
  if (M.webhookSecret) url.searchParams.set('secret', M.webhookSecret);
  const out = [];
  for (const event of events) {
    try {
      const d = await gql(
        'mutation ($board: ID!, $url: String!, $event: WebhookEventType!) { create_webhook(board_id: $board, url: $url, event: $event) { id } }',
        { board: String(M.boardId), url: url.toString(), event });
      out.push({ event, id: d.create_webhook?.id, ok: true });
    } catch (err) {
      out.push({ event, ok: false, error: err.message });
    }
  }
  return out;
}

/* ---------- write-back ---------- */

export async function writeBackTeam(project, { setStatusInProgress = false } = {}) {
  if (!isConfigured()) return { written: false, reason: 'Monday is not connected.' };
  if (!project.mondayItemId) return { written: false, reason: 'This project did not come from Monday.' };
  const resources = project.team.filter(t => t.as === 'resource');
  const ids = resources.map(r => r.id);
  const load = () => q('SELECT id, name, monday_user_id FROM people WHERE id = ANY($1)', [ids]);
  let rows = await load();
  if (rows.some(r => !r.monday_user_id)) { await linkUsers(); rows = await load(); }
  const linked = rows.filter(r => r.monday_user_id);
  const missing = rows.filter(r => !r.monday_user_id).map(r => r.name);

  // Merge, don't overwrite: keep anyone on the item who isn't a dashboard person (PMs, teams, other squads).
  const item = await fetchItem(project.mondayItemId);
  if (!item) return { written: false, reason: 'The item no longer exists on Monday.' };
  const current = parse(col(item, M.columns.people)?.value)?.personsAndTeams || [];
  const dashboardIds = new Set((await q('SELECT monday_user_id FROM people WHERE monday_user_id IS NOT NULL'))
    .map(r => String(r.monday_user_id)));
  const keep = current.filter(p => p.kind !== 'person' || !dashboardIds.has(String(p.id)));
  const personsAndTeams = [...keep, ...linked.map(r => ({ id: Number(r.monday_user_id), kind: 'person' }))];

  const values = { [M.columns.people]: { personsAndTeams } };
  if (setStatusInProgress && M.statusLabels.progress[0]) values[M.columns.status] = { label: M.statusLabels.progress[0] };

  await gql(
    'mutation ($board: ID!, $item: ID!, $values: JSON!) { change_multiple_column_values(board_id: $board, item_id: $item, column_values: $values) { id } }',
    { board: String(M.boardId), item: project.mondayItemId, values: JSON.stringify(values) });
  await q(`UPDATE assignments SET source = 'monday' WHERE project_id = $1 AND person_id = ANY($2)`, [project.id, linked.map(r => r.id)]);
  await logEvent('write-back', `People column updated on ${project.name} (${linked.map(r => r.name).join(', ') || 'nobody'}).` +
    (missing.length ? ` Not on Monday yet: ${missing.join(', ')}.` : ''));
  return { written: true, missing };
}
