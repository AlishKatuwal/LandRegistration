import express from 'express';
import db from '../config/db.js';
import multer from 'multer';
import path from 'path';
import { anchorToBlockchain, hashFile } from '../services/blockchain.js';
import notificationService from '../services/notificationService.js';

const router = express.Router();

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  }
});

const upload = multer({ storage: storage });

// ═══════════════════════════════════════════════════════════
// GET /api/disputes — List disputes (filterable)
// ═══════════════════════════════════════════════════════════
router.get('/', async (req, res) => {
  try {
    const { claimantLin, ownerLin, parcelId, userLin } = req.query;
    let query = `
      SELECT d.*, 
        c.name as claimant_name, o.name as owner_name
      FROM disputes d
      LEFT JOIN users c ON d.claimant_lin = c.id
      LEFT JOIN users o ON d.owner_lin = o.id
    `;
    const params = [];

    if (userLin) {
      query += ' WHERE d.claimant_lin = $1 OR d.owner_lin = $1';
      params.push(userLin);
    } else if (claimantLin) {
      query += ' WHERE d.claimant_lin = $1';
      params.push(claimantLin);
    } else if (ownerLin) {
      query += ' WHERE d.owner_lin = $1';
      params.push(ownerLin);
    } else if (parcelId) {
      query += ' WHERE d.parcel_id = $1';
      params.push(parcelId);
    }

    query += ' ORDER BY d.filed_date DESC';
    const result = await db.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Disputes Fetch Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ═══════════════════════════════════════════════════════════
// POST /api/disputes — Create a dispute (AUTO-LOCKS the parcel)
// ═══════════════════════════════════════════════════════════
router.post('/', upload.any(), async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const { parcel_id, claimant_lin, owner_lin, reason, deadline } = req.body;

    if (!parcel_id || !claimant_lin || !reason) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'parcel_id, claimant_lin, and reason are required' });
    }

    // Verify parcel exists and get current owner
    const parcelRes = await client.query('SELECT * FROM parcels WHERE id = $1', [parcel_id]);
    if (parcelRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Parcel not found' });
    }

    const parcel = parcelRes.rows[0];
    const actualOwner = owner_lin || parcel.owner_lin;

    // Prevent self-disputes
    if (claimant_lin === actualOwner) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cannot file dispute against your own parcel' });
    }

    // Check for existing active dispute on same parcel by same claimant
    const existingRes = await client.query(
      `SELECT id FROM disputes WHERE parcel_id = $1 AND claimant_lin = $2 AND phase NOT IN ('resolved', 'referred')`,
      [parcel_id, claimant_lin]
    );
    if (existingRes.rowCount > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `You already have an active dispute (${existingRes.rows[0].id}) on this parcel` });
    }

    const newId = `DISP-${Math.floor(1000 + Math.random() * 9000)}`;
    const depositAmt = 0;
    const disputeDeadline = deadline || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 90 days

    // Handle uploaded files
    const files = req.files || [];
    const documents = files.map(file => ({
      type: file.fieldname,
      name: file.originalname,
      url: `http://localhost:5001/uploads/${file.filename}`,
      sha256: hashFile(file.path),
      size: file.size,
      uploadedAt: new Date().toISOString()
    }));

    // 1. Create the dispute
    const disputeResult = await client.query(
      `INSERT INTO disputes (id, parcel_id, claimant_lin, owner_lin, reason, deadline, deposit, documents)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [newId, parcel_id, claimant_lin, actualOwner, reason, disputeDeadline, depositAmt, JSON.stringify(documents)]
    );

    // 2. AUTO-LOCK: Set parcel status to 'rokka' (Jagga Rokka — land freeze)
    await client.query(
      `UPDATE parcels SET status = 'rokka', rokka_reason = $1, is_disputed = true WHERE id = $2`,
      [`Dispute filed: ${newId} — ${reason}`, parcel_id]
    );

    // 3. Anchor dispute to blockchain (non-blocking — don't fail the dispute if blockchain has issues)
    try {
      await anchorToBlockchain(newId, 'DISPUTE_FILED', {
        disputeId: newId,
        parcelId: parcel_id,
        claimant: claimant_lin,
        owner: actualOwner,
        reason,
        deposit: depositAmt,
        timestamp: new Date().toISOString()
      });
    } catch (blockchainErr) {
      console.error('Blockchain anchor failed (non-fatal):', blockchainErr.message);
    }

    // 4. Notify both parties
    const notifPayload = [
      [actualOwner, 'DISPUTE_CREATED', 'Dispute Filed Against Your Land', `A dispute (${newId}) has been filed on parcel ${parcel_id}. Your land is now under Jagga Rokka (जग्गा रोक्का).`],
      [claimant_lin, 'DISPUTE_CREATED', 'Dispute Registered', `Your dispute (${newId}) has been registered for parcel ${parcel_id}.`]
    ];

    for (const [lin, type, title, message] of notifPayload) {
      if (lin) {
        await notificationService.createNotification({
          userId: lin,
          type: type,
          message: message,
          referenceId: newId,
          referenceType: 'dispute',
          link: '/citizen/disputes',
          dbClient: client
        });
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, data: disputeResult.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Dispute Create Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    client.release();
  }
});

// ═══════════════════════════════════════════════════════════
// PUT /api/disputes/:id/phase — Advance dispute phase (officer)
// ═══════════════════════════════════════════════════════════
const PHASE_ORDER = ['filing', 'evidence', 'review', 'consent'];

router.put('/:id/phase', async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { nextPhase, remarks } = req.body;

    const disputeRes = await client.query('SELECT * FROM disputes WHERE id = $1', [id]);
    if (disputeRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Dispute not found' });
    }

    const dispute = disputeRes.rows[0];
    const currentIdx = PHASE_ORDER.indexOf(dispute.phase);

    // Validate phase transition
    let targetPhase = nextPhase;
    if (!targetPhase) {
      // Auto-advance to next phase
      if (currentIdx < 0 || currentIdx >= PHASE_ORDER.length - 1) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Cannot advance from phase '${dispute.phase}'. Use /resolve or /refer instead.` });
      }
      targetPhase = PHASE_ORDER[currentIdx + 1];
    }

    // Update phase
    await client.query('UPDATE disputes SET phase = $1 WHERE id = $2', [targetPhase, id]);

    // Notify both parties
    const phaseLabels = { evidence: 'Evidence Collection', review: 'Officer Review', consent: 'Two-Party Consent' };
    const msg = `Dispute ${id} has moved to phase: ${phaseLabels[targetPhase] || targetPhase}. ${remarks || ''}`;
    
    for (const lin of [dispute.claimant_lin, dispute.owner_lin]) {
      if (lin) {
        await notificationService.createNotification({
          userId: lin,
          type: 'DISPUTE_UPDATED',
          message: msg,
          referenceId: id,
          referenceType: 'dispute',
          link: '/citizen/disputes',
          dbClient: client
        });
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, message: `Dispute advanced to '${targetPhase}'`, phase: targetPhase });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Phase Advance Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    client.release();
  }
});

