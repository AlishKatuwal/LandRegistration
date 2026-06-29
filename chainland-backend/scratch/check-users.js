import dotenv from 'dotenv';
import { Pool } from 'pg';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  try {
    const res = await pool.query("SELECT id, name, role FROM users LIMIT 5");
    console.log('Users:', res.rows);
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
check();
