import db from '../config/db.js';
import bcrypt from 'bcryptjs';

async function hashExistingPasswords() {
  try {
    console.log('Fetching users to hash passwords...');
    const result = await db.query('SELECT id, password_hash FROM users');
    
    let updatedCount = 0;

    for (const user of result.rows) {
      // Check if it's already a bcrypt hash (starts with $2a$ or $2b$)
      if (!user.password_hash.startsWith('$2')) {
        console.log(`Hashing password for user ${user.id}...`);
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(user.password_hash, salt);
        
        await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedPassword, user.id]);
        updatedCount++;
      }
    }

    console.log(`Successfully hashed ${updatedCount} passwords.`);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

hashExistingPasswords();
