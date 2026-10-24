import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button, Checkbox, ContentSwitcher, DismissibleTag, InlineNotification, NumberInput, Select, SelectItem, Switch, Tag, Tile
} from '@carbon/react';
import { Add, Send } from '@carbon/icons-react';
import { api, qs } from '../api.js';
import { useLoad, useSession } from '../session.jsx';
import { AvailabilityMeter, Empty, LoadError, Loading, OpenQuestion, PageHeader, Person, SkillTag, Stat, StatRow } from '../components.jsx';
import { STATUS, initials, plural, timeLeft } from '../lib.js';
import EngineerModal from './EngineerModal.jsx';

export default function StaffProject() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { reference, fail, notify } = useSession();
  const projects = useLoad(() => api('/projects'), []);
  const staffable = (projects.data || []).filter(p => p.status === 'new' || p.status === 'progress');
  const pid = Number(id) || staffable[0]?.id;

  useEffect(() => { if (!id && pid) navigate(`/staff/${pid}`, { replace: true }); }, [id, pid, navigate]);

  if (projects.error) return <LoadError error={projects.error} retry={projects.reload} />;
  if (projects.loading && !projects.data) return <Loading />;
  if (!pid) return <><PageHeader eyebrow="Staff a project" title="Nothing to staff" /><Empty>No new or in-progress projects. New ones arrive from the Monday board.</Empty></>;
  return <StaffOne key={pid} pid={pid} staffable={staffable} reference={reference} fail={fail} notify={notify} navigate={navigate} />;
}

