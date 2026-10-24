/**
 * Fit score for placing an engineer on a project, 0-100.
 *   60% required-skill ratings (manager-confirmed ratings count fully, pending ones at 80%)
 *   30% availability (5 Open .. 1 Full)
 *   10% interest in the project's product type
 */
export const WEIGHTS = { skills: 0.6, availability: 0.3, interest: 0.1 };
export const PENDING_FACTOR = 0.8;

export function fitScore(person, project) {
  const req = project.requiredSkills || [];
  let points = 0;
  const breakdown = req.map(skill => {
    const s = (person.skills || []).find(x => x.skill === skill);
    if (s) points += s.rating * (s.confirmed ? 1 : PENDING_FACTOR);
    return { skill, rating: s ? s.rating : null, confirmed: s ? s.confirmed : false };
  });
  const skillPct = req.length ? points / (5 * req.length) : 0;
  const availPct = (person.availability - 1) / 4;
  const interested = (person.interests || []).includes(project.productType);
  const score = Math.round(100 * (WEIGHTS.skills * skillPct + WEIGHTS.availability * availPct + WEIGHTS.interest * (interested ? 1 : 0)));
  return { score, breakdown, interested };
}
