import { q } from '../db.js';

/** Load projects with required skills, team and raised hands. */
export async function loadProjects({ ids = null, status = null } = {}) {
  const projects = await q(
    `SELECT * FROM projects
      WHERE ($1::int[] IS NULL OR id = ANY($1)) AND ($2::text IS NULL OR status = $2)
      ORDER BY CASE status WHEN 'new' THEN 0 WHEN 'progress' THEN 1 WHEN 'hold' THEN 2 ELSE 3 END, name`,
    [ids, status]);
  if (!projects.length) return [];
  const pid = projects.map(p => p.id);
  const [skills, team, interest] = await Promise.all([
    q('SELECT project_id, skill FROM project_skills WHERE project_id = ANY($1) ORDER BY skill', [pid]),
    q(`SELECT a.project_id, a.kind, a.source, p.id, p.name, p.role, p.monday_user_id
         FROM assignments a JOIN people p ON p.id = a.person_id
        WHERE a.project_id = ANY($1) ORDER BY a.kind, p.name`, [pid]),
    q(`SELECT i.project_id, i.created_at, p.id, p.name
         FROM project_interest i JOIN people p ON p.id = i.person_id
        WHERE i.project_id = ANY($1) ORDER BY i.created_at`, [pid])
  ]);
  return projects.map(p => {
    const myTeam = team.filter(t => t.project_id === p.id).map(t => ({
      id: t.id, name: t.name, role: t.role, as: t.kind, source: t.source, linkedToMonday: !!t.monday_user_id
    }));
    const closes = p.interest_closes_at ? new Date(p.interest_closes_at) : null;
    return {
      id: p.id, mondayItemId: p.monday_item_id ? String(p.monday_item_id) : null,
      name: p.name, client: p.client, productType: p.product_type, status: p.status,
      seatCap: p.seat_cap, startsOn: p.starts_on, endsOn: p.ends_on,
      interestClosesAt: closes, interestOpen: p.status === 'new' && !!closes && closes > new Date(),
      notifiedAt: p.notified_at, syncedAt: p.synced_at,
      requiredSkills: skills.filter(s => s.project_id === p.id).map(s => s.skill),
      team: myTeam,
      seatsUsed: myTeam.filter(t => t.as === 'resource').length,
      interest: interest.filter(i => i.project_id === p.id).map(i => ({ id: i.id, name: i.name, at: i.created_at }))
    };
  });
}

/** Engineers see how many raised hands and whether they did; leads see who. */
export function presentProject(p, me) {
  if (me.is_lead) return p;
  return { ...p, interestCount: p.interest.length, iRaisedHand: p.interest.some(i => i.id === me.id), interest: undefined };
}
