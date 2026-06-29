import express from 'express';
import db from '../config/db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { userLin, role } = req.query;
    
    // For simplicity, we'll combine applications and disputes as "activities"
    // In a real app, you might have a dedicated activities table
    
    let activitiesQuery = `
      (SELECT id, type, status, submitted_date as date, 'application' as activity_type FROM applications
       WHERE ($1::text IS NULL OR applicant_lin = $1 OR buyer_lin = $1))
      UNION ALL
      (SELECT id, reason as type, phase as status, filed_date as date, 'dispute' as activity_type FROM disputes
       WHERE ($1::text IS NULL OR claimant_lin = $1 OR owner_lin = $1))
      ORDER BY date DESC
      LIMIT 10
    `;
    
    const result = await db.query(activitiesQuery, [userLin || null]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Activities Fetch Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
