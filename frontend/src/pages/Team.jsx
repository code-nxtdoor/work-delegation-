import { useMemo, useState } from 'react';
import {
  ContentSwitcher, Search, Select, SelectItem, Switch, Table, TableBody, TableCell, TableContainer,
  TableHead, TableHeader, TableRow, Tag, Tile, Toggle
} from '@carbon/react';
import { api } from '../api.js';
import { useLoad, useSession } from '../session.jsx';
import { AvailabilityMeter, Empty, LoadError, Loading, OpenQuestion, PageHeader, Person, Stat, StatRow } from '../components.jsx';
import { plural } from '../lib.js';
import EngineerModal from './EngineerModal.jsx';

export default function Team() {
  const { me, reference, settings, setSettings, notify, fail } = useSession();
  const people = useLoad(() => api('/engineers'), []);
  const newProjects = useLoad(() => api('/projects?status=new'), []);
  const [f, setF] = useState({ q: '', skill: '', av: 0, interest: '', overdue: false });
  const [openId, setOpenId] = useState(null);
  const set = patch => setF(x => ({ ...x, ...patch }));

  const list = useMemo(() => {
    const t = f.q.toLowerCase();
    return (people.data || []).filter(p =>
      (!t || p.name.toLowerCase().includes(t) || (p.skills || []).some(s => s.skill.toLowerCase().includes(t))) &&
      (!f.skill || (p.skills || []).some(s => s.skill === f.skill)) &&
      p.availability >= f.av && (!f.interest || p.interests.includes(f.interest)) && (!f.overdue || p.checkinOverdue));
  }, [people.data, f]);

  const all = people.data || [];
  const seats = (newProjects.data || []).reduce((n, p) => n + Math.max(0, p.seatCap - p.seatsUsed), 0);
  const skillsVisible = me.isLead || settings.skill_visibility === 'all';

  const saveSetting = async patch => {
    try { setSettings(await api('/settings', { method: 'PATCH', body: patch })); people.reload(); notify('success', 'Setting saved'); }
    catch (e) { fail(e); }
  };

  return (
    <>
      <PageHeader eyebrow={`Squad 3 · ${plural(all.length, 'engineer')}`} title="Team bandwidth">
        Who has room, what they're on, and what they want to work on next. On-hold projects are listed but don't count against bandwidth.
      </PageHeader>

      {people.error ? <LoadError error={people.error} retry={people.reload} /> : people.loading && !people.data ? <Loading /> : <>
        <StatRow>
          <Stat tone="ok" value={all.filter(p => p.availability >= 4).length} label="have room (Open or Light load)" />
          <Stat tone="caution" value={all.filter(p => p.availability <= 2).length} label="stretched or full" />
          <Stat tone="warn" value={all.filter(p => p.checkinOverdue).length} label={`check-ins overdue (every ${settings.checkin_days} days)`} />
          <Stat tone="info" value={seats} label={`open seats on ${plural((newProjects.data || []).length, 'new project')}`} />
        </StatRow>

        <TableContainer>
          <div className="filters">
            <Search size="md" labelText="Search engineers" placeholder="Search name or skill" value={f.q} onChange={e => set({ q: e.target.value })} closeButtonLabelText="Clear search" />
            {skillsVisible && <Select id="f-skill" size="md" hideLabel labelText="Skill" value={f.skill} onChange={e => set({ skill: e.target.value })}>
              <SelectItem value="" text="Any skill" />
              {reference.skills.map(s => <SelectItem key={s.name} value={s.name} text={s.name} />)}
            </Select>}
            <Select id="f-av" size="md" hideLabel labelText="Availability" value={f.av} onChange={e => set({ av: Number(e.target.value) })}>
              <SelectItem value={0} text="Any availability" />
              <SelectItem value={3} text="Some room or better" />
              <SelectItem value={4} text="Light load or better" />
            </Select>
            <Select id="f-int" size="md" hideLabel labelText="Product interest" value={f.interest} onChange={e => set({ interest: e.target.value })}>
              <SelectItem value="" text="Any product interest" />
              {reference.productTypes.map(t => <SelectItem key={t.name} value={t.name} text={`Wants ${t.name}`} />)}
            </Select>
            <Toggle id="f-overdue" size="sm" labelText="Check-in overdue" hideLabel labelA="Check-in overdue" labelB="Check-in overdue" toggled={f.overdue} onToggle={v => set({ overdue: v })} />
          </div>
          <div className="table-scroll">
            <Table size="md" aria-label="Engineers">
              <TableHead><TableRow>
                <TableHeader>Engineer</TableHeader><TableHeader>Availability</TableHeader><TableHeader>Projects</TableHeader>
                <TableHeader>Top skills</TableHeader><TableHeader>Wants to work on</TableHeader><TableHeader>Check-in</TableHeader>
              </TableRow></TableHead>
              <TableBody>
                {list.map(p => {
                  const top = (p.skills || []).slice(0, 3);
                  return (
                    <TableRow key={p.id} className="clickable" tabIndex={0} onClick={() => setOpenId(p.id)} onKeyDown={e => e.key === 'Enter' && setOpenId(p.id)}>
                      <TableCell><Person name={p.name} sub={p.role} /></TableCell>
                      <TableCell><AvailabilityMeter level={p.availability} /></TableCell>
                      <TableCell><div className="tags">
                        <Tag size="sm" type="gray">{p.load.active} active</Tag>
                        {p.load.onHold > 0 && <Tag size="sm" type="outline">{p.load.onHold} on hold</Tag>}
                        {p.load.shadowing > 0 && <Tag size="sm" type="outline">{p.load.shadowing} shadowing</Tag>}
                      </div></TableCell>
                      <TableCell>{p.skills === null ? <span className="muted">Leads only</span> :
                        <div className="tags">{top.map(s => <Tag key={s.skill} size="sm" type={s.confirmed ? 'gray' : 'warm-gray'}>{s.skill} {s.rating}</Tag>)}</div>}</TableCell>
                      <TableCell><div className="tags">{p.interests.map(i => <Tag key={i} size="sm" type="outline">{i}</Tag>)}</div></TableCell>
                      <TableCell>{p.checkinOverdue ? <Tag size="sm" type="red">{p.checkinDaysAgo}d · overdue</Tag> : <span className="muted num">{p.checkinDaysAgo}d ago</span>}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {list.length === 0 && <Empty>No engineers match these filters.</Empty>}
          </div>
          {!skillsVisible && <p className="muted small table-note">Skill ratings are visible to engagement leads and managers only.</p>}
        </TableContainer>
      </>}

      {me.isLead && (
        <Tile className="section-tile">
          <h2>Team settings</h2>
          <div className="settings-grid">
            <div className="stack">
              <span className="eyebrow">Who can see skill ratings</span>
              <ContentSwitcher size="md" selectedIndex={settings.skill_visibility === 'all' ? 1 : 0}
                onChange={({ name }) => saveSetting({ skill_visibility: name })}>
                <Switch name="leads" text="Leads & managers" />
                <Switch name="all" text="All of Squad 3" />
              </ContentSwitcher>
              <OpenQuestion>Showing everyone's ratings may create unhealthy competition. The current lean is leads only, pending the wider engineer group.</OpenQuestion>
            </div>
            <div className="stack">
              <Select id="s-cadence" labelText="Availability check-in cadence" value={settings.checkin_days} onChange={e => saveSetting({ checkin_days: Number(e.target.value) })}>
                <SelectItem value={7} text="Weekly" /><SelectItem value={14} text="Every 2 weeks" /><SelectItem value={30} text="Monthly" />
              </Select>
              <Select id="s-window" labelText="Interest window for new projects" value={settings.interest_window_hours} onChange={e => saveSetting({ interest_window_hours: Number(e.target.value) })}>
                <SelectItem value={12} text="12 hours" /><SelectItem value={24} text="24 hours" /><SelectItem value={48} text="48 hours" />
              </Select>
            </div>
          </div>
        </Tile>
      )}

      <Tile className="section-tile">
        <h2>Skills required per role</h2>
        <div className="table-scroll">
          <Table size="sm" aria-label="Role requirements">
            <TableHead><TableRow><TableHeader>Role</TableHeader><TableHeader>Required skills (minimum rating)</TableHeader>{skillsVisible && <TableHeader>Engineers who meet it</TableHeader>}</TableRow></TableHead>
            <TableBody>
              {reference.roles.filter(r => r.requirements.length).map(r => (
                <TableRow key={r.name}>
                  <TableCell><strong>{r.name}</strong></TableCell>
                  <TableCell><div className="tags">{r.requirements.map(q => <Tag key={q.skill} size="sm" type="outline">{q.skill} {q.min}+</Tag>)}</div></TableCell>
                  {skillsVisible && <TableCell className="num">{all.filter(p => r.requirements.every(q => (p.skills || []).some(s => s.skill === q.skill && s.rating >= q.min))).length} of {all.length}</TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Tile>

      {openId && <EngineerModal id={openId} onClose={() => setOpenId(null)} onChanged={people.reload} />}
    </>
  );
}
