import { Pool } from 'pg';

// Initialize a connection pool
// For a production app, use process.env.DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/chainland',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (err) {
    console.error('Database query error:', err);
    throw err;
  }
};

export const getClient = () => {
  return pool.connect();
};

export default {
  query,
  getClient
};
