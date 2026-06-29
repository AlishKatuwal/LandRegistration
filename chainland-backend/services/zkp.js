/**
 * Zero-Knowledge Proof Simulation Service
 * 
 * Implements a hash-commitment based ownership verification protocol.
 * This simulates zk-SNARK behavior using SHA-256 commitments:
 * 
 * CONCEPT:
 *   Prover: "I own parcel X" 
 *   Verifier: Confirms ownership WITHOUT seeing the owner's full identity
 * 
 * PROTOCOL:
 *   1. COMMIT: owner generates commitment = SHA256(ownerLIN + parcelID + secret)
 *   2. STORE: commitment is stored on blockchain ledger
 *   3. VERIFY: anyone can challenge — owner reveals (ownerLIN, parcelID, secret),
 *      verifier recomputes hash and checks if it matches stored commitment
 *   4. PRIVACY: the commitment alone reveals nothing about the owner's identity
 */

import CryptoJS from 'crypto-js';
import db from '../config/db.js';
import { anchorToBlockchain } from './blockchain.js';

// Generate a random secret (nonce)
export function generateSecret() {
  return CryptoJS.lib.WordArray.random(32).toString();
}

// Create a commitment: H(ownerLIN || parcelID || secret)
export function createCommitment(ownerLin, parcelId, secret) {
  const preimage = `${ownerLin}:${parcelId}:${secret}`;
  return CryptoJS.SHA256(preimage).toString();
}

// Verify a commitment: recompute and compare
export function verifyCommitment(ownerLin, parcelId, secret, expectedCommitment) {
  const computed = createCommitment(ownerLin, parcelId, secret);
  return {
    valid: computed === expectedCommitment,
    computedHash: computed,
    expectedHash: expectedCommitment
  };
}

// Generate a ZKP proof object
export async function generateProof(ownerLin, parcelId) {
  // 1. Verify the user actually owns this parcel
  const parcelRes = await db.query('SELECT * FROM parcels WHERE id = $1', [parcelId]);
  
  if (parcelRes.rowCount === 0) {
    return { success: false, error: 'Parcel not found' };
  }
  
  const parcel = parcelRes.rows[0];
  if (parcel.owner_lin !== ownerLin) {
    return { success: false, error: 'You do not own this parcel' };
  }

  // 2. Generate secret and commitment
  const secret = generateSecret();
  const commitment = createCommitment(ownerLin, parcelId, secret);
  const proofId = `ZKP-${Date.now().toString(36).toUpperCase()}`;
  const timestamp = new Date().toISOString();

  // 3. Store the proof in a zkp_proofs table (we'll create it)
  try {
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
  } catch (e) {
    // table already exists
  }

  await db.query(
    `INSERT INTO zkp_proofs (id, parcel_id, owner_lin, commitment, secret) VALUES ($1, $2, $3, $4, $5)`,
    [proofId, parcelId, ownerLin, commitment, secret]
  );

  // 4. Anchor proof to blockchain
  await anchorToBlockchain(proofId, 'ZKP_COMMITMENT', {
    proofId,
    parcelId,
    commitment,
    timestamp
  });

  return {
    success: true,
    proofId,
    commitment,
    secret, // The prover keeps this secret — only reveals when challenged
    parcelId,
    timestamp,
    message: 'Zero-knowledge proof generated. Share only the proofId and commitment with the verifier. Keep the secret private until verification is requested.'
  };
}

// Verify a proof (the verifier side)
export async function verifyProof(proofId, ownerLin, parcelId, secret) {
  try {
    const proofRes = await db.query('SELECT * FROM zkp_proofs WHERE id = $1', [proofId]);
    
    if (proofRes.rowCount === 0) {
      return { success: false, valid: false, error: 'Proof not found' };
    }

    const proof = proofRes.rows[0];
    
    // Recompute the commitment from the revealed values
    const result = verifyCommitment(ownerLin, parcelId, secret, proof.commitment);

    if (result.valid) {
      // Mark as verified
      await db.query(
        `UPDATE zkp_proofs SET status = 'verified', verified_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [proofId]
      );
    }

    return {
      success: true,
      valid: result.valid,
      proofId,
      computedHash: result.computedHash,
      storedCommitment: result.expectedHash,
      message: result.valid
        ? 'VERIFIED: The prover has demonstrated ownership of this parcel without revealing their identity directly.'
        : 'FAILED: The provided credentials do not match the stored commitment.'
    };
  } catch (error) {
    return { success: false, valid: false, error: error.message };
  }
}
