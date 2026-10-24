import { migrate, pool } from './db.js';

migrate()
  .then(() => console.log('migrations complete'))
  .catch(err => { console.error(err); process.exitCode = 1; })
  .finally(() => pool.end());
