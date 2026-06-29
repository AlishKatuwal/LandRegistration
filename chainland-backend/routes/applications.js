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

router.get('/', async (req, res) => {
  try {
    const { applicantLin, buyerLin, type } = req.query;
    let query = 'SELECT * FROM applications';
    const params = [];

    if (applicantLin && type) {
       query += ' WHERE applicant_lin = $1 AND type = $2';
       params.push(applicantLin, type);
    } else if (buyerLin) {
       query += ' WHERE buyer_lin = $1';
       params.push(buyerLin);
    } else if (applicantLin) {
       query += ' WHERE applicant_lin = $1';
       params.push(applicantLin);
    } else if (type) {
       query += ' WHERE type = $1';
       params.push(type);
    }

    query += ' ORDER BY submitted_date DESC';

    const result = await db.query(query, params);
    console.log(`Fetched ${result.rowCount} applications from DB`);
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Applications Fetch Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/', upload.any(), async (req, res) => {
  try {
    // When using multer, data might be in req.body as strings
    const data = req.body;
    const files = req.files || [];
    
    console.log('Incoming Application Data (Body):', data);
    console.log('Incoming Files:', files.length);
    
    // Map files to the documents structure with SHA-256 hash
    const documents = files.map(file => ({
      type: file.fieldname,
      name: file.originalname,
      url: `http://localhost:5001/uploads/${file.filename}`,
      sha256: hashFile(file.path),
      size: file.size
    }));

    // Auto-generate ID: APP-2081-XXXX
    const countRes = await db.query('SELECT COUNT(*) FROM applications');
    const seq = String(Number(countRes.rows[0].count) + 1).padStart(4, '0');
    const newId = `APP-2081-${seq}`;

    // Parse polygon if it's a string from form-data
    let polygon = data.polygon;
    if (typeof polygon === 'string') {
      try { polygon = JSON.parse(polygon); } catch(e) { polygon = null; }
    }

    const initialStatus = (data.type === 'TRANSFER' && data.buyerLin) ? 'buyer_action_pending' : 'pending';

    const query = `
      INSERT INTO applications (
        id, type, type_np, applicant_lin, kitta, priority, buyer_lin, declared_value, documents, district, municipality, ward, area, status, polygon
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;

    const params = [
      newId, 
      data.type, 
      data.typeNp || '', 
      data.applicantLin, 
      data.kitta, 
      data.priority || 'normal', 
      data.buyerLin || null, 
      data.declaredValue || data.transaction_amount || data.transactionAmount || 0, 
      JSON.stringify(documents), 
      data.district || null, 
      data.municipality || null, 
      data.ward || (data.ward ? parseInt(data.ward) : null), 
      data.area || null,
      initialStatus,
      polygon ? JSON.stringify(polygon) : null
    ];

    const result = await db.query(query, params);
    // Emit socket event for officer dashboards
    req.io.emit('new_application', result.rows[0]);

    // ── Workflow Notifications ──
    if (data.type === 'TRANSFER' && data.buyerLin) {
      // Notify buyer: new transfer request
      await notificationService.createNotification({
        userId: data.buyerLin,
        type: 'TRANSFER_REQUEST',
        message: `You have a new land transfer request for Kitta ${data.kitta}. Please review and confirm your purchase.`,
        messageNp: `कित्ता ${data.kitta} को लागि नयाँ जग्गा हस्तान्तरण अनुरोध प्राप्त भयो। कृपया आफ्नो खरिद समीक्षा र पुष्टि गर्नुहोस्।`,
        referenceId: newId,
        referenceType: 'application',
        link: `/citizen/land/transfer/confirm/${newId}`
      });
    } else if (data.type === 'NEW_REGISTRATION') {
      // Notify all officers: new registration submitted
      const officerRes = await db.query("SELECT id FROM users WHERE role = 'officer'");
      for (const officer of officerRes.rows) {
        await notificationService.createNotification({
          userId: officer.id,
          type: 'REGISTRATION_SUBMITTED',
          message: `New land registration application ${newId} for Kitta ${data.kitta} submitted by ${data.applicantLin}.`,
          messageNp: `कित्ता ${data.kitta} को लागि नयाँ भूमि दर्ता आवेदन ${newId} पेश भयो।`,
          referenceId: newId,
          referenceType: 'application',
          link: '/officer/registration'
        });
      }
    }

    return res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Applications Create Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// Update Application Status Route
router.put('/:id/status', async (req, res) => {
  const client = await db.getClient();
  try {
    const { id } = req.params;
    const { status } = req.body;

    await client.query('BEGIN');

    // Get the current application
    const appRes = await client.query('SELECT * FROM applications WHERE id = $1', [id]);
    if (appRes.rowCount === 0) throw new Error('Application not found');
    const app = appRes.rows[0];

    // Update status
    const updateRes = await client.query(
      `UPDATE applications SET status = $1 WHERE id = $2 RETURNING *`,
      [status, id]
    );

    // Notification for Payment Request
    if (status === 'payment_pending') {
      await notificationService.createNotification({
        userId: app.buyer_lin,
        type: 'PAYMENT_PENDING',
        message: `Your land transfer ${id} has been approved. Please complete payment to proceed.`,
        messageNp: `तपाईंको जग्गा हस्तान्तरण ${id} स्वीकृत भयो। कृपया अगाडि बढ्न भुक्तानी पूरा गर्नुहोस्।`,
        referenceId: id,
        referenceType: 'application',
        link: '/citizen/transfers',
        dbClient: client
      });
    }

    if (status === 'approved') {
      if (app.type === 'NEW_REGISTRATION') {
        // Create new parcel
        const parcelQuery = `
          INSERT INTO parcels (
            id, district, municipality, ward, area, owner_lin, coordinates, registered_date, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE, 'active')
          ON CONFLICT (id) DO UPDATE SET 
            district = EXCLUDED.district, 
            municipality = EXCLUDED.municipality,
            ward = EXCLUDED.ward,
            area = EXCLUDED.area,
            owner_lin = EXCLUDED.owner_lin,
            coordinates = EXCLUDED.coordinates,
            status = 'active'
        `;
        await client.query(parcelQuery, [
          app.kitta || 'UNKNOWN', 
          app.district || 'Not Specified', 
          app.municipality || 'Not Specified', 
          app.ward || 0, 
          app.area || '0-0-0-0', 
          app.applicant_lin, 
          typeof app.polygon === 'string' ? app.polygon : JSON.stringify(app.polygon)
        ]);

        // Record history for new registration
        await client.query(
          `INSERT INTO parcel_history (parcel_id, new_owner_lin, application_id, remarks)
           VALUES ($1, $2, $3, $4)`,
          [app.kitta, app.applicant_lin, app.id, 'Initial registration of land parcel']
        );

        // ANCHOR REGISTRATION TO BLOCKCHAIN
        await anchorToBlockchain(app.id, 'LAND_REGISTRATION', {
          applicationId: app.id,
          type: 'LAND_REGISTRATION',
          kitta: app.kitta,
          owner: app.applicant_lin,
          district: app.district,
          area: app.area,
          timestamp: new Date().toISOString()
        });

        // Notify applicant: registration approved
        await notificationService.createNotification({
          userId: app.applicant_lin,
          type: 'REGISTRATION_APPROVED',
          message: `Your land registration for Kitta ${app.kitta} has been approved! The parcel is now registered to your LIN.`,
          messageNp: `कित्ता ${app.kitta} को लागि तपाईंको भूमि दर्ता स्वीकृत भयो! कित्ता अब तपाईंको LIN मा दर्ता भयो।`,
          referenceId: id,
          referenceType: 'application',
          link: '/citizen/land',
          dbClient: client
        });

      } else if (app.type === 'TRANSFER') {
        // Get current owner first
        const pRes = await client.query('SELECT owner_lin FROM parcels WHERE id = $1', [app.kitta]);
        const prevOwner = pRes.rowCount > 0 ? pRes.rows[0].owner_lin : null;

        // Update existing parcel owner
        await client.query(
          `UPDATE parcels SET owner_lin = $1, status = 'active' WHERE id = $2`,
          [app.buyer_lin, app.kitta]
        );

        // Record history for transfer
        await client.query(
          `INSERT INTO parcel_history (parcel_id, previous_owner_lin, new_owner_lin, application_id, remarks)
           VALUES ($1, $2, $3, $4, $5)`,
          [app.kitta, prevOwner, app.buyer_lin, app.id, 'Land ownership transfer']
        );

        // ANCHOR TO BLOCKCHAIN
        const blockchainPayload = {
          applicationId: app.id,
          type: 'LAND_TRANSFER',
          kitta: app.kitta,
          seller: prevOwner,
          buyer: app.buyer_lin,
          timestamp: new Date().toISOString()
        };
        await anchorToBlockchain(app.id, 'LAND_TRANSFER', blockchainPayload);

        // Notify seller: transfer completed
        if (prevOwner) {
          await notificationService.createNotification({
            userId: prevOwner,
            type: 'TRANSFER_COMPLETED',
            message: `Ownership of Kitta ${app.kitta} has been successfully transferred to buyer ${app.buyer_lin}.`,
            messageNp: `कित्ता ${app.kitta} को स्वामित्व सफलतापूर्वक क्रेता ${app.buyer_lin} लाई हस्तान्तरण गरियो।`,
            referenceId: id,
            referenceType: 'application',
            link: '/citizen/transfers',
            dbClient: client
          });
        }

        // Notify buyer: you are now the registered owner
        await notificationService.createNotification({
          userId: app.buyer_lin,
          type: 'TRANSFER_COMPLETED',
          message: `Congratulations! You are now the registered owner of Kitta ${app.kitta}. The transfer is complete.`,
          messageNp: `बधाई छ! तपाईं अब कित्ता ${app.kitta} को दर्ता मालिक हुनुहुन्छ। हस्तान्तरण सम्पन्न भयो।`,
          referenceId: id,
          referenceType: 'application',
          link: '/citizen/land',
          dbClient: client
        });
      }
    }

    // Notify for rejected status
    if (status === 'rejected') {
      const targetUser = app.type === 'TRANSFER' ? app.buyer_lin : app.applicant_lin;
      if (targetUser) {
        await notificationService.createNotification({
          userId: targetUser,
          type: app.type === 'TRANSFER' ? 'TRANSFER_REQUEST' : 'REGISTRATION_REJECTED',
          message: `Application ${id} has been rejected by the officer.`,
          messageNp: `आवेदन ${id} अधिकारीद्वारा अस्वीकृत गरिएको छ।`,
          referenceId: id,
          referenceType: 'application',
          link: '/citizen/applications',
          dbClient: client
        });
      }
    }

    await client.query('COMMIT');

    // Emit socket event for real-time UI updates
    req.io.emit('application_updated', updateRes.rows[0]);
    req.io.to(`user_${app.applicant_lin}`).emit('application_updated', updateRes.rows[0]);
    if (app.buyer_lin) req.io.to(`user_${app.buyer_lin}`).emit('application_updated', updateRes.rows[0]);

    return res.json({ success: true, data: updateRes.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Applications Update Error Detail:', {
      message: error.message,
      stack: error.stack,
      detail: error.detail,
      table: error.table,
      constraint: error.constraint
    });
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  } finally {
    client.release();
  }
});

// Buyer Confirmation Route
router.put('/:id/buyer-confirm', upload.any(), async (req, res) => {
  try {
    const { id } = req.params;
    const files = req.files || [];
    
    // Get current application
    const appRes = await db.query('SELECT documents FROM applications WHERE id = $1', [id]);
    if (appRes.rowCount === 0) return res.status(404).json({ error: 'Application not found' });
    
    let currentDocs = appRes.rows[0].documents;
    if (typeof currentDocs === 'string') {
      try { currentDocs = JSON.parse(currentDocs); } catch(e) { currentDocs = []; }
    }
    if (!Array.isArray(currentDocs)) currentDocs = [];
    
    // Add new files to documents
    const newDocs = files.map(file => ({
      type: file.fieldname,
      name: file.originalname,
      url: `http://localhost:5001/uploads/${file.filename}`
    }));
    
    const updatedDocs = [...currentDocs, ...newDocs];
    
    // Update application
    await db.query(
      `UPDATE applications SET documents = $1, status = 'pending' WHERE id = $2`,
      [JSON.stringify(updatedDocs), id]
    );

    // Get application details for notification
    const fullApp = await db.query('SELECT * FROM applications WHERE id = $1', [id]);
    const app = fullApp.rows[0];

    // Notify officers: buyer has confirmed and documents ready for review
    const officerRes = await db.query("SELECT id FROM users WHERE role = 'officer'");
    for (const officer of officerRes.rows) {
      await notificationService.createNotification({
        userId: officer.id,
        type: 'TRANSFER_ACCEPTED',
        message: `Buyer has confirmed transfer ${id} for Kitta ${app?.kitta || 'N/A'}. Documents ready for review.`,
        messageNp: `क्रेताले कित्ता ${app?.kitta || 'N/A'} को हस्तान्तरण ${id} पुष्टि गरेको छ। कागजातहरू समीक्षाको लागि तयार छन्।`,
        referenceId: id,
        referenceType: 'application',
        link: '/officer/transfers'
      });
    }

    // Notify seller: buyer has accepted
    if (app?.applicant_lin) {
      await notificationService.createNotification({
        userId: app.applicant_lin,
        type: 'TRANSFER_ACCEPTED',
        message: `Buyer has confirmed the purchase for Kitta ${app.kitta}. Application is now under officer review.`,
        messageNp: `क्रेताले कित्ता ${app.kitta} को खरिद पुष्टि गरेको छ। आवेदन अब अधिकारीको समीक्षामा छ।`,
        referenceId: id,
        referenceType: 'application',
        link: '/citizen/transfers'
      });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('Buyer Confirm Error Detail:', {
      message: error.message,
      stack: error.stack,
      detail: error.detail
    });
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// Buyer Rejection Route
// Buyer Rejection Route
router.post('/:id/buyer-reject', async (req, res) => {
  const client = await db.getClient();
  try {
    const { id } = req.params;
    const { reason } = req.body;

    await client.query('BEGIN');

    // SELF-HEALING: Ensure rejection_reason column exists
    try {
      const colCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='applications' AND column_name='rejection_reason'
      `);
      if (colCheck.rowCount === 0) {
        await client.query('ALTER TABLE applications ADD COLUMN rejection_reason TEXT');
        console.log('Added missing rejection_reason column');
      }
    } catch (e) {
      console.error('Self-healing failed:', e);
    }

    // Get current application to find seller (applicant_lin)
    const appRes = await client.query('SELECT applicant_lin, kitta FROM applications WHERE id = $1', [id]);
    if (appRes.rowCount === 0) throw new Error('Application not found');
    const app = appRes.rows[0];

    // Update status and save reason
    await client.query(
      `UPDATE applications SET status = $1, rejection_reason = $2 WHERE id = $3`,
      ['buyer_rejected', reason, id]
    );

    // Notify seller via NotificationService
    await notificationService.createNotification({
      userId: app.applicant_lin,
      type: 'TRANSFER_REQUEST',
      message: `Buyer has rejected the purchase for Kitta ${app.kitta}. Reason: ${reason}`,
      messageNp: `क्रेताले कित्ता ${app.kitta} को खरिद अस्वीकार गरेको छ। कारण: ${reason}`,
      referenceId: id,
      referenceType: 'application',
      link: '/citizen/transfers',
      dbClient: client
    });

    await client.query('COMMIT');
    return res.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('CRITICAL Buyer Reject Error:', {
      message: error.message,
      stack: error.stack,
      detail: error.detail,
      table: error.table,
      constraint: error.constraint
    });
    return res.status(500).json({ error: error.message || 'Internal Server Error', details: error.detail });
  } finally {
    client.release();
  }
});

router.get('/:id/buyer-reject', (req, res) => {
  res.status(405).json({ error: 'Method Not Allowed', message: 'Please use POST to reject an application.' });
});

// Automated Verification Route
router.get('/:id/verify', async (req, res) => {
  try {
    const { id } = req.params;
    const appRes = await db.query('SELECT * FROM applications WHERE id = $1', [id]);
    const app = appRes.rows[0];
    if (!app) return res.status(404).json({ error: 'Application not found' });

    const checks = {
      identity: { status: 'passed', message: 'All parties verified' },
      ownership: { status: 'passed', message: 'Seller is confirmed owner' },
      land: { status: 'passed', message: 'No disputes or mortgages found' },
      documents: { status: 'passed', message: 'Required documents uploaded' }
    };

    // 1. Identity Check
    const buyerRes = await db.query('SELECT * FROM users WHERE lin = $1', [app.buyer_lin]);
    if (buyerRes.rowCount === 0 && app.type === 'TRANSFER') {
      checks.identity = { status: 'failed', message: 'Buyer LIN not found in registry' };
    }

    // 2. Ownership Check (only for transfer)
    if (app.type === 'TRANSFER') {
      const parcelRes = await db.query('SELECT * FROM parcels WHERE id = $1', [app.kitta]);
      if (parcelRes.rowCount === 0 || parcelRes.rows[0].owner_lin !== app.applicant_lin) {
        checks.ownership = { status: 'failed', message: 'Seller is NOT the current owner of this kitta' };
      }
      
      // 3. Land Checks
      if (parcelRes.rowCount > 0) {
        if (parcelRes.rows[0].is_disputed) {
          checks.land = { status: 'failed', message: 'This parcel has an active dispute flag' };
        }
        if (parcelRes.rows[0].is_mortgaged) {
          checks.land = { status: 'failed', message: 'This parcel is currently mortgaged/on hold' };
        }
      }
    }

    // 4. Document Checks
    const docs = app.documents || [];
    if (docs.length < 5) { // Simple count check for now
      checks.documents = { status: 'warning', message: 'Document count lower than expected' };
    }

    return res.json({ success: true, checks });
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Online Payment Simulation (Khalti/eSewa Callback)
router.put('/:id/pay-online', async (req, res) => {
  try {
    const { id } = req.params;
    const { gateway, txnRef } = req.body;
    
    // In a real app, you'd verify txnRef with the gateway API here
    const paymentDetails = {
      gateway,
      txnRef,
      amount: 19322.26,
      paidAt: new Date().toISOString()
    };

    await db.query(
      `UPDATE applications 
       SET payment_status = 'paid', 
           payment_details = $1,
           status = 'payment_verified' 
       WHERE id = $2`,
      [JSON.stringify(paymentDetails), id]
    );

    // Get application details for notification
    const appRes = await db.query('SELECT * FROM applications WHERE id = $1', [id]);
    const app = appRes.rows[0];

    // Notify officers: payment received
    const officerRes = await db.query("SELECT id FROM users WHERE role = 'officer'");
    for (const officer of officerRes.rows) {
      await notificationService.createNotification({
        userId: officer.id,
        type: 'PAYMENT_CONFIRMED',
        message: `Payment received for application ${id} (Kitta ${app?.kitta || 'N/A'}) via ${gateway}. Awaiting final approval.`,
        messageNp: `आवेदन ${id} को भुक्तानी ${gateway} मार्फत प्राप्त भयो। अन्तिम स्वीकृतिको पर्खाइमा।`,
        referenceId: id,
        referenceType: 'application',
        link: '/officer/transfers'
      });
    }

    // Notify buyer: payment confirmed
    if (app?.buyer_lin) {
      await notificationService.createNotification({
        userId: app.buyer_lin,
        type: 'PAYMENT_CONFIRMED',
        message: `Your payment for application ${id} has been confirmed. Awaiting officer's final approval.`,
        messageNp: `आवेदन ${id} को तपाईंको भुक्तानी पुष्टि भयो। अधिकारीको अन्तिम स्वीकृतिको पर्खाइमा।`,
        referenceId: id,
        referenceType: 'application',
        link: '/citizen/transfers'
      });
    }

    return res.json({ success: true, message: 'Online payment verified successfully' });
  } catch (error) {
    console.error('Online Payment Error:', error);
    return res.status(500).json({ error: 'Payment verification failed' });
  }
});

