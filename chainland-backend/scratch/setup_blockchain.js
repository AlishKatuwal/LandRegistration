import db from '../config/db.js';

async function setupBlockchainTable() {
  try {
    console.log('Initializing Blockchain Ledger Table...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS blockchain_ledger (
        id SERIAL PRIMARY KEY,
        block_height INTEGER NOT NULL,
        application_id VARCHAR(50),
        transaction_type VARCHAR(50),
        data_hash TEXT NOT NULL,
        previous_hash TEXT NOT NULL,
        block_hash TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Blockchain Ledger initialized successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Blockchain Ledger setup failed:', error);
    process.exit(1);
  }
}

setupBlockchainTable();
