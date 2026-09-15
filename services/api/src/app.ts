import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Request, type Response } from 'express';
import { vehicleSchema } from '@sourcethevin/shared';
import { adminRouter } from './routes/admin';
import { authRouter } from './routes/auth';
import { notificationsRouter } from './routes/notifications';
import { offersRouter } from './routes/offers';
import { submissionsRouter } from './routes/submissions';
import { vinRouter } from './routes/vin';

export function createApp() {
  const app = express();
  app.use(
    cors({
      origin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(cookieParser());

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });

  app.post('/vehicles', (req: Request, res: Response) => {
    const result = vehicleSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.flatten() });
      return;
    }
    res.status(201).json(result.data);
  });

  app.use('/auth', authRouter);
  app.use('/vin', vinRouter);
  app.use('/submissions', submissionsRouter);
  app.use('/offers', offersRouter);
  app.use('/admin', adminRouter);
  app.use('/notifications', notificationsRouter);

  return app;
}
