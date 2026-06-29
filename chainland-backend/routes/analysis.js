import express from 'express';
import db from '../config/db.js';

const router = express.Router();

// GET /api/analysis/fraud-detection — BFS/DFS ownership graph analysis
router.get('/fraud-detection', async (req, res) => {
  try {
    // Fetch all ownership transfers
    const historyRes = await db.query(`
      SELECT ph.*, 
        prev.name as prev_owner_name, 
        curr.name as new_owner_name
      FROM parcel_history ph
      LEFT JOIN users prev ON ph.prev_owner_lin = prev.id
      LEFT JOIN users curr ON ph.new_owner_lin = curr.id
      ORDER BY ph.transfer_date ASC
    `);
    const transfers = historyRes.rows;

    const alerts = [];

    // ===== ALGORITHM 1: Build Ownership Graph + BFS for Circular Ownership =====
    // Build adjacency list: owner -> [owners they transferred to]
    const graph = {};
    const reverseGraph = {};

    transfers.forEach(t => {
      if (t.prev_owner_lin && t.new_owner_lin) {
        if (!graph[t.prev_owner_lin]) graph[t.prev_owner_lin] = [];
        graph[t.prev_owner_lin].push({
          to: t.new_owner_lin,
          parcel: t.parcel_id,
          date: t.transfer_date,
          appId: t.application_id
        });

        if (!reverseGraph[t.new_owner_lin]) reverseGraph[t.new_owner_lin] = [];
        reverseGraph[t.new_owner_lin].push({
          from: t.prev_owner_lin,
          parcel: t.parcel_id,
          date: t.transfer_date
        });
      }
    });

    // BFS: Detect circular ownership (A -> B -> C -> A)
    const visited = new Set();
    Object.keys(graph).forEach(startNode => {
      const queue = [{ node: startNode, path: [startNode] }];
      const localVisited = new Set();

      while (queue.length > 0) {
        const { node, path } = queue.shift();

        if (localVisited.has(node) && node === startNode && path.length > 2) {
          alerts.push({
            type: 'CIRCULAR_OWNERSHIP',
            severity: 'critical',
            message: `Circular ownership detected: ${path.join(' → ')}`,
            path,
            detectedAt: new Date().toISOString()
          });
          break;
        }

        localVisited.add(node);

        (graph[node] || []).forEach(edge => {
          if (!localVisited.has(edge.to) || edge.to === startNode) {
            queue.push({ node: edge.to, path: [...path, edge.to] });
          }
        });
      }
    });

    // ===== ALGORITHM 2: Rapid Transfer Detection =====
    // Group transfers by parcel
    const parcelTransfers = {};
    transfers.forEach(t => {
      if (!parcelTransfers[t.parcel_id]) parcelTransfers[t.parcel_id] = [];
      parcelTransfers[t.parcel_id].push(t);
    });

    Object.entries(parcelTransfers).forEach(([parcelId, txns]) => {
      for (let i = 1; i < txns.length; i++) {
        const prev = new Date(txns[i - 1].transfer_date);
        const curr = new Date(txns[i].transfer_date);
        const daysBetween = (curr - prev) / (1000 * 60 * 60 * 24);

        if (daysBetween < 30) {
          alerts.push({
            type: 'RAPID_TRANSFER',
            severity: 'high',
            message: `Parcel ${parcelId} transferred twice within ${Math.round(daysBetween)} days`,
            parcelId,
            transfers: [
              { from: txns[i - 1].prev_owner_name, to: txns[i - 1].new_owner_name, date: txns[i - 1].transfer_date },
              { from: txns[i].prev_owner_name, to: txns[i].new_owner_name, date: txns[i].transfer_date }
            ],
            detectedAt: new Date().toISOString()
          });
        }
      }
    });

    // ===== ALGORITHM 3: Multiple Owner Detection (DFS) =====
    // Check if any parcel currently has claims from multiple people via disputes
    const disputeRes = await db.query(`
      SELECT d.parcel_id, d.claimant_lin, d.owner_lin, d.phase, d.reason,
        c.name as claimant_name, o.name as owner_name
      FROM disputes d
      LEFT JOIN users c ON d.claimant_lin = c.id
      LEFT JOIN users o ON d.owner_lin = o.id
      WHERE d.phase NOT IN ('resolved', 'referred')
    `);

    disputeRes.rows.forEach(d => {
      alerts.push({
        type: 'MULTIPLE_CLAIMANTS',
        severity: 'medium',
        message: `Parcel ${d.parcel_id} has an active ownership dispute between ${d.owner_name || d.owner_lin} and ${d.claimant_name || d.claimant_lin}`,
        parcelId: d.parcel_id,
        claimant: d.claimant_name || d.claimant_lin,
        owner: d.owner_name || d.owner_lin,
        phase: d.phase,
        detectedAt: new Date().toISOString()
      });
    });

    // ===== ALGORITHM 4: Concentration Analysis =====
    // Flag users who own too many parcels (potential land grabbing)
    const ownerRes = await db.query(`
      SELECT owner_lin, COUNT(*) as parcel_count, u.name 
      FROM parcels p
      LEFT JOIN users u ON p.owner_lin = u.id
      GROUP BY owner_lin, u.name
      HAVING COUNT(*) > 5
    `);

    ownerRes.rows.forEach(o => {
      alerts.push({
        type: 'CONCENTRATION',
        severity: 'low',
        message: `${o.name || o.owner_lin} owns ${o.parcel_count} parcels — potential land concentration`,
        ownerLin: o.owner_lin,
        count: parseInt(o.parcel_count),
        detectedAt: new Date().toISOString()
      });
    });

    res.json({
      success: true,
      totalTransfers: transfers.length,
      uniqueParcels: Object.keys(parcelTransfers).length,
      graphNodes: Object.keys(graph).length,
      alerts: alerts.sort((a, b) => {
        const sev = { critical: 0, high: 1, medium: 2, low: 3 };
        return (sev[a.severity] || 4) - (sev[b.severity] || 4);
      }),
      analyzedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Fraud Analysis Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
