import { Router, type Request, type Response } from 'express';
import { vinSchema } from '@sourcethevin/shared';
import { requireAuth } from '../middleware/requireAuth';
import { fetchVpicDecode } from '../lib/vpic';
import { VinDecodeCache } from '../models/VinDecodeCache';

export const vinRouter = Router();

vinRouter.get('/:vin/decode', requireAuth, async (req: Request, res: Response) => {
  const parsedVin = vinSchema.safeParse(req.params.vin);
  if (!parsedVin.success) {
    res.status(400).json({ error: 'VIN must be exactly 17 characters' });
    return;
  }
  const vin = parsedVin.data.toUpperCase();

  const cached = await VinDecodeCache.findOne({ vin });
  if (cached) {
    res.status(200).json({ ...cached.result, cached: true });
    return;
  }

  let decoded;
  try {
    decoded = await fetchVpicDecode(vin);
  } catch {
    res.status(502).json({ error: 'Unable to reach the VIN decode service. Please try again.' });
    return;
  }

  if (!decoded.make && !decoded.model) {
    res
      .status(422)
      .json({ error: 'This VIN could not be decoded. Check the characters and try again.' });
    return;
  }

  await VinDecodeCache.findOneAndUpdate(
    { vin },
    { vin, result: decoded, decodedAt: new Date() },
    { upsert: true },
  );

  res.status(200).json({ ...decoded, cached: false });
});
