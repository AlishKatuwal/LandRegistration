import express from 'express';
import db from '../config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendNotification, sendOtpEmail } from '../services/notification.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { id, password, type } = req.body;

    if (!id || !password || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let query;

    if (type === 'officer') {
       query = `SELECT * FROM users WHERE id = $1 AND role = 'officer'`;
    } else {
       query = `SELECT * FROM users WHERE (id = $1 OR citizenship_no = $1) AND role = 'citizen'`;
    }

    const result = await db.query(query, [id]);

    if (result.rowCount > 0) {
      const user = result.rows[0];
      
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) return res.status(401).json({ success: false, error: 'Invalid credentials' });

      const { password_hash, ...userWithoutPassword } = user;
      
      if (type === 'citizen') {
         userWithoutPassword.lin = userWithoutPassword.id;
      }

      // Generate JWT
      const token = jwt.sign(
        { id: user.id, role: user.role }, 
        process.env.JWT_SECRET || 'chainland_secret_key',
        { expiresIn: '24h' }
      );

      return res.json({ success: true, user: userWithoutPassword, token });
    } else {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ─── OTP Store (keyed by email) ───────────────────────────────────────────────
// In production, move this to Redis or a DB table for persistence across restarts
const otpStore = new Map();

// Rate limiting: track OTP request timestamps per email
const otpRateLimit = new Map();

router.post('/request-otp', async (req, res) => {
  const { email, name } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email address is required' });
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email address format' });
  }

  // Rate limiting: max 3 OTP requests per email per 10 minutes
  const now = Date.now();
  const rateKey = email.toLowerCase();
  const rateData = otpRateLimit.get(rateKey) || { count: 0, windowStart: now };

  if (now - rateData.windowStart > 10 * 60 * 1000) {
    // Reset window
    otpRateLimit.set(rateKey, { count: 1, windowStart: now });
  } else if (rateData.count >= 3) {
    const waitSeconds = Math.ceil((10 * 60 * 1000 - (now - rateData.windowStart)) / 1000);
    return res.status(429).json({
      error: `Too many OTP requests. Please wait ${Math.ceil(waitSeconds / 60)} minute(s) before trying again.`
    });
  } else {
    otpRateLimit.set(rateKey, { count: rateData.count + 1, windowStart: rateData.windowStart });
  }

  // Generate 6-digit OTP (more secure than 4-digit)
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Store OTP with 5-minute expiry
  otpStore.set(email.toLowerCase(), {
    otp,
    expires: Date.now() + 5 * 60 * 1000,
    attempts: 0
  });

  // Send OTP via email
  const result = await sendOtpEmail(email, otp, name || 'Citizen');

  if (!result.success && !result.mock) {
    console.error('OTP email failed:', result.error);
    return res.status(500).json({
      error: 'Failed to send OTP email. Please check that you entered a valid email address and try again.'
    });
  }

  // In mock mode, log OTP for development convenience
  if (result.mock) {
    console.log(`\n🔑 [DEV] OTP for ${email}: ${otp}\n`);
  }

  res.json({
    success: true,
    message: result.mock
      ? `OTP generated (check server console — email not configured yet)`
      : `OTP sent to ${email}. Check your inbox.`,
    mock: result.mock || false
  });
});

