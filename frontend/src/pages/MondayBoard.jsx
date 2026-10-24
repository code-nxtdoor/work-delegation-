import { useState } from 'react';
import {
  Button, InlineLoading, InlineNotification, Modal, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tag, TextInput, Tile
} from '@carbon/react';
import { Renew } from '@carbon/icons-react';
import { api } from '../api.js';
import { useLoad, useSession } from '../session.jsx';
import { LoadError, Loading, PageHeader, Stat, StatRow } from '../components.jsx';
import { ago } from '../lib.js';

const KIND_TAG = { sync: 'gray', webhook: 'green', 'write-back': 'blue', notify: 'purple', error: 'red' };
const FIELDS = [
  ['Item name', '(built in)', 'Project name', 'Read'],
  ['client', 'Text', 'Client', 'Read'],
  ['productType', 'Status or dropdown', 'Product type → autofills required skills', 'Read'],
  ['status', 'Status', 'New / In progress / On hold / Done', 'Read + webhook'],
  ['people', 'People', 'Resources on the project', 'Read + write-back'],
  ['timeline', 'Timeline', 'Start and end dates', 'Read'],
  ['seatCap', 'Numbers (optional new column)', 'Kickoff seat limit', 'Read']
];

export default function MondayBoard() {
  const { notify, fail } = useSession();
  const status = useLoad(() => api('/monday/status'), []);
  const events = useLoad(() => api('/monday/events?limit=40'), []);
  const [syncing, setSyncing] = useState(false);
  const [publicUrl, setPublicUrl] = useState('');
  const [hooks, setHooks] = useState(null);
  const [columns, setColumns] = useState(null);

  const s = status.data;
  const sync = async () => {
    setSyncing(true);
    try {
      const r = await api('/monday/sync', { method: 'POST' });
      notify('success', 'Sync complete', `${r.items} items read · ${r.created} new · ${r.changed} status changes`);
    } catch (e) { fail(e); }
    setSyncing(false); status.reload(); events.reload();
  };
  const register = async () => {
    try { setHooks(await api('/monday/webhooks/register', { method: 'POST', body: { publicUrl } })); events.reload(); }
    catch (e) { fail(e); }
  };
  const showColumns = async () => { try { setColumns(await api('/monday/columns')); } catch (e) { fail(e); } };

  return (
    <>
      <PageHeader eyebrow="Integration" title="Monday board"
        actions={s?.connected && (syncing ? <InlineLoading description="Syncing…" /> : <Button renderIcon={Renew} onClick={sync}>Sync now</Button>)}>
        Monday stays the source of truth for projects and who is assigned. This dashboard adds what the board doesn't hold: skills, availability, interests and goals.
      </PageHeader>

      {status.error ? <LoadError error={status.error} retry={status.reload} /> : !s ? <Loading /> : <>
        {!s.connected && <InlineNotification kind="info" lowContrast hideCloseButton title="Monday isn't connected yet"
          subtitle="Set MONDAY_API_TOKEN and MONDAY_BOARD_ID in the API's environment and restart it. Until then the dashboard runs on its own data." />}
        <StatRow>
          <Stat tone={s.connected ? 'ok' : 'warn'} value={s.connected ? 'Connected' : 'Not connected'} label={s.boardId ? `board ${s.boardId}` : 'no board set'} />
          <Stat value={s.projectsFromMonday} label="projects from the board" />
          <Stat value={ago(s.lastSync)} label={`last full sync · every ${s.syncMinutes} min`} />
          <Stat tone="info" value={s.last24h.webhook || 0} label="webhook events, last 24 h" />
        </StatRow>

        <Tile className="section-tile">
          <div className="row-between"><h2>Column mapping</h2>
            {s.connected && <Button kind="ghost" size="sm" onClick={showColumns}>Look up board column IDs</Button>}</div>
          <p className="muted small">Set each column ID in the API's environment (MONDAY_COL_*). Status labels map as: in progress = {s.statusLabels.progress.join(', ')}; on hold = {s.statusLabels.hold.join(', ')}; done = {s.statusLabels.done.join(', ')}; anything else = new.</p>
          <div className="table-scroll"><Table size="sm" aria-label="Column mapping">
            <TableHead><TableRow><TableHeader>Dashboard field</TableHeader><TableHeader>Monday column ID</TableHeader><TableHeader>Column type</TableHeader><TableHeader>Used for</TableHeader><TableHeader>Direction</TableHeader></TableRow></TableHead>
            <TableBody>{FIELDS.map(([key, type, use, dir]) => (
              <TableRow key={key}>
                <TableCell><strong>{key === 'Item name' ? 'name' : key}</strong></TableCell>
                <TableCell className="num">{key === 'Item name' ? '—' : (s.columns[key] || <span className="muted">not set</span>)}</TableCell>
                <TableCell className="muted">{type}</TableCell><TableCell>{use}</TableCell>
                <TableCell><Tag size="sm" type={dir.includes('write') ? 'blue' : dir.includes('webhook') ? 'green' : 'outline'}>{dir}</Tag></TableCell>
              </TableRow>))}
            </TableBody>
          </Table></div>
        </Tile>

        <div className="two-col">
          <Tile className="section-tile">
            <h2>Activity</h2>
            {events.data?.length ? <ul className="event-log">
              {events.data.map(e => (
                <li key={e.id}><span className="muted num">{ago(e.createdAt)}</span><Tag size="sm" type={KIND_TAG[e.kind]}>{e.kind}</Tag><span>{e.message}</span></li>
              ))}</ul> : <p className="muted">No activity yet.</p>}
          </Tile>
          <div className="stack">
            <Tile className="section-tile">
              <h2>Real-time updates</h2>
              <p className="muted small">Subscribes the board's item-created, column-changed, archived and deleted events to this API. The address must be public https (not localhost).</p>
              <TextInput id="public-url" labelText="Public address of this app" placeholder="https://delegation.example.com" value={publicUrl} onChange={e => setPublicUrl(e.target.value)} />
              <Button size="sm" kind="tertiary" disabled={!s.connected || !publicUrl.startsWith('https://')} onClick={register}>Register webhooks</Button>
              {hooks && <ul className="plain-list">{hooks.map(hk => <li key={hk.event}><Tag size="sm" type={hk.ok ? 'green' : 'red'}>{hk.ok ? 'ok' : 'failed'}</Tag> {hk.event}{hk.error ? ` — ${hk.error}` : ''}</li>)}</ul>}
            </Tile>
            <Tile className="section-tile">
              <h2>What lives where</h2>
              <div className="own-grid">
                <div><span className="eyebrow">Monday board owns</span><ul><li>Projects and clients</li><li>Status, including on hold</li><li>Timeline</li><li>Who is assigned</li></ul></div>
                <div><span className="eyebrow">This dashboard owns</span><ul><li>Skill ratings and evidence</li><li>Availability and check-ins</li><li>Interests and goals</li><li>Interest windows</li></ul></div>
              </div>
              <p className="muted small">People are matched to Monday users by work email.</p>
            </Tile>
          </div>
        </div>
      </>}

      {columns && (
        <Modal open passiveModal modalHeading={`Columns on ${columns.name}`} onRequestClose={() => setColumns(null)}>
          <Table size="sm" aria-label="Board columns">
            <TableHead><TableRow><TableHeader>Title</TableHeader><TableHeader>ID</TableHeader><TableHeader>Type</TableHeader></TableRow></TableHead>
            <TableBody>{columns.columns.map(c => <TableRow key={c.id}><TableCell>{c.title}</TableCell><TableCell className="num">{c.id}</TableCell><TableCell>{c.type}</TableCell></TableRow>)}</TableBody>
          </Table>
        </Modal>
      )}
    </>
  );
}
