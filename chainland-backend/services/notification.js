import nodemailer from 'nodemailer';
import twilio from 'twilio';

const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

// Create SMTP transporter — supports Gmail, Outlook, or any SMTP provider
const createTransporter = () => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS ||
      process.env.SMTP_USER === 'your_gmail@gmail.com') {
    return null; // mock mode
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false, // STARTTLS
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

export const sendEmail = async (to, subject, html) => {
  try {
    const transporter = createTransporter();
    if (!transporter) {
      console.log('📧 [Mock Email] To:', to, '| Subject:', subject);
      return { success: true, mock: true };
    }

    const info = await transporter.sendMail({
      from: `"ChainLand Registry 🏔️" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log('✅ Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    return { success: false, error };
  }
};

/**
 * Sends a styled OTP verification email for registration 2FA.
 */
export const sendOtpEmail = async (to, otp, name = 'Citizen') => {
  const subject = 'Your ChainLand Registration OTP';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
    </head>
    <body style="margin:0;padding:0;background:#f4f6f9;font-family:'Segoe UI',Arial,sans-serif;">
      <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        
        <!-- Header -->
        <div style="background:linear-gradient(135deg,#dc143c 0%,#a00000 100%);padding:32px 40px;text-align:center;">
          <div style="font-size:32px;margin-bottom:8px;">🏔️</div>
          <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">ChainLand Registry</h1>
          <p style="margin:4px 0 0;color:rgba(255,255,255,0.75);font-size:12px;letter-spacing:2px;text-transform:uppercase;">Department of Land Management</p>
        </div>

        <!-- Body -->
        <div style="padding:36px 40px;">
          <p style="margin:0 0 8px;color:#64748b;font-size:14px;">Hello, <strong style="color:#1e293b;">${name}</strong></p>
          <p style="margin:0 0 28px;color:#475569;font-size:14px;line-height:1.6;">
            Your one-time verification code for ChainLand citizen registration is:
          </p>

          <!-- OTP Box -->
          <div style="background:#f8fafc;border:2px dashed #dc143c;border-radius:12px;padding:24px;text-align:center;margin-bottom:28px;">
            <div style="font-size:42px;font-weight:800;letter-spacing:14px;color:#dc143c;font-family:'Courier New',monospace;">${otp}</div>
            <p style="margin:10px 0 0;color:#94a3b8;font-size:12px;">⏰ Expires in <strong>5 minutes</strong></p>
          </div>

          <div style="background:#fef3cd;border-left:4px solid #f59e0b;border-radius:4px;padding:12px 16px;margin-bottom:24px;">
            <p style="margin:0;color:#92400e;font-size:13px;">
              ⚠️ <strong>Never share this OTP</strong> with anyone. ChainLand officials will never ask for your OTP.
            </p>
          </div>

          <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">
            If you did not request this code, please ignore this email. Your account remains secure.
          </p>
        </div>

        <!-- Footer -->
        <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
          <p style="margin:0;color:#94a3b8;font-size:11px;">
            © Government of Nepal • Ministry of Land Management, Cooperatives and Poverty Alleviation<br>
            <span style="color:#cbd5e1;">This is an automated message, please do not reply.</span>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(to, subject, html);
};

export const sendSMS = async (to, body) => {
  try {
    if (!twilioClient) {
      console.log('📱 [Mock SMS] To:', to, 'Body:', body);
      return { success: true, mock: true };
    }

    const message = await twilioClient.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
    });
    console.log('SMS sent:', message.sid);
    return { success: true, sid: message.sid };
  } catch (error) {
    console.error('SMS sending failed:', error);
    return { success: false, error };
  }
};

export const sendNotification = async (user, subject, message, emailHtml) => {
  const results = {};

  if (user.phone) {
    results.sms = await sendSMS(user.phone, message);
  }

  if (user.email) {
    results.email = await sendEmail(user.email, subject, emailHtml || `<p>${message}</p>`);
  }

  return results;
};
