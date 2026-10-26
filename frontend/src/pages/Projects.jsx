import { useNavigate } from 'react-router-dom';
import { Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tag, Tile } from '@carbon/react';
import { api } from '../api.js';
import { useLoad, useSession } from '../session.jsx';
import { Empty, LoadError, Loading, PageHeader } from '../components.jsx';
import { initials, timeLeft } from '../lib.js';

const GROUPS = [
  ['new', 'Interest open', 'Posted to engineers. The lead picks the team when the window closes.']
];

export default function Projects() {
  const { me } = useSession();
  const navigate = useNavigate();
  const { data, error, loading, reload } = useLoad(() => api('/projects'), []);

  return (
    <>
      <PageHeader eyebrow="From the Monday board" title="Projects">
        Every project comes from the board. Status changes on Monday update here automatically.
      </PageHeader>
      {error ? <LoadError error={error} retry={reload} /> : loading && !data ? <Loading /> : GROUPS.map(([status, title, note]) => {
        const list = data.filter(p => p.status === status);
        return (
          <Tile key={status} className="section-tile">
            <div className="row-between"><h2>{title} <span className="muted num">{list.length}</span></h2><span className="muted small">{note}</span></div>
            {!list.length ? <Empty>Nothing here right now.</Empty> :
              <div className="table-scroll"><Table size="md" aria-label={title}>
                <TableHead><TableRow>
                  <TableHeader>Project</TableHeader><TableHeader>Type</TableHeader><TableHeader>Resources</TableHeader>
                  <TableHeader>Shadows</TableHeader><TableHeader>Seats</TableHeader><TableHeader>Monday</TableHeader>
                  {me.isLead && status !== 'hold' && <TableHeader><span className="cds--visually-hidden">Actions</span></TableHeader>}
                </TableRow></TableHead>
                <TableBody>{list.map(p => (
                  <TableRow key={p.id}>
                    <TableCell><strong>{p.name}</strong><div className="muted small">{p.client}{status === 'new' ? ` · ${timeLeft(p.interestClosesAt)}` : ''}</div></TableCell>
                    <TableCell><Tag size="sm" type="outline">{p.productType || '—'}</Tag></TableCell>
                    <TableCell><Avatars people={p.team.filter(t => t.as === 'resource')} /></TableCell>
                    <TableCell><Avatars people={p.team.filter(t => t.as === 'shadow')} dashed /></TableCell>
                    <TableCell className="num">{p.seatsUsed}/{p.seatCap}</TableCell>
                    <TableCell className="num muted">{p.mondayItemId ? `#${p.mondayItemId}` : '—'}</TableCell>
                    {me.isLead && status !== 'hold' && <TableCell><Button size="sm" kind="tertiary" onClick={() => navigate(`/staff/${p.id}`)}>Staff</Button></TableCell>}
                  </TableRow>
                ))}</TableBody>
              </Table></div>}
          </Tile>
        );
      })}
    </>
  );
}

function Avatars({ people, dashed }) {
  if (!people.length) return <span className="muted">–</span>;
  return <span className="avatars">{people.map(t => <span key={t.id} className={`avatar sm ${dashed ? 'dashed' : ''}`} title={t.name}>{initials(t.name)}</span>)}</span>;
}
