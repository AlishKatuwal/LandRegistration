import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('🔄 Running notification system migration...\n');

    // Add reference_id column
    await client.query(`
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS reference_id VARCHAR(100)
    `);
    console.log('✅ Added reference_id column');

    // Add reference_type column
    await client.query(`
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS reference_type VARCHAR(50)
    `);
    console.log('✅ Added reference_type column');

    // Add updated_at column
    await client.query(`
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `);
    console.log('✅ Added updated_at column');

    // Create index for fast user notification queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
      ON notifications (user_lin, is_read, created_at DESC)
    `);
    console.log('✅ Created index on (user_lin, is_read, created_at)');

    // Create index for reference lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_reference 
      ON notifications (reference_id, reference_type)
    `);
    console.log('✅ Created index on (reference_id, reference_type)');

    console.log('\n🎉 Notification migration complete!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
