import express from 'express';
import { generateProof, verifyProof } from '../services/zkp.js';
import db from '../config/db.js';

const router = express.Router();

// POST /api/zkp/generate — Generate a ZKP commitment for ownership
router.post('/generate', async (req, res) => {
  try {
    const { ownerLin, parcelId } = req.body;
    
    if (!ownerLin || !parcelId) {
      return res.status(400).json({ error: 'ownerLin and parcelId are required' });
    }

    const result = await generateProof(ownerLin, parcelId);
    res.json(result);
  } catch (error) {
    console.error('ZKP Generate Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/zkp/verify — Verify a ZKP commitment
router.post('/verify', async (req, res) => {
  try {
    const { proofId, ownerLin, parcelId, secret } = req.body;
    
    if (!proofId || !ownerLin || !parcelId || !secret) {
      return res.status(400).json({ error: 'proofId, ownerLin, parcelId, and secret are all required' });
    }

    const result = await verifyProof(proofId, ownerLin, parcelId, secret);
    res.json(result);
  } catch (error) {
    console.error('ZKP Verify Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/zkp/proofs — List proofs for a user or all proofs
router.get('/proofs', async (req, res) => {
  try {
    const { ownerLin } = req.query;

    // Ensure table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS zkp_proofs (
        id VARCHAR(50) PRIMARY KEY,
        parcel_id VARCHAR(100) NOT NULL,
        owner_lin VARCHAR(50) NOT NULL,
        commitment VARCHAR(64) NOT NULL,
        secret VARCHAR(64) NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        verified_at TIMESTAMP,
        verified_by VARCHAR(50)
      )
    `);

    let query = 'SELECT id, parcel_id, owner_lin, commitment, status, created_at, verified_at FROM zkp_proofs';
    const params = [];
    
    if (ownerLin) {
      query += ' WHERE owner_lin = $1';
      params.push(ownerLin);
    }
    
    query += ' ORDER BY created_at DESC';
    const result = await db.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('ZKP List Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
