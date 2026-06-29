import db from '../config/db.js';

async function migrate() {
  try {
    console.log('Adding documents column to disputes table...');
    await db.query('ALTER TABLE disputes ADD COLUMN IF NOT EXISTS documents JSONB');
    console.log('✅ Column added successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrate();
