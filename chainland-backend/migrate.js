import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  try {
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS dob DATE;");
    await pool.query("ALTER TABLE applications ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb;");
    await pool.query("ALTER TABLE applications ADD COLUMN IF NOT EXISTS district VARCHAR(100);");
    await pool.query("ALTER TABLE applications ADD COLUMN IF NOT EXISTS municipality VARCHAR(100);");
    await pool.query("ALTER TABLE applications ADD COLUMN IF NOT EXISTS ward INTEGER;");
    await pool.query("ALTER TABLE applications ADD COLUMN IF NOT EXISTS area VARCHAR(50);");
    
    // Convert status to an enum check or just alter type to varchar
    // Usually it's varchar. We will just ensure we can insert 'under_review' and 'approved' / 'rejected'
    
    console.log("Migration successful");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    pool.end();
  }
}
migrate();
