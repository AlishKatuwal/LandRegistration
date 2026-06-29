/**
 * NotificationService — Centralized notification engine for ChainLand
 * 
 * Every notification flows through here:
 *   1. Saved to PostgreSQL
 *   2. Emitted via Socket.IO to the target user's room
 *   3. Returns the full notification object
 * 
 * Notification Types:
 *   TRANSFER_REQUEST, TRANSFER_ACCEPTED, TRANSFER_COMPLETED,
 *   DOCUMENT_REQUIRED, DOCUMENT_VERIFIED,
 *   PAYMENT_PENDING, PAYMENT_CONFIRMED,
 *   REGISTRATION_SUBMITTED, REGISTRATION_APPROVED, REGISTRATION_REJECTED,
 *   DISPUTE_CREATED, DISPUTE_UPDATED, DISPUTE_RESOLVED,
 *   SYSTEM_ALERT
 */

import db from '../config/db.js';

// Type → display config mapping
const TYPE_CONFIG = {
  TRANSFER_REQUEST:       { icon: '🔄', title: 'Transfer Request',        title_np: 'हस्तान्तरण अनुरोध' },
  TRANSFER_ACCEPTED:      { icon: '✅', title: 'Transfer Accepted',       title_np: 'हस्तान्तरण स्वीकृत' },
  TRANSFER_COMPLETED:     { icon: '🏠', title: 'Transfer Completed',      title_np: 'हस्तान्तरण सम्पन्न' },
  DOCUMENT_REQUIRED:      { icon: '📋', title: 'Documents Required',      title_np: 'कागजात आवश्यक' },
  DOCUMENT_VERIFIED:      { icon: '✅', title: 'Documents Verified',      title_np: 'कागजात प्रमाणित' },
  PAYMENT_PENDING:        { icon: '💰', title: 'Payment Required',        title_np: 'भुक्तानी आवश्यक' },
  PAYMENT_CONFIRMED:      { icon: '💳', title: 'Payment Confirmed',       title_np: 'भुक्तानी पुष्टि' },
  REGISTRATION_SUBMITTED: { icon: '📝', title: 'Registration Submitted',  title_np: 'दर्ता पेश भयो' },
  REGISTRATION_APPROVED:  { icon: '🎉', title: 'Registration Approved',   title_np: 'दर्ता स्वीकृत' },
  REGISTRATION_REJECTED:  { icon: '❌', title: 'Registration Rejected',   title_np: 'दर्ता अस्वीकृत' },
  DISPUTE_CREATED:        { icon: '⚖️', title: 'Dispute Filed',           title_np: 'विवाद दर्ता' },
  DISPUTE_UPDATED:        { icon: '⚖️', title: 'Dispute Updated',         title_np: 'विवाद अपडेट' },
  DISPUTE_RESOLVED:       { icon: '✅', title: 'Dispute Resolved',        title_np: 'विवाद समाधान' },
  SYSTEM_ALERT:           { icon: '🔔', title: 'System Notification',     title_np: 'प्रणाली सूचना' },
};

class NotificationService {
  constructor() {
    this.io = null;
  }

  /**
   * Attach Socket.IO instance (called once from server.js)
   */
  setIO(io) {
    this.io = io;
  }

