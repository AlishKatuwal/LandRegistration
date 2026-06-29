import express from 'express';
import db from '../config/db.js';

const router = express.Router();

router.get('/:parcelId', async (req, res) => {
  try {
    const { parcelId } = req.params;
    const query = `
      SELECT h.*, u1.name as prev_owner_name, u2.name as new_owner_name
      FROM parcel_history h
      LEFT JOIN users u1 ON h.previous_owner_lin = u1.id
      LEFT JOIN users u2 ON h.new_owner_lin = u2.id
      WHERE h.parcel_id = $1
      ORDER BY h.transfer_date DESC
    `;
    const result = await db.query(query, [parcelId]);
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Parcel History Fetch Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
