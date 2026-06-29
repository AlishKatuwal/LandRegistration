import express from 'express';
import db from '../config/db.js';
import { generateHash } from '../services/blockchain.js';

const router = express.Router();

// GET /api/blockchain — Full ledger
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM blockchain_ledger ORDER BY block_height DESC');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Blockchain Ledger Fetch Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/blockchain/verify — Walk the entire chain and verify integrity
router.get('/verify', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM blockchain_ledger ORDER BY block_height ASC');
    const blocks = result.rows;

    if (blocks.length === 0) {
      return res.json({ success: true, valid: true, message: 'Chain is empty', blocks: 0 });
    }

    const issues = [];

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];

      // 1. Verify block hash = Hash(prevHash + dataHash + timestamp)
      const expectedBlockHash = generateHash(
        block.previous_hash + block.data_hash + new Date(block.timestamp).toISOString()
      );

      if (block.block_hash !== expectedBlockHash) {
        issues.push({
          block: block.block_height,
          type: 'BLOCK_HASH_MISMATCH',
          message: `Block #${block.block_height} hash does not match computed hash. Possible tampering.`,
          expected: expectedBlockHash,
          actual: block.block_hash
        });
      }

      // 2. Verify chain linkage (prev_hash of block N+1 === block_hash of block N)
      if (i > 0) {
        const prevBlock = blocks[i - 1];
        if (block.previous_hash !== prevBlock.block_hash) {
          issues.push({
            block: block.block_height,
            type: 'CHAIN_LINK_BROKEN',
            message: `Block #${block.block_height} previous_hash does not match Block #${prevBlock.block_height} block_hash. Chain is broken.`
          });
        }
      } else {
        // Genesis block: previous_hash should be all zeros
        if (block.previous_hash !== '0'.repeat(64)) {
          issues.push({
            block: block.block_height,
            type: 'GENESIS_INVALID',
            message: `Genesis block has invalid previous_hash.`
          });
        }
      }
    }

    res.json({
      success: true,
      valid: issues.length === 0,
      totalBlocks: blocks.length,
      issues,
      lastBlock: blocks[blocks.length - 1],
      verifiedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Chain Verification Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/blockchain/block/:appId — Get block for a specific application
router.get('/block/:appId', async (req, res) => {
  try {
    const { appId } = req.params;
    const result = await db.query(
      'SELECT * FROM blockchain_ledger WHERE application_id = $1 ORDER BY block_height DESC',
      [appId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'No blockchain record found for this application' });
    }
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Block Fetch Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
