import dotenv from 'dotenv';
import { Pool } from 'pg';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  try {
    const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log('Tables:', res.rows.map(r => r.table_name));
    
    // Check columns of parcels
    const cols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'parcels'");
    console.log('Parcels Columns:', cols.rows);
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
check();
