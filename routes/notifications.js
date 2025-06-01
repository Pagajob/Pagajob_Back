import express from 'express';
import {
  createNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotificationsForUser
} from '../controllers/notifications.js';

const router = express.Router();

router.post('/', createNotification);
router.get('/', getNotifications);
router.patch('/:id/read', markAsRead);
router.patch('/readAll', markAllAsRead);
router.delete('/:notificationId', deleteNotification);
router.delete('/user/:userId', deleteAllNotificationsForUser);

export default router;