// ═══════════════════════════════════════════════════════════
// PUT /api/disputes/:id/resolve — Resolve dispute (unlocks land)
// ═══════════════════════════════════════════════════════════
router.put('/:id/resolve', async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { resolution, winner } = req.body;
    // winner: 'claimant' or 'owner'
    // returnDeposit: true = return to claimant, false = forfeit

    const disputeRes = await client.query('SELECT * FROM disputes WHERE id = $1', [id]);
    if (disputeRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Dispute not found' });
    }

    const dispute = disputeRes.rows[0];

    if (dispute.phase === 'resolved' || dispute.phase === 'referred') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Dispute is already resolved or referred' });
    }

    // 1. Update dispute phase and deposit status
    const depositStatus = 'n/a';
    await client.query(
      `UPDATE disputes SET phase = 'resolved', deposit_status = $1 WHERE id = $2`,
      [depositStatus, id]
    );

    // 2. If claimant wins, transfer ownership
    if (winner === 'claimant') {
      // Transfer parcel to claimant
      await client.query(
        `UPDATE parcels SET owner_lin = $1, status = 'active', is_disputed = false, rokka_reason = NULL WHERE id = $2`,
        [dispute.claimant_lin, dispute.parcel_id]
      );

      // Record in parcel history
      await client.query(
        `INSERT INTO parcel_history (parcel_id, previous_owner_lin, new_owner_lin, remarks)
         VALUES ($1, $2, $3, $4)`,
        [dispute.parcel_id, dispute.owner_lin, dispute.claimant_lin, `Dispute ${id} resolved in favor of claimant. ${resolution || ''}`]
      );

      // Anchor transfer to blockchain
      await anchorToBlockchain(id + '-RESOLVED', 'DISPUTE_RESOLVED', {
        disputeId: id,
        parcelId: dispute.parcel_id,
        winner: 'claimant',
        newOwner: dispute.claimant_lin,
        previousOwner: dispute.owner_lin,
        resolution,
        timestamp: new Date().toISOString()
      });
    } else {
      // Owner retains — just unlock the parcel
      await client.query(
        `UPDATE parcels SET status = 'active', is_disputed = false, rokka_reason = NULL WHERE id = $1`,
        [dispute.parcel_id]
      );

      await anchorToBlockchain(id + '-RESOLVED', 'DISPUTE_RESOLVED', {
        disputeId: id,
        parcelId: dispute.parcel_id,
        winner: 'owner',
        ownerRetained: dispute.owner_lin,
        resolution,
        timestamp: new Date().toISOString()
      });
    }

    // 3. Notify both parties
    const winnerName = winner === 'claimant' ? 'claimant' : 'current owner';
    for (const lin of [dispute.claimant_lin, dispute.owner_lin]) {
      if (lin) {
        await notificationService.createNotification({
          userId: lin,
          type: 'DISPUTE_RESOLVED',
          message: `Dispute ${id} on parcel ${dispute.parcel_id} has been resolved in favor of the ${winnerName}. Land lock removed. ${resolution || ''}`,
          referenceId: id,
          referenceType: 'dispute',
          link: '/citizen/disputes',
          dbClient: client
        });
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, message: `Dispute resolved in favor of ${winnerName}. Land unlocked.` });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Dispute Resolve Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    client.release();
  }
});

