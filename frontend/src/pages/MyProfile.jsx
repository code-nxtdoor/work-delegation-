import { useEffect, useState } from 'react';
import {
  Button, Checkbox, ProgressIndicator, ProgressStep, Select, SelectItem, Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow, Tag, TextArea, TextInput, Tile
} from '@carbon/react';
import { Checkmark, TrashCan } from '@carbon/icons-react';
import { api } from '../api.js';
import { useLoad, useSession } from '../session.jsx';
import { PageHeader, RatingInput } from '../components.jsx';
import { AVAILABILITY } from '../lib.js';

export default function MyProfile() {
  const { me, refreshMe, reference, settings, notify, fail } = useSession();
  const projects = useLoad(() => api('/projects?status=progress'), []);
  const [goals, setGoals] = useState(me.goals);
  useEffect(() => setGoals(me.goals), [me.goals]);

  const save = async (path, opts, msg) => {
    try { await api(path, opts); await refreshMe(); if (msg) notify('success', msg); }
    catch (e) { fail(e); }
  };
  const putSkill = (s, patch) => save(`/engineers/${me.id}/skills/${encodeURIComponent(s.skill)}`,
    { method: 'PUT', body: { rating: s.rating, kind: s.kind, badge: s.badge, evidence: s.evidence, ...patch } });
  const due = settings.checkin_days - me.checkinDaysAgo;

  return (
    <>
      <PageHeader eyebrow="My profile · searchable by leads" title={me.name}>
        {me.role}. Keep this current and the engagement lead can place you without a round of Slack messages.
      </PageHeader>

      {!me.onboarded && (
        <Tile className="section-tile">
          <h2>Finish setting up your profile</h2>
          <ProgressIndicator spaceEqually currentIndex={[me.skills.length > 0, true, me.interests.length > 0, !!me.goals].filter(Boolean).length}>
            <ProgressStep label="Skills" complete={me.skills.length > 0} />
            <ProgressStep label="Projects from Monday" complete secondaryLabel="Imported" />
            <ProgressStep label="Product interests" complete={me.interests.length > 0} />
            <ProgressStep label="Goals" complete={!!me.goals} />
            <ProgressStep label="Availability" />
          </ProgressIndicator>
          <Button size="sm" onClick={() => save(`/engineers/${me.id}`, { method: 'PATCH', body: { onboarded: true } }, 'Your profile is now searchable')}>Make my profile searchable</Button>
        </Tile>
      )}

      <Tile className="section-tile">
        <div className="row-between"><h2>Are you available right now?</h2>
          <span className={due < 0 ? 'text-error small' : 'muted small'}>{due >= 0 ? `Next check-in due in ${due} day${due === 1 ? '' : 's'}` : `Check-in overdue by ${-due} days`}</span></div>
        <div className="avail-picker" role="radiogroup" aria-label="Availability">
          {[5, 4, 3, 2, 1].map(v => (
            <button key={v} role="radio" aria-checked={me.availability === v} className={`avail-option tone-${AVAILABILITY[v].tone} ${me.availability === v ? 'selected' : ''}`}
              onClick={() => save(`/engineers/${me.id}`, { method: 'PATCH', body: { availability: v } }, `Availability set to ${AVAILABILITY[v].label}`)}>
              <span className="swatch" />{AVAILABILITY[v].label}
            </button>
          ))}
        </div>
        <div className="row">
          <span className="muted small">One click updates what leads see. No hour tracking.</span>
          <Button size="sm" kind="ghost" renderIcon={Checkmark} onClick={() => save(`/engineers/${me.id}/checkin`, { method: 'POST' }, 'Checked in. Nothing changed.')}>Nothing changed, check in</Button>
        </div>
      </Tile>

      <Tile className="section-tile">
        <div className="row-between"><h2>My skills</h2><span className="muted small">1–5 self-rating · changing a rating or its source sends it back for manager review</span></div>
        <div className="table-scroll"><Table size="md" aria-label="My skills">
          <TableHead><TableRow><TableHeader>Skill</TableHeader><TableHeader>Rating</TableHeader><TableHeader>Where it comes from</TableHeader><TableHeader>How you applied it</TableHeader><TableHeader>Review</TableHeader><TableHeader><span className="cds--visually-hidden">Remove</span></TableHeader></TableRow></TableHead>
          <TableBody>{me.skills.map(s => (
            <TableRow key={s.skill}>
              <TableCell><strong>{s.skill}</strong></TableCell>
              <TableCell><RatingInput id={`r-${s.skill}`} value={s.rating} pending={!s.confirmed} onChange={v => putSkill(s, { rating: v })} /></TableCell>
              <TableCell>
                <div className="row nowrap">
                  <Select id={`k-${s.skill}`} size="sm" hideLabel labelText="Source" value={s.kind} onChange={e => putSkill(s, { kind: e.target.value })}>
                    <SelectItem value="client" text="Client work" /><SelectItem value="learning" text="Learning" />
                  </Select>
                  {s.kind === 'learning' && <Select id={`b-${s.skill}`} size="sm" hideLabel labelText="Badge" value={s.badge || ''} onChange={e => putSkill(s, { badge: e.target.value || null })}>
                    <SelectItem value="" text="No badge" />{['L1', 'L2', 'L3', 'L4'].map(b => <SelectItem key={b} value={b} text={b} />)}
                  </Select>}
                </div>
              </TableCell>
              <TableCell className="evidence-cell">
                <TextInput id={`e-${s.skill}`} size="sm" hideLabel labelText={`How you applied ${s.skill}`} defaultValue={s.evidence}
                  placeholder="e.g. built an agent for a client" onBlur={e => e.target.value !== s.evidence && putSkill(s, { evidence: e.target.value })} />
              </TableCell>
              <TableCell>{s.confirmed ? <Tag size="sm" type="green">Confirmed</Tag> : <Tag size="sm" type="warm-gray">Pending</Tag>}</TableCell>
              <TableCell><Button kind="ghost" size="sm" hasIconOnly renderIcon={TrashCan} iconDescription={`Remove ${s.skill}`}
                onClick={() => save(`/engineers/${me.id}/skills/${encodeURIComponent(s.skill)}`, { method: 'DELETE' })} /></TableCell>
            </TableRow>))}
          </TableBody>
        </Table></div>
        <Select id="add-my-skill" size="sm" labelText="Add a skill" value="" onChange={e => e.target.value && putSkill({ skill: e.target.value, rating: 1, kind: 'learning', badge: null, evidence: '' })}>
          <SelectItem value="" text="Choose a skill…" />
          {reference.skills.filter(r => !me.skills.some(s => s.skill === r.name)).map(r => <SelectItem key={r.name} value={r.name} text={r.name} />)}
        </Select>
      </Tile>

      <div className="two-col">
        <Tile className="section-tile">
          <h2>Skills to develop</h2>
          {me.growth.map(g => {
            const shadow = (projects.data || []).find(p => (p.productType === g.skill || p.requiredSkills.includes(g.skill)) && !p.team.some(t => t.id === me.id));
            return (
              <div key={g.skill} className="row-between list-row">
                <div><strong>{g.skill}</strong>
                  <div className="muted small">Learning: {g.learningPath || '—'}{shadow ? <> · shadow <strong>{shadow.name}</strong> for real-world exposure</> : null}</div></div>
                <Button kind="ghost" size="sm" hasIconOnly renderIcon={TrashCan} iconDescription={`Remove ${g.skill}`}
                  onClick={() => save(`/engineers/${me.id}/growth`, { method: 'PUT', body: me.growth.map(x => x.skill).filter(x => x !== g.skill) })} />
              </div>
            );
          })}
          <Select id="add-growth" size="sm" labelText="Add a growth area" value="" onChange={e => e.target.value && save(`/engineers/${me.id}/growth`, { method: 'PUT', body: [...me.growth.map(x => x.skill), e.target.value] })}>
            <SelectItem value="" text="Choose a skill…" />
            {reference.skills.filter(r => !me.growth.some(g => g.skill === r.name)).map(r => <SelectItem key={r.name} value={r.name} text={r.name} />)}
          </Select>
        </Tile>

        <Tile className="section-tile">
          <h2>Products I want to work on</h2>
          <fieldset className="checks">
            <legend className="cds--visually-hidden">Product interests</legend>
            {reference.productTypes.map(t => (
              <Checkbox key={t.name} id={`int-${t.name}`} labelText={t.name} checked={me.interests.includes(t.name)}
                onChange={(_e, { checked }) => save(`/engineers/${me.id}/interests`, { method: 'PUT', body: checked ? [...me.interests, t.name] : me.interests.filter(x => x !== t.name) })} />
            ))}
          </fieldset>
          <TextArea id="goals" labelText="Professional goals" rows={3} value={goals} onChange={e => setGoals(e.target.value)} />
          <Button size="sm" kind="tertiary" disabled={goals === me.goals} onClick={() => save(`/engineers/${me.id}`, { method: 'PATCH', body: { goals } }, 'Goals saved')}>Save goals</Button>
        </Tile>
      </div>

      <div className="two-col">
        <Tile className="section-tile">
          <div className="row-between"><h2>My projects</h2><span className="muted small">From the Monday board</span></div>
          {me.projects.length ? me.projects.map(p => (
            <div key={p.id} className="row-between list-row">
              <span><strong>{p.name}</strong> <span className="muted small">· {p.client}</span></span>
              <span className="tags">{p.status === 'hold' && <Tag size="sm" type="warm-gray">On hold</Tag>}<Tag size="sm" type={p.as === 'resource' ? 'green' : 'outline'}>{p.as === 'resource' ? 'Resource' : 'Shadow'}</Tag></span>
            </div>)) : <p className="muted">You're not on any projects yet.</p>}
        </Tile>
        <Tile className="section-tile">
          <div className="row-between"><h2>Fit for {me.role}</h2><span className="muted small">Role requirements</span></div>
          {me.roleFit?.length ? me.roleFit.map(r => (
            <div key={r.skill} className="row-between list-row"><span>{r.skill}</span>
              <Tag size="sm" type={r.met ? 'green' : 'warm-gray'}>{r.rating}/{r.min} {r.met ? 'met' : 'gap'}</Tag></div>
          )) : <p className="muted">No requirements set for this role.</p>}
        </Tile>
      </div>
    </>
  );
}
