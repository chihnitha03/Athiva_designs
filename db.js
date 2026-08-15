const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || null;
const useSsl = connectionString && process.env.PGSSLMODE !== 'disable';

const pool = new Pool(
  connectionString
    ? {
        connectionString,
        ssl: useSsl ? { rejectUnauthorized: false } : false,
      }
    : {
        user: process.env.PGUSER || 'postgres',
        host: process.env.PGHOST || 'localhost',
        database: process.env.PGDATABASE || 'athiva_db',
        password: process.env.PGPASSWORD || '',
        port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
      }
);

module.exports = pool;
