import { Button, Modal, Tag } from '@carbon/react';
import { api } from '../api.js';
import { useLoad, useSession } from '../session.jsx';
import { AvailabilityMeter, LoadError, Loading, RatingDots } from '../components.jsx';
import { STATUS } from '../lib.js';

export default function EngineerModal({ id, onClose, onChanged }) {
  const { me, notify, fail } = useSession();
  const { data: p, error, loading, reload, setData } = useLoad(() => api(`/engineers/${id}`), [id]);

  const confirm = async skill => {
    try {
      setData(await api(`/engineers/${id}/skills/${encodeURIComponent(skill)}/confirm`, { method: 'POST' }));
      notify('success', 'Rating confirmed', `${skill} for ${p.name}`);
      onChanged?.();
    } catch (e) { fail(e); }
  };

  return (
    <Modal open passiveModal size="md" modalHeading={p?.name || 'Engineer'} modalLabel={p?.role || ''} onRequestClose={onClose}>
      {loading && !p && <Loading />}
      {error && <LoadError error={error} retry={reload} />}
      {p && (
        <div className="profile-modal">
          <section>
            <h4>Availability</h4>
            <div className="row-between">
              <AvailabilityMeter level={p.availability} />
              {p.checkinOverdue ? <Tag type="red" size="sm">Check-in {p.checkinDaysAgo}d ago · overdue</Tag>
                : <span className="muted">Checked in {p.checkinDaysAgo}d ago</span>}
            </div>
          </section>

          <section>
            <h4>Skills</h4>
            {p.skills === null ? <p className="muted">Skill ratings are visible to leads and managers only.</p> :
              p.skills.length === 0 ? <p className="muted">No skills added yet.</p> :
              <ul className="skill-list">
                {p.skills.map(s => (
                  <li key={s.skill}>
                    <div className="row-between">
                      <span><strong>{s.skill}</strong> <Tag size="sm" type={s.kind === 'client' ? 'teal' : 'outline'}>{s.kind === 'client' ? 'Client work' : `Learning${s.badge ? ' · ' + s.badge : ''}`}</Tag></span>
                      <span className="row">
                        <RatingDots value={s.rating} pending={!s.confirmed} />
                        {s.confirmed ? <span className="muted small">✓ {s.confirmedBy}</span>
                          : me.isLead ? <Button size="sm" kind="tertiary" onClick={() => confirm(s.skill)}>Confirm</Button>
                          : <Tag size="sm" type="warm-gray">Pending</Tag>}
                      </span>
                    </div>
                    {s.evidence && <p className="muted small">{s.evidence}</p>}
                  </li>
                ))}
              </ul>}
          </section>

          <section>
            <h4>Growing into</h4>
            <div className="tags">{p.growth.map(g => <Tag key={g.skill} type="outline" size="sm">{g.skill}{g.learningPath ? ` → ${g.learningPath}` : ''}</Tag>)}</div>
          </section>
          <section>
            <h4>Wants to work on</h4>
            <div className="tags">{p.interests.map(i => <Tag key={i} type="cyan" size="sm">{i}</Tag>)}</div>
          </section>
          {p.goals && <section><h4>Professional goals</h4><p>{p.goals}</p></section>}
          <section>
            <h4>Projects</h4>
            {p.projects.length ? p.projects.map(x => (
              <div key={x.id} className="row-between list-row">
                <span>{x.name} <span className="muted small">· {x.client}</span></span>
                <span className="tags">
                  {x.status === 'hold' && <Tag size="sm" type={STATUS.hold.tag}>On hold</Tag>}
                  <Tag size="sm" type={x.as === 'resource' ? 'green' : 'outline'}>{x.as === 'resource' ? 'Resource' : 'Shadow'}</Tag>
                </span>
              </div>
            )) : <p className="muted">Not on any projects.</p>}
          </section>
        </div>
      )}
    </Modal>
  );
}