  /**
   * Create and deliver a notification
   * @param {Object} params
   * @param {string} params.userId       - Target user LIN or officer ID
   * @param {string} params.type         - One of the TYPE_CONFIG keys
   * @param {string} params.message      - English message body
   * @param {string} [params.messageNp]  - Nepali message body
   * @param {string} [params.referenceId]   - Related entity ID (app ID, dispute ID, etc.)
   * @param {string} [params.referenceType] - 'application', 'dispute', 'parcel', etc.
   * @param {string} [params.link]       - Frontend route to navigate on click
   * @param {Object} [params.dbClient]   - Pass a transaction client if inside a transaction
   * @returns {Object} The created notification row
   */
  async createNotification({ userId, type, message, messageNp, referenceId, referenceType, link, dbClient }) {
    const config = TYPE_CONFIG[type] || TYPE_CONFIG.SYSTEM_ALERT;
    const queryRunner = dbClient || db;

    try {
      const result = await queryRunner.query(
        `INSERT INTO notifications 
          (user_lin, type, icon, title, title_np, message, message_np, reference_id, reference_type, link, is_read, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, FALSE, NOW(), NOW())
         RETURNING *`,
        [
          userId,
          type,
          config.icon,
          config.title,
          config.title_np,
          message,
          messageNp || null,
          referenceId || null,
          referenceType || null,
          link || null
        ]
      );

      const notification = result.rows[0];

      // Emit to the user's socket room immediately
      if (this.io) {
        const room = `user_${userId}`;
        this.io.to(room).emit('new_notification', notification);
      }

      return notification;
    } catch (error) {
      console.error('NotificationService.createNotification error:', error);
      throw error;
    }
  }

  /**
   * Create notifications for multiple users at once (e.g., notify both buyer + seller)
   */
  async notifyMany(userIds, params) {
    const results = [];
    for (const userId of userIds) {
      if (userId) {
        const notif = await this.createNotification({ ...params, userId });
        results.push(notif);
      }
    }
    return results;
  }

  /**
   * Broadcast a system notification to ALL connected users
   * Also saves one notification per user in the database
   */
  async broadcast({ message, messageNp, link }) {
    try {
      // Get all user IDs
      const usersResult = await db.query('SELECT id FROM users');
      const users = usersResult.rows;

      const notifications = [];
      for (const user of users) {
        const notif = await this.createNotification({
          userId: user.id,
          type: 'SYSTEM_ALERT',
          message,
          messageNp,
          link
        });
        notifications.push(notif);
      }

      return notifications;
    } catch (error) {
      console.error('NotificationService.broadcast error:', error);
      throw error;
    }
  }

  /**
   * Get notifications for a user with pagination
   */
  async getUserNotifications(userId, { limit = 50, offset = 0, unreadOnly = false } = {}) {
    try {
      let query = `SELECT * FROM notifications WHERE user_lin = $1`;
      const params = [userId];

      if (unreadOnly) {
        query += ` AND is_read = FALSE`;
      }

      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('NotificationService.getUserNotifications error:', error);
      throw error;
    }
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(userId) {
    try {
      const result = await db.query(
        'SELECT COUNT(*) as count FROM notifications WHERE user_lin = $1 AND is_read = FALSE',
        [userId]
      );
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      console.error('NotificationService.getUnreadCount error:', error);
      throw error;
    }
  }

  /**
   * Mark a single notification as read
   */
  async markAsRead(notificationId, userId) {
    try {
      const result = await db.query(
        `UPDATE notifications SET is_read = TRUE, updated_at = NOW() 
         WHERE id = $1 AND user_lin = $2 RETURNING *`,
        [notificationId, userId]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('NotificationService.markAsRead error:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId) {
    try {
      const result = await db.query(
        `UPDATE notifications SET is_read = TRUE, updated_at = NOW() 
         WHERE user_lin = $1 AND is_read = FALSE`,
        [userId]
      );
      return result.rowCount;
    } catch (error) {
      console.error('NotificationService.markAllAsRead error:', error);
      throw error;
    }
  }

  /**
   * Delete a notification (user can only delete their own)
   */
  async deleteNotification(notificationId, userId) {
    try {
      const result = await db.query(
        'DELETE FROM notifications WHERE id = $1 AND user_lin = $2 RETURNING id',
        [notificationId, userId]
      );
      return result.rowCount > 0;
    } catch (error) {
      console.error('NotificationService.deleteNotification error:', error);
      throw error;
    }
  }
}

// Singleton instance — imported across all routes
const notificationService = new NotificationService();
export default notificationService;