// ═══════════════════════════════════════════════════════════
// PUT /api/disputes/:id/refer — Refer dispute to court
// ═══════════════════════════════════════════════════════════
router.put('/:id/refer', async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { courtName, referralReason } = req.body;

    const disputeRes = await client.query('SELECT * FROM disputes WHERE id = $1', [id]);
    if (disputeRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Dispute not found' });
    }

    const dispute = disputeRes.rows[0];

    // Update phase — land stays locked during court proceedings
    await client.query(`UPDATE disputes SET phase = 'referred' WHERE id = $1`, [id]);

    // Anchor to blockchain
    await anchorToBlockchain(id + '-REFERRED', 'DISPUTE_COURT_REFERRAL', {
      disputeId: id,
      parcelId: dispute.parcel_id,
      courtName: courtName || 'District Court',
      reason: referralReason,
      timestamp: new Date().toISOString()
    });

    // Notify both parties
    for (const lin of [dispute.claimant_lin, dispute.owner_lin]) {
      if (lin) {
        await notificationService.createNotification({
          userId: lin,
          type: 'DISPUTE_UPDATED',
          message: `Dispute ${id} on parcel ${dispute.parcel_id} has been referred to ${courtName || 'District Court'}. Land remains under Jagga Rokka until court verdict. ${referralReason || ''}`,
          referenceId: id,
          referenceType: 'dispute',
          link: '/citizen/disputes',
          dbClient: client
        });
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, message: `Dispute referred to ${courtName || 'District Court'}. Land remains locked.` });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Dispute Refer Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    client.release();
  }
});