router.post('/register', async (req, res) => {
  try {
    const { name, citizenship_no, password, dob, email, phone, otp } = req.body;

    if (!name || !citizenship_no || !password || !dob || !email || !otp) {
      return res.status(400).json({ error: 'Missing required fields. Name, citizenship number, date of birth, email, password and OTP are all required.' });
    }

    // Verify OTP (keyed by email)
    const emailKey = email.toLowerCase();
    const stored = otpStore.get(emailKey);

    if (!stored) {
      return res.status(400).json({ error: 'OTP not found. Please request a new OTP.' });
    }

    if (Date.now() > stored.expires) {
      otpStore.delete(emailKey);
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    // Track failed attempts (max 5)
    if (stored.attempts >= 5) {
      otpStore.delete(emailKey);
      return res.status(400).json({ error: 'Too many incorrect OTP attempts. Please request a new OTP.' });
    }

    if (stored.otp !== otp) {
      stored.attempts += 1;
      return res.status(400).json({
        error: `Invalid OTP. ${5 - stored.attempts} attempt(s) remaining.`
      });
    }

    // OTP is valid — remove it
    otpStore.delete(emailKey);

    // Check if citizenship already registered
    const existing = await db.query('SELECT id FROM users WHERE citizenship_no = $1', [citizenship_no]);
    if (existing.rowCount > 0) {
      return res.status(409).json({ error: 'This citizenship number is already registered.' });
    }

    // Check if email already registered
    const existingEmail = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingEmail.rowCount > 0) {
      return res.status(409).json({ error: 'This email address is already associated with an account.' });
    }

    // Generate LIN: LIN-YYYY-random4
    const year = new Date().getFullYear();
    const nepaliYear = year - 57; // approximate Nepali calendar year
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const lin = `LIN-${nepaliYear}${randomSuffix}`;

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const query = `
      INSERT INTO users (id, name, role, password_hash, citizenship_no, email, phone, dob)
      VALUES ($1, $2, 'citizen', $3, $4, $5, $6, $7) RETURNING id, name, email, phone, dob
    `;
    const result = await db.query(query, [lin, name, hashedPassword, citizenship_no, email, phone || null, dob]);
    const newUser = result.rows[0];

    // Send welcome notification with LIN details
    const subject = 'Welcome to ChainLand — Your LIN Registration';
    const message = `Hello ${name},\nYour Citizen Registration is successful.\nYour Land Identification Number (LIN) is: ${lin}\nPlease keep this secure and do not share your credentials.`;
    const htmlMessage = `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:#f4f6f9;font-family:'Segoe UI',Arial,sans-serif;">
        <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <div style="background:linear-gradient(135deg,#dc143c 0%,#a00000 100%);padding:32px 40px;text-align:center;">
            <div style="font-size:32px;margin-bottom:8px;">🏔️</div>
            <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">Welcome to ChainLand</h1>
            <p style="margin:4px 0 0;color:rgba(255,255,255,0.75);font-size:12px;letter-spacing:2px;text-transform:uppercase;">Registration Successful</p>
          </div>
          <div style="padding:36px 40px;">
            <p style="margin:0 0 20px;color:#475569;font-size:14px;">
              Hello <strong style="color:#1e293b;">${name}</strong>, your citizen registration on ChainLand is now complete!
            </p>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:24px;">
              <p style="margin:0 0 8px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Your Land Identification Number (LIN)</p>
              <p style="margin:0;font-size:26px;font-weight:800;color:#dc143c;font-family:'Courier New',monospace;letter-spacing:2px;">${lin}</p>
            </div>
            <div style="background:#fef3cd;border-left:4px solid #f59e0b;border-radius:4px;padding:12px 16px;margin-bottom:24px;">
              <p style="margin:0;color:#92400e;font-size:13px;">
                ⚠️ Keep your LIN safe. Do not share it with anyone. Use it to log in to the ChainLand portal.
              </p>
            </div>
            <p style="margin:0;color:#94a3b8;font-size:13px;">
              You can now log in at the ChainLand portal using your LIN and password.
            </p>
          </div>
          <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
            <p style="margin:0;color:#94a3b8;font-size:11px;">
              © Government of Nepal • Ministry of Land Management<br>
              <span style="color:#cbd5e1;">This is an automated message, please do not reply.</span>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
    await sendNotification(newUser, subject, message, htmlMessage);

    return res.json({ success: true, user: newUser });
  } catch (error) {
    console.error('Register Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/lookup/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT id, name, citizenship_no, phone FROM users WHERE id = $1', [id]);
    
    if (result.rowCount > 0) {
      res.json({ success: true, data: result.rows[0] });
    } else {
      res.status(404).json({ success: false, error: 'User not found' });
    }
  } catch (error) {
    console.error('Lookup Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
