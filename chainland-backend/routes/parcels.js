import express from 'express';
import db from '../config/db.js';
import { polygonsOverlap, findNearbyParcels, rdpSimplify, polygonCentroid, haversineDistance } from '../services/geometry.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { ownerLin, status } = req.query;

    let query = 'SELECT * FROM parcels';
    const params = [];

    if (ownerLin && status) {
       query += ' WHERE owner_lin = $1 AND status = $2';
       params.push(ownerLin, status);
    } else if (ownerLin) {
       query += ' WHERE owner_lin = $1';
       params.push(ownerLin);
    } else if (status) {
       query += ' WHERE status = $1';
       params.push(status);
    }

    query += ' ORDER BY id DESC';

    const result = await db.query(query, params);

    return res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Parcels Fetch Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const query = 'SELECT * FROM parcels WHERE id = $1';
    const result = await db.query(query, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Parcel not found' });
    }

    return res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Parcel Fetch Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const data = req.body;
    
    const coordinates = JSON.stringify(data.coordinates || []);

    const query = `
      INSERT INTO parcels (
        id, district, municipality, ward, area, area_unit, area_sqm, 
        land_class, land_type, owner_lin, coordinates, registered_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_DATE)
      RETURNING *
    `;

    const params = [
      data.id, data.district, data.municipality, data.ward, data.area, 
      data.areaUnit || 'ropani', data.areaSqm, data.landClass, data.landType, 
      data.ownerLin, coordinates
    ];

    const result = await db.query(query, params);
    return res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Parcels Create Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.put('/:id/tiro', async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      UPDATE parcels 
      SET tiro_status = 'paid', last_tiro_paid = CURRENT_DATE 
      WHERE id = $1 
      RETURNING *
    `;
    const result = await db.query(query, [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Parcel not found' });
    }
    
    return res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Tiro Update Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ═══════════════════════════════════════════════════════════
// GIS Module: Polygon Overlap Detection
// ═══════════════════════════════════════════════════════════
router.post('/check-overlap', async (req, res) => {
  try {
    const { polygon, excludeParcelId } = req.body;
    
    if (!polygon || polygon.length < 3) {
      return res.status(400).json({ error: 'Polygon must have at least 3 points' });
    }

    // Fetch all parcels with coordinates + owner details
    const result = await db.query(`
      SELECT p.id, p.district, p.municipality, p.ward, p.area, p.status, 
             p.owner_lin, p.coordinates, p.registered_date, p.land_class,
             u.name as owner_name, u.citizenship_no as owner_citizenship, u.phone as owner_phone
      FROM parcels p
      LEFT JOIN users u ON p.owner_lin = u.id
      WHERE p.coordinates IS NOT NULL
    `);
    
    const conflicts = [];
    for (const parcel of result.rows) {
      if (parcel.id === excludeParcelId) continue;
      
      const coords = typeof parcel.coordinates === 'string' 
        ? JSON.parse(parcel.coordinates) 
        : parcel.coordinates;
      
      if (!coords || coords.length < 3) continue;

      if (polygonsOverlap(polygon, coords)) {
        conflicts.push({
          parcelId: parcel.id,
          district: parcel.district,
          municipality: parcel.municipality,
          ward: parcel.ward,
          area: parcel.area,
          landClass: parcel.land_class,
          status: parcel.status,
          registeredDate: parcel.registered_date,
          ownerLin: parcel.owner_lin,
          ownerName: parcel.owner_name || 'Unknown',
          ownerCitizenship: parcel.owner_citizenship || 'N/A',
          ownerPhone: parcel.owner_phone || 'N/A'
        });
      }
    }

    res.json({
      success: true,
      hasConflicts: conflicts.length > 0,
      conflicts,
      checkedAgainst: result.rowCount,
      checkedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Overlap Check Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ═══════════════════════════════════════════════════════════
// GIS Module: Nearby Parcel Search
// ═══════════════════════════════════════════════════════════
router.get('/:id/nearby', async (req, res) => {
  try {
    const { id } = req.params;
    const radiusKm = parseFloat(req.query.radius) || 5;

    // Get target parcel
    const targetRes = await db.query('SELECT * FROM parcels WHERE id = $1', [id]);
    if (targetRes.rowCount === 0) {
      return res.status(404).json({ error: 'Parcel not found' });
    }

    const target = targetRes.rows[0];
    const targetCoords = typeof target.coordinates === 'string' 
      ? JSON.parse(target.coordinates) 
      : target.coordinates;

    if (!targetCoords || targetCoords.length === 0) {
      return res.json({ success: true, data: [], message: 'Target parcel has no coordinates' });
    }

    // Get all other parcels
    const allRes = await db.query('SELECT * FROM parcels WHERE id != $1 AND coordinates IS NOT NULL', [id]);
    const nearby = findNearbyParcels(targetCoords, allRes.rows, radiusKm);

    res.json({
      success: true,
      data: nearby.map(p => ({
        id: p.id,
        district: p.district,
        municipality: p.municipality,
        owner_lin: p.owner_lin,
        distance: Math.round(p.distance * 1000) // meters
      })),
      radiusKm,
      count: nearby.length
    });
  } catch (error) {
    console.error('Nearby Parcel Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ═══════════════════════════════════════════════════════════
// GIS Module: RDP Polygon Simplification
// ═══════════════════════════════════════════════════════════
router.post('/simplify', async (req, res) => {
  try {
    const { polygon, epsilon } = req.body;
    
    if (!polygon || polygon.length < 3) {
      return res.status(400).json({ error: 'Polygon must have at least 3 points' });
    }

    const simplified = rdpSimplify(polygon, epsilon || 0.0001);
    
    res.json({
      success: true,
      original: polygon.length,
      simplified: simplified.length,
      reduction: `${Math.round((1 - simplified.length / polygon.length) * 100)}%`,
      data: simplified
    });
  } catch (error) {
    console.error('Simplify Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;

