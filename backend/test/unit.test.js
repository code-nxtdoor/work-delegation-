import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fitScore } from '../src/services/scoring.js';
import { mapItem, mapStatus } from '../src/services/monday.js';

const project = { productType: 'Agentic AI', requiredSkills: ['Agentic AI', 'Python'] };

test('fitScore rewards confirmed skills, availability and interest', () => {
  const strong = { availability: 5, interests: ['Agentic AI'], skills: [
    { skill: 'Agentic AI', rating: 5, confirmed: true }, { skill: 'Python', rating: 5, confirmed: true }] };
  assert.equal(fitScore(strong, project).score, 100);

  const pending = { ...strong, skills: strong.skills.map(s => ({ ...s, confirmed: false })) };
  assert.equal(fitScore(pending, project).score, 88); // 60*0.8 + 30 + 10

  const busy = { availability: 1, interests: [], skills: [] };
  assert.equal(fitScore(busy, project).score, 0);
});

test('mapStatus maps board labels to dashboard states', () => {
  assert.equal(mapStatus('Working on it'), 'progress');
  assert.equal(mapStatus('on hold'), 'hold');
  assert.equal(mapStatus('Done'), 'done');
  assert.equal(mapStatus(''), 'new');
});

test('mapItem reads columns from a Monday item', () => {
  const m = mapItem({ id: 42, name: 'X', column_values: [
    { id: 'client', text: 'Acme', value: null },
    { id: 'status', text: 'Stuck', value: null },
    { id: 'people', text: '', value: JSON.stringify({ personsAndTeams: [{ id: 7, kind: 'person' }, { id: 9, kind: 'team' }] }) },
    { id: 'timeline', text: '', value: JSON.stringify({ from: '2026-01-01', to: '2026-02-01' }) }
  ] });
  assert.deepEqual(m, { mondayItemId: '42', name: 'X', client: 'Acme', productType: null, status: 'hold',
    startsOn: '2026-01-01', endsOn: '2026-02-01', seatCap: null, mondayUserIds: ['7'] });
});