function StaffOne({ pid, staffable, reference, fail, notify, navigate }) {
  const project = useLoad(() => api(`/projects/${pid}`), [pid]);
  const [filters, setFilters] = useState({ minRating: 0, minAvailability: 0, raisedHandOnly: false });
  const cands = useLoad(() => api(`/projects/${pid}/candidates${qs(filters)}`), [pid, filters]);
  const notice = useLoad(() => api(`/projects/${pid}/notice`), [pid, project.data?.team?.length]);
  const [writeBack, setWriteBack] = useState(true);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [openId, setOpenId] = useState(null);

  if (project.error) return <LoadError error={project.error} retry={project.reload} />;
  if (!project.data) return <Loading />;
  const p = project.data;
  const resources = p.team.filter(t => t.as === 'resource');
  const full = resources.length >= p.seatCap;
  const defaults = reference.productTypes.find(t => t.name === p.productType)?.skills || [];
  const isDefault = defaults.length === p.requiredSkills.length && defaults.every(s => p.requiredSkills.includes(s));

  const mutate = async (path, opts, msg) => {
    try {
      const out = await api(path, opts);
      project.setData(out.project || out);
      cands.reload();
      if (msg) notify('success', msg);
      return out;
    } catch (e) { fail(e); }
  };
  const setSkills = list => mutate(`/projects/${pid}`, { method: 'PATCH', body: { requiredSkills: list } });

  const send = async () => {
    setSending(true);
    const out = await mutate(`/projects/${pid}/notify`, { method: 'POST', body: { writeBack } });
    setSending(false);
    if (out) setResult(out);
  };

  return (
    <>
      <PageHeader eyebrow="Staff a project" title={p.name}
        actions={<Select id="pick-project" labelText="Project" hideLabel value={pid} onChange={e => navigate(`/staff/${e.target.value}`)}>
          {staffable.map(o => <SelectItem key={o.id} value={o.id} text={`${o.name}${o.status === 'new' ? ' · new' : ''}`} />)}
        </Select>}>
        {p.client}{p.mondayItemId ? ` · Monday item #${p.mondayItemId}` : ''}. Set what the project needs, pick from who has room, then notify the team.
      </PageHeader>

      <StatRow>
        <Stat value={p.productType || '—'} label="product type (from Monday)" />
        <Stat tone={full ? 'caution' : 'info'} value={`${resources.length}/${p.seatCap}`} label="resource seats filled" />
        <Stat tone="info" value={p.interest.length} label="raised hands" />
        <Stat tone={p.status === 'new' ? 'warn' : undefined} value={p.status === 'new' ? timeLeft(p.interestClosesAt) : STATUS[p.status].label} label={p.status === 'new' ? 'interest window' : 'project state'} />
      </StatRow>

      <div className="two-col">
        <Tile className="section-tile">
          <h2><span className="step">1</span>Required skills</h2>
          <div className="tags">
            {p.requiredSkills.map(s => <DismissibleTag key={s} type="blue" text={s} title={`Remove ${s}`} onClose={() => setSkills(p.requiredSkills.filter(x => x !== s))} />)}
            {!p.requiredSkills.length && <span className="muted">No required skills set.</span>}
          </div>
          <div className="row">
            <Select id="add-skill" size="sm" hideLabel labelText="Add a required skill" value="" onChange={e => e.target.value && setSkills([...p.requiredSkills, e.target.value])}>
              <SelectItem value="" text="Add a skill…" />
              {reference.skills.filter(s => !p.requiredSkills.includes(s.name)).map(s => <SelectItem key={s.name} value={s.name} text={s.name} />)}
            </Select>
            {isDefault ? <span className="muted small">Autofilled from product type <strong>{p.productType}</strong></span>
              : <Button kind="ghost" size="sm" onClick={() => mutate(`/projects/${pid}`, { method: 'PATCH', body: { resetSkills: true } })}>Reset to {p.productType} defaults</Button>}
          </div>
        </Tile>

        <Tile className="section-tile">
          <h2><span className="step">2</span>Team</h2>
          <div className="row-between">
            <div className="seats">
              {Array.from({ length: p.seatCap }, (_, i) => resources[i]
                ? <span key={i} className="seat filled" title={resources[i].name}>{initials(resources[i].name)}</span>
                : <span key={i} className="seat">open</span>)}
            </div>
            <NumberInput id="seat-cap" label="Seat limit" size="sm" min={1} max={20} value={p.seatCap} allowEmpty={false}
              onChange={(_e, { value }) => { const v = Number(value); if (v >= 1 && v !== p.seatCap) mutate(`/projects/${pid}`, { method: 'PATCH', body: { seatCap: v } }); }} />
          </div>
          <p className="muted small">The seat limit caps who joins kickoff calls. Shadows join without taking a seat and aren't tracked against bandwidth.</p>
          {p.team.length ? p.team.map(t => (
            <div key={t.id} className="row-between list-row">
              <Person name={t.name} sub={`${t.as === 'resource' ? 'Resource · tracked' : 'Shadow · open'}${t.source === 'monday' ? ' · on Monday' : ''}`} size="sm" />
              <Button kind="ghost" size="sm" onClick={() => mutate(`/projects/${pid}/assignments/${t.id}`, { method: 'DELETE' })}>Remove</Button>
            </div>
          )) : <Empty>No one placed yet. Pick from the ranked list below.</Empty>}
        </Tile>
      </div>

      <Tile className="section-tile">
        <div className="row-between">
          <h2>Ranked by fit</h2>
          <span className="muted small">Match = 60% required-skill ratings · 30% availability · 10% product interest. Pending ratings count at 80%.</span>
        </div>
        <div className="filters">
          <div className="filter-group"><span className="eyebrow">Rating</span>
            <ContentSwitcher size="sm" selectedIndex={[0, 3, 4].indexOf(filters.minRating)} onChange={({ name }) => setFilters(f => ({ ...f, minRating: Number(name) }))}>
              <Switch name="0" text="Any" /><Switch name="3" text="3+" /><Switch name="4" text="4+" />
            </ContentSwitcher></div>
          <div className="filter-group"><span className="eyebrow">Availability</span>
            <ContentSwitcher size="sm" selectedIndex={[0, 3, 4].indexOf(filters.minAvailability)} onChange={({ name }) => setFilters(f => ({ ...f, minAvailability: Number(name) }))}>
              <Switch name="0" text="Any" /><Switch name="3" text="Some room+" /><Switch name="4" text="Light load+" />
            </ContentSwitcher></div>
          <Checkbox id="hands" labelText="Raised hand only" checked={filters.raisedHandOnly} onChange={(_e, { checked }) => setFilters(f => ({ ...f, raisedHandOnly: checked }))} />
        </div>
        {cands.error ? <LoadError error={cands.error} retry={cands.reload} /> : !cands.data ? <Loading /> :
          cands.data.length === 0 ? <Empty>Nobody matches. Loosen the rating or availability filter.</Empty> :
          <div className="cards">
            {cands.data.map((c, i) => (
              <div key={c.id} className={`cand ${i === 0 ? 'top' : ''}`}>
                <div className="row-between">
                  <Person name={c.name} sub={c.role} />
                  <div className="match"><span>{c.score}%</span><small>match</small></div>
                </div>
                <div className="row-between">
                  <AvailabilityMeter level={c.availability} />
                  <span className="muted small">{c.load.active} active{c.load.onHold ? ` · ${c.load.onHold} on hold` : ''}</span>
                </div>
                <div className="tags">{c.skills.map(s => <SkillTag key={s.skill} {...s} />)}</div>
                <div className="tags">
                  {c.raisedHand && <Tag size="sm" type="purple">Raised hand</Tag>}
                  {c.wantsThisType && <Tag size="sm" type="outline">Wants {p.productType}</Tag>}
                  {c.growthMatch && <Tag size="sm" type="outline">Growth goal fits</Tag>}
                </div>
                <div className="row">
                  <Button size="sm" renderIcon={Add} disabled={full} title={full ? 'All seats filled' : undefined}
                    onClick={() => mutate(`/projects/${pid}/assignments`, { method: 'POST', body: { personId: c.id, kind: 'resource' } }, `${c.name} added as a resource`)}>Resource</Button>
                  <Button size="sm" kind="tertiary"
                    onClick={() => mutate(`/projects/${pid}/assignments`, { method: 'POST', body: { personId: c.id, kind: 'shadow' } }, `${c.name} added as a shadow`)}>Shadow</Button>
                  <Button size="sm" kind="ghost" onClick={() => setOpenId(c.id)}>Profile</Button>
                </div>
              </div>
            ))}
          </div>}
      </Tile>

      <Tile className="section-tile">
        <h2><span className="step">3</span>Notify and kick off</h2>
        {!resources.length ? <Empty>Place at least one resource to draft the notice.</Empty> : <>
          {notice.data && <>
            <p className="muted small">Slack channel <strong>{notice.data.channel}</strong></p>
            <pre className="message">{notice.data.text}</pre>
          </>}
          <Checkbox id="write-back" labelText="Write the team back to the Monday board's People column" checked={writeBack} onChange={(_e, { checked }) => setWriteBack(checked)} />
          <div className="row">
            <Button renderIcon={Send} disabled={sending} onClick={send}>{p.notifiedAt ? 'Send again' : 'Send placement notices'}</Button>
            {p.notifiedAt && <span className="muted small">Last sent {new Date(p.notifiedAt).toLocaleString()}</span>}
          </div>
          {notice.data && !notice.data.slackConfigured && <p className="muted small">Slack isn't connected (SLACK_WEBHOOK_URL), so the message is logged instead of posted.</p>}
          {result && <InlineNotification kind={result.monday?.written === false || !result.slack?.sent ? 'warning' : 'success'} lowContrast
            title="Placement processed" onClose={() => setResult(null)}
            subtitle={[
              result.slack?.sent ? 'Posted to Slack.' : `Slack: ${result.slack?.reason}.`,
              result.monday ? (result.monday.written ? `Monday updated${result.monday.missing?.length ? `; not on Monday yet: ${result.monday.missing.join(', ')}` : ''}.` : `Monday: ${result.monday.reason}`) : ''
            ].join(' ')} />}
          <OpenQuestion>One shared Slack channel per project or individual messages? This version posts one message to the channel webhook.</OpenQuestion>
        </>}
      </Tile>

      {openId && <EngineerModal id={openId} onClose={() => setOpenId(null)} />}
    </>
  );
}
