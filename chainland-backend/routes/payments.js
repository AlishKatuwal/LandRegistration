import express from 'express';
import db from '../config/db.js';

const router = express.Router();

// Record a payment
router.post('/', async (req, res) => {
  try {
    const data = req.body;
    const query = `
      INSERT INTO payments (
        user_lin, parcel_id, amount, type, status, method, transaction_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const params = [
      data.userLin, data.parcelId, data.amount, data.type, 
      data.status || 'success', data.method, data.transactionId
    ];
    const result = await db.query(query, params);
    
    // If it's a Tiro payment, update the parcel status
    if (data.type === 'tiro') {
      await db.query(
        `UPDATE parcels SET tiro_status = 'paid', last_tiro_paid = CURRENT_DATE WHERE id = $1`,
        [data.parcelId]
      );
    }

    return res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Payment Recording Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Fetch user payments
router.get('/', async (req, res) => {
  try {
    const { userLin } = req.query;
    const query = 'SELECT * FROM payments WHERE user_lin = $1 ORDER BY created_at DESC';
    const result = await db.query(query, [userLin]);
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Payments Fetch Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
