/**
 * Notification API Routes
 * 
 * GET    /api/notifications              — Get user notifications (paginated)
 * GET    /api/notifications/unread-count  — Get unread count
 * PATCH  /api/notifications/:id/read     — Mark single as read
 * PATCH  /api/notifications/read-all     — Mark all as read
 * DELETE /api/notifications/:id          — Delete a notification
 * POST   /api/notifications/broadcast    — Admin broadcast (officer only)
 * POST   /api/notifications              — Create notification (internal/admin)
 */

import express from 'express';
import notificationService from '../services/notificationService.js';

const router = express.Router();

// ─── GET /api/notifications ───────────────────────────────
// Query params: userLin (required), limit, offset, unreadOnly
router.get('/', async (req, res) => {
  try {
    const { userLin, limit = 50, offset = 0, unreadOnly } = req.query;
    if (!userLin) return res.status(400).json({ error: 'userLin is required' });

    const notifications = await notificationService.getUserNotifications(userLin, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      unreadOnly: unreadOnly === 'true'
    });

    res.json({ success: true, data: notifications });
  } catch (error) {
    console.error('GET /notifications error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ─── GET /api/notifications/unread-count ──────────────────
router.get('/unread-count', async (req, res) => {
  try {
    const { userLin } = req.query;
    if (!userLin) return res.status(400).json({ error: 'userLin is required' });

    const count = await notificationService.getUnreadCount(userLin);
    res.json({ success: true, count });
  } catch (error) {
    console.error('GET /notifications/unread-count error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ─── PATCH /api/notifications/read-all ────────────────────
// Must be before /:id/read to prevent route conflicts
router.patch('/read-all', async (req, res) => {
  try {
    const { userLin } = req.query;
    if (!userLin) return res.status(400).json({ error: 'userLin is required' });

    const count = await notificationService.markAllAsRead(userLin);
    res.json({ success: true, message: `${count} notifications marked as read` });
  } catch (error) {
    console.error('PATCH /notifications/read-all error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ─── PUT /api/notifications/read-all (legacy compat) ──────
router.put('/read-all', async (req, res) => {
  try {
    const { userLin } = req.query;
    if (!userLin) return res.status(400).json({ error: 'userLin is required' });

    const count = await notificationService.markAllAsRead(userLin);
    res.json({ success: true, message: `${count} notifications marked as read` });
  } catch (error) {
    console.error('PUT /notifications/read-all error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ─── PATCH /api/notifications/:id/read ────────────────────
router.patch('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const { userLin } = req.query;
    if (!userLin) return res.status(400).json({ error: 'userLin is required' });

    const notification = await notificationService.markAsRead(id, userLin);
    if (!notification) return res.status(404).json({ error: 'Notification not found' });
    res.json({ success: true, data: notification });
  } catch (error) {
    console.error('PATCH /notifications/:id/read error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ─── PUT /api/notifications/:id/read (legacy compat) ──────
router.put('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const { userLin } = req.query;
    // Support old format where userLin isn't in query
    const userId = userLin || req.body?.userLin;

    const notification = await notificationService.markAsRead(id, userId);
    if (!notification) {
      // If no userId provided, mark without ownership check (legacy)
      const { query } = await import('../config/db.js');
      await query('UPDATE notifications SET is_read = TRUE WHERE id = $1', [id]);
      return res.json({ success: true });
    }
    res.json({ success: true, data: notification });
  } catch (error) {
    console.error('PUT /notifications/:id/read error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ─── DELETE /api/notifications/:id ────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userLin } = req.query;
    if (!userLin) return res.status(400).json({ error: 'userLin is required' });

    const deleted = await notificationService.deleteNotification(id, userLin);
    if (!deleted) return res.status(404).json({ error: 'Notification not found' });
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    console.error('DELETE /notifications/:id error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ─── POST /api/notifications/broadcast ────────────────────
// Admin-only: send system alert to all users
router.post('/broadcast', async (req, res) => {
  try {
    const { message, messageNp, link } = req.body;
    if (!message) return res.status(400).json({ error: 'message is required' });

    const notifications = await notificationService.broadcast({ message, messageNp, link });
    res.json({ success: true, count: notifications.length, message: 'Broadcast sent' });
  } catch (error) {
    console.error('POST /notifications/broadcast error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ─── POST /api/notifications (create single) ─────────────
// For manual/programmatic notification creation
router.post('/', async (req, res) => {
  try {
    const { user_lin, type, message, message_np, title, title_np, icon, link, reference_id, reference_type } = req.body;
    if (!user_lin || !message) {
      return res.status(400).json({ error: 'user_lin and message are required' });
    }

    const notification = await notificationService.createNotification({
      userId: user_lin,
      type: type || 'SYSTEM_ALERT',
      message,
      messageNp: message_np,
      referenceId: reference_id,
      referenceType: reference_type,
      link
    });

    res.json({ success: true, data: notification });
  } catch (error) {
    console.error('POST /notifications error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