// ═══════════════════════════════════════════════════════════
// GET /api/disputes/:id/report — Generate dispute analysis report
// ═══════════════════════════════════════════════════════════
router.get('/:id/report', async (req, res) => {
  try {
    const { id } = req.params;

    const disputeRes = await db.query(`
      SELECT d.*, 
        c.name as claimant_name, c.citizenship_no as claimant_citizenship,
        o.name as owner_name, o.citizenship_no as owner_citizenship
      FROM disputes d
      LEFT JOIN users c ON d.claimant_lin = c.id
      LEFT JOIN users o ON d.owner_lin = o.id
      WHERE d.id = $1
    `, [id]);

    if (disputeRes.rowCount === 0) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    const dispute = disputeRes.rows[0];
    const parcelRes = await db.query('SELECT * FROM parcels WHERE id = $1', [dispute.parcel_id]);
    const parcel = parcelRes.rowCount > 0 ? parcelRes.rows[0] : null;

    const historyRes = await db.query(`
      SELECT ph.*, 
        prev.name as prev_name, curr.name as curr_name
      FROM parcel_history ph
      LEFT JOIN users prev ON ph.previous_owner_lin = prev.id
      LEFT JOIN users curr ON ph.new_owner_lin = curr.id
      WHERE ph.parcel_id = $1
      ORDER BY ph.transfer_date ASC
    `, [dispute.parcel_id]);

    const blockRes = await db.query(
      'SELECT * FROM blockchain_ledger WHERE application_id = $1 ORDER BY block_height ASC',
      [id]
    );

    const transfers = historyRes.rows;
    const rapidTransfers = [];
    for (let i = 1; i < transfers.length; i++) {
      const prev = new Date(transfers[i - 1].transfer_date);
      const curr = new Date(transfers[i].transfer_date);
      const daysBetween = (curr - prev) / (1000 * 60 * 60 * 24);
      if (daysBetween < 30) {
        rapidTransfers.push({
          from: transfers[i - 1].curr_name || transfers[i - 1].new_owner_lin,
          to: transfers[i].curr_name || transfers[i].new_owner_lin,
          days: Math.round(daysBetween),
          date: transfers[i].transfer_date
        });
      }
    }

    const report = {
      title: `Dispute Analysis Report — ${id}`,
      generatedAt: new Date().toISOString(),
      generatedBy: 'ChainLand Dispute Resolution Engine',
      dispute: {
        id: dispute.id, parcelId: dispute.parcel_id, phase: dispute.phase,
        reason: dispute.reason, filedDate: dispute.filed_date,
        deadline: dispute.deadline, deposit: dispute.deposit, depositStatus: dispute.deposit_status
      },
      parties: {
        claimant: { lin: dispute.claimant_lin, name: dispute.claimant_name || 'Unknown', citizenship: dispute.claimant_citizenship || 'N/A' },
        owner: { lin: dispute.owner_lin, name: dispute.owner_name || 'Unknown', citizenship: dispute.owner_citizenship || 'N/A' }
      },
      parcel: parcel ? {
        id: parcel.id, district: parcel.district, municipality: parcel.municipality,
        ward: parcel.ward, area: parcel.area, landClass: parcel.land_class,
        status: parcel.status, isDisputed: parcel.is_disputed, rokkaReason: parcel.rokka_reason
      } : null,
      ownershipHistory: transfers.map(t => ({
        from: t.prev_name || t.previous_owner_lin || 'Initial Registration',
        to: t.curr_name || t.new_owner_lin, date: t.transfer_date,
        applicationId: t.application_id, remarks: t.remarks
      })),
      blockchainEvidence: blockRes.rows.map(b => ({
        blockHeight: b.block_height, blockHash: b.block_hash,
        dataHash: b.data_hash, type: b.transaction_type, timestamp: b.timestamp
      })),
      riskAnalysis: {
        rapidTransfers, totalOwnerChanges: transfers.length,
        landCurrentlyLocked: parcel?.status === 'rokka',
        hasBlockchainProof: blockRes.rowCount > 0,
        riskLevel: rapidTransfers.length > 0 ? 'HIGH' : (transfers.length > 3 ? 'MEDIUM' : 'LOW')
      }
    };

    res.json({ success: true, report });
  } catch (error) {
    console.error('Report Generation Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
