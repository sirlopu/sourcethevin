import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/requireAuth';
import { Notification } from '../models/Notification';

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

function paramId(req: Request): string {
  const { id } = req.params;
  return Array.isArray(id) ? (id[0] ?? '') : (id ?? '');
}

const listQuerySchema = z.object({
  unreadOnly: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

notificationsRouter.get('/', async (req: Request, res: Response) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { unreadOnly, page, limit } = parsed.data;

  const filter: Record<string, unknown> = { recipientId: req.user!.id };
  if (unreadOnly === 'true') {
    filter.readAt = null;
  }

  const [items, total] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Notification.countDocuments(filter),
  ]);

  res.status(200).json({ items, total, page, limit });
});

notificationsRouter.get('/unread-count', async (req: Request, res: Response) => {
  const count = await Notification.countDocuments({ recipientId: req.user!.id, readAt: null });
  res.status(200).json({ count });
});

notificationsRouter.patch('/:id/read', async (req: Request, res: Response) => {
  const notification = await Notification.findOne({
    _id: paramId(req),
    recipientId: req.user!.id,
  }).catch(() => null);
  if (!notification) {
    res.status(404).json({ error: 'Notification not found' });
    return;
  }

  notification.readAt = new Date();
  await notification.save();
  res.status(200).json(notification);
});

notificationsRouter.post('/read-all', async (req: Request, res: Response) => {
  await Notification.updateMany(
    { recipientId: req.user!.id, readAt: null },
    { readAt: new Date() },
  );
  res.status(204).send();
});
