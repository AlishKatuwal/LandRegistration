import db from '../config/db.js';

async function migrate() {
  try {
    console.log('Adding payment columns to applications table...');
    await db.query(`
      ALTER TABLE applications 
      ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'unpaid',
      ADD COLUMN IF NOT EXISTS payment_details JSONB;
    `);
    console.log('Migration successful!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
