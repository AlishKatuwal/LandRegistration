import fs from 'fs';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initDB() {
  try {
    console.log('Connecting to database...');
    
    // Read and execute schema
    const schemaPath = path.resolve('schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Creating tables...');
    await pool.query(schemaSql);
    console.log('✅ Tables created successfully.');

    // Insert mock users if they don't exist
    console.log('Inserting mock users...');
    
    const users = [
      {
        id: 'GOV-2081-001',
        name: 'Super Admin Officer',
        name_np: 'सुपर एडमिन',
        role: 'officer',
        password_hash: 'admin123',
        email: 'officer@chainland.gov.np',
        office: 'KTM HQ'
      },
      {
        id: 'LIN-07801234',
        name: 'Ram Bahadur Shrestha',
        name_np: 'राम बहादुर श्रेष्ठ',
        role: 'citizen',
        password_hash: 'citizen123',
        email: 'ram@example.com',
        citizenship_no: '27-01-78-12345'
      }
    ];

    for (const user of users) {
      await pool.query(`
        INSERT INTO users (id, name, name_np, role, password_hash, email, office, citizenship_no)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO NOTHING
      `, [user.id, user.name, user.name_np, user.role, user.password_hash, user.email, user.office, user.citizenship_no]);
    }

    console.log('✅ Mock users inserted.');

    // Insert a mock parcel for the citizen
    await pool.query(`
      INSERT INTO parcels (id, district, municipality, ward, area, area_unit, land_class, land_type, owner_lin, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO NOTHING
    `, ['KTM-NPL-03-1042', 'Kathmandu', 'Kathmandu Met', 3, '0-4-2-0', 'ropani', 'Residential', 'Raikar', 'LIN-07801234', 'active']);

    console.log('✅ Mock parcel inserted.');

    console.log('🎉 Database initialization complete!');
  } catch (error) {
    console.error('❌ Database Initialization Failed:', error);
  } finally {
    await pool.end();
  }
}

initDB();
