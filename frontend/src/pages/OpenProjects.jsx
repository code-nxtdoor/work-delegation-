import { Button, Tag, Tile } from '@carbon/react';
import { api } from '../api.js';
import { useLoad, useSession } from '../session.jsx';
import { Empty, LoadError, Loading, OpenQuestion, PageHeader } from '../components.jsx';
import { plural, timeLeft } from '../lib.js';

export default function OpenProjects() {
  const { me, notify, fail } = useSession();
  const { data, error, loading, reload, setData } = useLoad(() => api('/projects?status=new'), []);

  const toggle = async p => {
    try {
      const updated = await api(`/projects/${p.id}/interest`, { method: p.iRaisedHand ? 'DELETE' : 'POST' });
      setData(list => list.map(x => (x.id === p.id ? updated : x)));
      notify('success', updated.iRaisedHand ? 'Interest sent' : 'Interest withdrawn', updated.iRaisedHand ? `The lead will see you're interested in ${p.name}.` : undefined);
    } catch (e) { fail(e); }
  };

  return (
    <>
      <PageHeader eyebrow="New on the Monday board" title="Open projects">
        Raise your hand within the interest window. The lead filters by skills and bandwidth, then you're notified if you're placed.
      </PageHeader>
      {error ? <LoadError error={error} retry={reload} /> : loading && !data ? <Loading /> :
        !data.length ? <Empty>No open projects right now. You'll get a message when one is posted.</Empty> :
        data.map(p => (
          <Tile key={p.id} className="section-tile">
            <div className="row-between">
              <div><h2>{p.name}</h2><span className="muted small">{p.client} · {p.productType} · {plural(p.seatCap, 'seat')}</span></div>
              <Tag type={p.interestOpen ? 'purple' : 'gray'}>{timeLeft(p.interestClosesAt)}</Tag>
            </div>
            <div className="tags">{p.requiredSkills.map(s => {
              const mine = me.skills.find(x => x.skill === s);
              return <Tag key={s} size="sm" type={mine ? (mine.rating >= 3 ? 'green' : 'warm-gray') : 'outline'}>{s} · you {mine ? mine.rating : '–'}</Tag>;
            })}</div>
            <div className="row">
              <Button size="sm" kind={p.iRaisedHand ? 'secondary' : 'primary'} disabled={!p.interestOpen && !p.iRaisedHand} onClick={() => toggle(p)}>
                {p.iRaisedHand ? 'Withdraw interest' : "I'm interested"}
              </Button>
              <span className="muted small">{plural(p.interestCount, 'engineer')} raised a hand</span>
            </div>
          </Tile>
        ))}
      <OpenQuestion>Slack bot or email for new-project alerts? If someone misses the window, they message the lead directly; if everyone raises a hand, the ranking and filters narrow the pool.</OpenQuestion>
    </>
  );
}