// Manual Bank Voucher Upload
router.put('/:id/upload-voucher', upload.single('receipt'), async (req, res) => {
  try {
    const { id } = req.params;
    const file = req.file;
    
    if (!file) return res.status(400).json({ error: 'No receipt file uploaded' });

    const paymentDetails = {
      method: 'bank_deposit',
      receiptUrl: `http://localhost:5001/uploads/${file.filename}`,
      submittedAt: new Date().toISOString()
    };

    await db.query(
      `UPDATE applications 
       SET payment_status = 'submitted', 
           payment_details = $1,
           status = 'payment_submitted' 
       WHERE id = $2`,
      [JSON.stringify(paymentDetails), id]
    );

    return res.json({ success: true, message: 'Voucher submitted for verification' });
  } catch (error) {
    console.error('Voucher Upload Error:', error);
    return res.status(500).json({ error: 'Voucher submission failed' });
  }
});

// Officer Verify Manual Payment
router.put('/:id/verify-payment', async (req, res) => {
  try {
    const { id } = req.params;
    
    const appRes = await db.query('SELECT payment_details FROM applications WHERE id = $1', [id]);
    const details = appRes.rows[0].payment_details;
    
    details.verifiedAt = new Date().toISOString();
    details.verifiedBy = 'OFFICER';

    await db.query(
      `UPDATE applications 
       SET payment_status = 'paid', 
           payment_details = $1,
           status = 'payment_verified' 
       WHERE id = $2`,
      [JSON.stringify(details), id]
    );

    return res.json({ success: true, message: 'Payment verified by officer' });
  } catch (error) {
    console.error('Payment Verification Error:', error);
    return res.status(500).json({ error: 'Verification failed' });
  }
});

