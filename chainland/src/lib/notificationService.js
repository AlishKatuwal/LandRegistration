import nodemailer from 'nodemailer';
import twilio from 'twilio';

// Initialize Twilio Client
// In production, these should be securely stored in process.env
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

// Initialize Nodemailer Transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: process.env.SMTP_PORT || 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Sends an email notification
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} html - HTML content
 */
export const sendEmail = async (to, subject, html) => {
  try {
    if (!process.env.SMTP_USER) {
      console.log('📧 [Mock Email] To:', to, 'Subject:', subject);
      return { success: true, mock: true };
    }
    
    const info = await transporter.sendMail({
      from: '"ChainLand Registry" <noreply@chainland.gov.np>',
      to,
      subject,
      html,
    });
    console.log('Email sent: %s', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email sending failed:', error);
    return { success: false, error };
  }
};

/**
 * Sends an SMS notification
 * @param {string} to - Phone number in E.164 format (e.g. +9779841234567)
 * @param {string} body - SMS body
 */
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

/**
 * Sends both SMS and Email (if contact info provided)
 */
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
