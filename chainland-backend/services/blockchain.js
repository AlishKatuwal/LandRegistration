import CryptoJS from 'crypto-js';
import fs from 'fs';
import db from '../config/db.js';

// Hash any JSON data
export const generateHash = (data) => {
  return CryptoJS.SHA256(JSON.stringify(data)).toString();
};

// Hash a file on disk (for document verification)
export const hashFile = (filePath) => {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const wordArray = CryptoJS.lib.WordArray.create(fileBuffer);
    return CryptoJS.SHA256(wordArray).toString();
  } catch (error) {
    console.error('File Hash Error:', error);
    return null;
  }
};

// Anchor a transaction to the blockchain ledger
export const anchorToBlockchain = async (applicationId, type, payload) => {
  try {
    const dataHash = generateHash(payload);
    
    // Get the latest block to get its hash
    const latestRes = await db.query('SELECT block_hash, block_height FROM blockchain_ledger ORDER BY block_height DESC LIMIT 1');
    
    let previousHash = '0'.repeat(64); // Genesis block previous hash
    let nextHeight = 1;
    
    if (latestRes.rowCount > 0) {
      previousHash = latestRes.rows[0].block_hash;
      nextHeight = latestRes.rows[0].block_height + 1;
    }
    
    // Calculate new block hash: Hash(PrevHash + DataHash + Timestamp)
    const timestamp = new Date().toISOString();
    const blockHash = generateHash(previousHash + dataHash + timestamp);
    
    await db.query(
      `INSERT INTO blockchain_ledger (block_height, application_id, transaction_type, data_hash, previous_hash, block_hash, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [nextHeight, applicationId, type, dataHash, previousHash, blockHash, timestamp]
    );
    
    return { success: true, blockHash, blockHeight: nextHeight, dataHash };
  } catch (error) {
    console.error('Blockchain Anchoring Error:', error);
    return { success: false, error };
  }
};

// Verify a single block's integrity
export const verifyBlock = (block) => {
  const expectedHash = generateHash(
    block.previous_hash + block.data_hash + new Date(block.timestamp).toISOString()
  );
  return expectedHash === block.block_hash;
};
