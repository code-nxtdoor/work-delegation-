import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const env = process.env;
const list = (v, d) => (v ?? d).split(',').map(s => s.trim()).filter(Boolean);

export const config = {
  port: Number(env.PORT || 8080),
  databaseUrl: env.DATABASE_URL || 'postgres://delegation:delegation@localhost:5432/delegation',
  dbSsl: env.DB_SSL === 'true',
  dbDir: env.DB_DIR || path.resolve(here, '../../db'),
  seedDemo: env.SEED_DEMO === 'true',

  // Identity. "dev" trusts an x-user-email header sent by the frontend's "Viewing as" switch.
  // "proxy" trusts the header your SSO proxy sets (for example IBM App ID or oauth2-proxy).
  authMode: env.AUTH_MODE || 'dev',
  authHeader: (env.AUTH_HEADER || 'x-forwarded-email').toLowerCase(),

  monday: {
    apiUrl: env.MONDAY_API_URL || 'https://api.monday.com/v2',
    token: env.MONDAY_API_TOKEN || '',
    apiVersion: env.MONDAY_API_VERSION || '',
    boardId: env.MONDAY_BOARD_ID || '',
    webhookSecret: env.MONDAY_WEBHOOK_SECRET || '',
    syncMinutes: Number(env.MONDAY_SYNC_MINUTES || 15),
    columns: {
      client: env.MONDAY_COL_CLIENT || 'client',
      productType: env.MONDAY_COL_PRODUCT_TYPE || 'product_type',
      status: env.MONDAY_COL_STATUS || 'status',
      people: env.MONDAY_COL_PEOPLE || 'people',
      timeline: env.MONDAY_COL_TIMELINE || 'timeline',
      seatCap: env.MONDAY_COL_SEAT_CAP || ''
    },
    // Board status labels mapped to dashboard states. Anything else counts as "new".
    statusLabels: {
      progress: list(env.MONDAY_STATUS_PROGRESS, 'Working on it,In progress'),
      hold: list(env.MONDAY_STATUS_HOLD, 'On hold,Stuck'),
      done: list(env.MONDAY_STATUS_DONE, 'Done,Closed')
    }
  },

  slackWebhookUrl: env.SLACK_WEBHOOK_URL || ''
};
