import dotenv from 'dotenv';
import { Pool } from 'pg';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  try {
    const res = await pool.query("SELECT * FROM parcels WHERE id = 'LOL'");
    console.log('Parcel LOL:', res.rows);
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
check();
