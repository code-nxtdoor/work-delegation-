import { config } from './config.js';
import { one } from './db.js';

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

/** Wrap async route handlers so thrown errors reach the error middleware. */
export const h = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/**
 * Resolve the signed-in person.
 * dev mode:   the frontend sends x-user-email (the "Viewing as" switch). Never use in production.
 * proxy mode: an SSO proxy in front of the API sets AUTH_HEADER after authenticating the user.
 */
export const identify = h(async (req, _res, next) => {
  const header = config.authMode === 'dev' ? 'x-user-email' : config.authHeader;
  const email = String(req.headers[header] || '').trim().toLowerCase();
  if (!email) throw new HttpError(401, 'Not signed in.');
  const me = await one(
    'SELECT id, email, name, role, is_lead, is_engineer FROM people WHERE lower(email) = $1', [email]);
  if (!me) throw new HttpError(403, `No dashboard profile for ${email}. Ask an engagement lead to add you.`);
  req.me = me;
  next();
});

export function requireLead(req, _res, next) {
  if (!req.me?.is_lead) return next(new HttpError(403, 'Only engagement leads and managers can do this.'));
  next();
}

/** Engineers can edit their own profile; leads can edit anyone's. */
export function selfOrLead(req, id) {
  if (req.me.is_lead || req.me.id === Number(id)) return;
  throw new HttpError(403, 'You can only change your own profile.');
}
