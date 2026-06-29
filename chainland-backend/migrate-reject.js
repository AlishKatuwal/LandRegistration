import db from './config/db.js';

async function migrate() {
  try {
    console.log('Adding rejection_reason column to applications table...');
    await db.query('ALTER TABLE applications ADD COLUMN IF NOT EXISTS rejection_reason TEXT');
    console.log('Successfully updated applications table.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