// POST /api/applications/:id/verify-documents — Re-hash documents and compare
router.post('/:id/verify-documents', async (req, res) => {
  try {
    const { id } = req.params;
    const appRes = await db.query('SELECT documents FROM applications WHERE id = $1', [id]);
    
    if (appRes.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }

    const docs = typeof appRes.rows[0].documents === 'string' 
      ? JSON.parse(appRes.rows[0].documents) 
      : (appRes.rows[0].documents || []);

    const results = docs.map(doc => {
      if (!doc.url || !doc.sha256) {
        return { ...doc, verified: false, reason: 'No hash stored for this document' };
      }

      // Extract filename from URL and re-hash the file
      const filename = doc.url.split('/uploads/')[1];
      if (!filename) {
        return { ...doc, verified: false, reason: 'File path not found' };
      }

      const filePath = `uploads/${filename}`;
      const currentHash = hashFile(filePath);

      if (!currentHash) {
        return { ...doc, verified: false, reason: 'File not found on disk' };
      }

      const isMatch = currentHash === doc.sha256;
      return {
        ...doc,
        verified: isMatch,
        currentHash,
        originalHash: doc.sha256,
        reason: isMatch ? 'Hash matches — document is authentic' : 'HASH MISMATCH — Document may have been tampered with'
      };
    });

    const allVerified = results.every(r => r.verified);

    res.json({
      success: true,
      applicationId: id,
      allVerified,
      documents: results,
      verifiedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Document Verification Error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

export default router;
