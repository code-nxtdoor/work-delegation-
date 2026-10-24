import { q, setting } from '../db.js';

const DAY = 86400e3;

/** Load people with skills, growth areas, interests and project load. Pass ids to limit. */
export async function loadPeople(ids = null, { engineersOnly = true } = {}) {
  const people = await q(
    `SELECT id, email, name, role, is_lead, is_engineer, availability, last_checkin, goals, onboarded, monday_user_id
       FROM people
      WHERE ($1::int[] IS NULL OR id = ANY($1)) AND ($2::boolean = false OR is_engineer)
      ORDER BY name`, [ids, engineersOnly]);
  if (!people.length) return [];
  const pid = people.map(p => p.id);
  const [skills, growth, interests, projects, roleReq, paths] = await Promise.all([
    q(`SELECT ps.person_id, ps.skill, ps.rating, ps.kind, ps.badge, ps.evidence, ps.confirmed_at, c.name AS confirmed_by
         FROM person_skills ps LEFT JOIN people c ON c.id = ps.confirmed_by
        WHERE ps.person_id = ANY($1) ORDER BY ps.rating DESC, ps.skill`, [pid]),
    q('SELECT person_id, skill FROM person_growth WHERE person_id = ANY($1) ORDER BY skill', [pid]),
    q('SELECT person_id, product_type FROM person_interests WHERE person_id = ANY($1) ORDER BY product_type', [pid]),
    q(`SELECT a.person_id, a.kind, p.id, p.name, p.client, p.status, p.product_type
         FROM assignments a JOIN projects p ON p.id = a.project_id
        WHERE a.person_id = ANY($1) AND p.status <> 'done' ORDER BY p.name`, [pid]),
    q('SELECT role, skill, min_rating FROM role_requirements'),
    q('SELECT name, learning_path FROM skills')
  ]);
  const checkinDays = Number(await setting('checkin_days')) || 14;
  const learning = Object.fromEntries(paths.map(p => [p.name, p.learning_path]));

  return people.map(p => {
    const mySkills = skills.filter(s => s.person_id === p.id).map(s => ({
      skill: s.skill, rating: s.rating, kind: s.kind, badge: s.badge, evidence: s.evidence,
      confirmed: !!s.confirmed_at, confirmedBy: s.confirmed_by
    }));
    const myProjects = projects.filter(x => x.person_id === p.id).map(x => ({
      id: x.id, name: x.name, client: x.client, status: x.status, productType: x.product_type, as: x.kind
    }));
    const daysAgo = Math.floor((Date.now() - new Date(p.last_checkin).getTime()) / DAY);
    const reqs = roleReq.filter(r => r.role === p.role).map(r => {
      const s = mySkills.find(x => x.skill === r.skill);
      return { skill: r.skill, min: r.min_rating, rating: s ? s.rating : 0, met: !!s && s.rating >= r.min_rating };
    });
    return {
      id: p.id, email: p.email, name: p.name, role: p.role, isLead: p.is_lead, isEngineer: p.is_engineer,
      availability: p.availability, lastCheckin: p.last_checkin, checkinDaysAgo: daysAgo,
      checkinOverdue: daysAgo > checkinDays, goals: p.goals, onboarded: p.onboarded,
      linkedToMonday: !!p.monday_user_id,
      skills: mySkills,
      growth: growth.filter(g => g.person_id === p.id).map(g => ({ skill: g.skill, learningPath: learning[g.skill] || null })),
      interests: interests.filter(i => i.person_id === p.id).map(i => i.product_type),
      projects: myProjects,
      load: {
        active: myProjects.filter(x => x.status === 'progress' && x.as === 'resource').length,
        onHold: myProjects.filter(x => x.status === 'hold').length,
        shadowing: myProjects.filter(x => x.as === 'shadow' && x.status !== 'hold').length
      },
      roleFit: reqs
    };
  });
}

/** Hide skill ratings from viewers who shouldn't see them (open question from meeting 1). */
export async function presentPeople(list, me) {
  const visibility = await setting('skill_visibility');
  return list.map(p => {
    const canSee = me.is_lead || visibility === 'all' || p.id === me.id;
    return canSee ? p : { ...p, skills: null, roleFit: null };
  });
}
