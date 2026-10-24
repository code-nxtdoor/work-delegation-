import { InlineNotification, SkeletonText, Tag } from '@carbon/react';
import { AVAILABILITY, initials } from './lib.js';

export function PageHeader({ eyebrow, title, children, actions }) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {children && <p className="page-sub">{children}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

export function AvailabilityMeter({ level, showLabel = true }) {
  const a = AVAILABILITY[level];
  return (
    <span className="avail" title={`Availability: ${a.label}`}>
      <span className={`meter tone-${a.tone}`} aria-hidden="true">
        {[1, 2, 3, 4, 5].map(i => <i key={i} className={i <= level ? 'on' : ''} />)}
      </span>
      {showLabel ? <span>{a.label}</span> : <span className="cds--visually-hidden">{a.label}</span>}
    </span>
  );
}

export function RatingDots({ value, pending }) {
  return (
    <span className={`dots ${pending ? 'pending' : ''}`} role="img" aria-label={`${value} of 5${pending ? ', pending review' : ''}`}>
      {[1, 2, 3, 4, 5].map(i => <i key={i} className={i <= value ? 'on' : ''} />)}
    </span>
  );
}

/** Editable 1-5 rating as a row of radio buttons */
export function RatingInput({ id, value, onChange, pending }) {
  return (
    <fieldset className={`rating-input ${pending ? 'pending' : ''}`}>
      <legend className="cds--visually-hidden">Rating</legend>
      {[1, 2, 3, 4, 5].map(i => (
        <label key={i} title={`${i} of 5`}>
          <input type="radio" name={id} value={i} checked={value === i} onChange={() => onChange(i)} />
          <i className={i <= value ? 'on' : ''} />
          <span className="cds--visually-hidden">{i}</span>
        </label>
      ))}
    </fieldset>
  );
}

export function Person({ name, sub, size = 'md' }) {
  return (
    <span className={`person person-${size}`}>
      <span className="avatar" aria-hidden="true">{initials(name)}</span>
      <span className="person-text"><strong>{name}</strong>{sub && <small>{sub}</small>}</span>
    </span>
  );
}

export function Stat({ value, label, tone }) {
  return (
    <div className={`stat ${tone ? 'tone-' + tone : ''}`}>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

export const StatRow = ({ children }) => <section className="stat-row">{children}</section>;

export function SkillTag({ skill, rating, confirmed, size = 'sm' }) {
  if (rating == null) return <Tag type="outline" size={size}>{skill} –</Tag>;
  return (
    <Tag type={confirmed ? 'green' : 'warm-gray'} size={size} title={confirmed ? 'Confirmed by a manager' : 'Pending manager review'}>
      {skill} {rating}{confirmed ? ' ✓' : ''}
    </Tag>
  );
}

export function OpenQuestion({ children }) {
  return <p className="open-question"><strong>Open question.</strong> {children}</p>;
}

export function Loading() {
  return <div className="loading-block"><SkeletonText paragraph lineCount={4} /></div>;
}

export function LoadError({ error, retry }) {
  return (
    <InlineNotification kind="error" lowContrast hideCloseButton title="Couldn't load this"
      subtitle={<>{error}{retry && <> · <button className="link-btn" onClick={retry}>Try again</button></>}</>} />
  );
}

export const Empty = ({ children }) => <div className="empty">{children}</div>;
