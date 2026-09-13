import { Router, type Request, type Response } from 'express';
import { Types } from 'mongoose';
import { offerCounterInputSchema } from '@sourcethevin/shared';
import {
  buildOfferAcceptedDetail,
  buildOfferCounteredDetail,
  buildOfferDeclinedDetail,
} from '../lib/offers';
import { requireAuth, type AuthenticatedUser } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';
import { AuditLog } from '../models/AuditLog';
import { Offer } from '../models/Offer';
import { Submission } from '../models/Submission';

export const offersRouter = Router();
offersRouter.use(requireAuth, requireRole('seller', 'trade_desk'));

function paramId(req: Request): string {
  const { id } = req.params;
  return Array.isArray(id) ? (id[0] ?? '') : (id ?? '');
}

type LoadResult =
  | { error: 'not_found' | 'not_pending' | 'expired' }
  | { offer: InstanceType<typeof Offer>; submission: InstanceType<typeof Submission> };

/** An offer is only actionable by the seller who owns its submission, or by a trade_desk
 * user in the same tenant, while still pending and unexpired — this is the single gate
 * shared by accept/decline/counter. */
async function loadActionableOffer(id: string, user: AuthenticatedUser): Promise<LoadResult> {
  const offer = await Offer.findById(id).catch(() => null);
  if (!offer) {
    return { error: 'not_found' };
  }
  const submission = await Submission.findById(offer.submissionId).catch(() => null);
  if (!submission) {
    return { error: 'not_found' };
  }
  const authorized =
    user.role === 'seller'
      ? submission.sellerId.toString() === user.id
      : submission.tenantId.toString() === user.tenantId;
  if (!authorized) {
    return { error: 'not_found' };
  }
  if (offer.status !== 'pending') {
    return { error: 'not_pending' };
  }
  if (offer.expiresAt.getTime() < Date.now()) {
    return { error: 'expired' };
  }
  return { offer, submission };
}

function respondToLoadError(res: Response, error: 'not_found' | 'not_pending' | 'expired'): void {
  if (error === 'not_found') {
    res.status(404).json({ error: 'Offer not found' });
    return;
  }
  if (error === 'not_pending') {
    res.status(409).json({ error: 'This offer is no longer pending' });
    return;
  }
  res.status(409).json({ error: 'This offer has expired' });
}

offersRouter.post('/:id/accept', async (req: Request, res: Response) => {
  const result = await loadActionableOffer(paramId(req), req.user!);
  if ('error' in result) {
    respondToLoadError(res, result.error);
    return;
  }
  const { offer, submission } = result;

  offer.status = 'accepted';
  offer.respondedAt = new Date();
  offer.respondedBy = new Types.ObjectId(req.user!.id);
  await offer.save();

  submission.status = 'accepted';
  await submission.save();

  await AuditLog.create({
    tenantId: submission.tenantId,
    submissionId: submission._id,
    actorId: req.user!.id,
    action: 'offer_accepted',
    detail: buildOfferAcceptedDetail(offer),
  });

  res.status(200).json(offer);
});

offersRouter.post('/:id/decline', async (req: Request, res: Response) => {
  const result = await loadActionableOffer(paramId(req), req.user!);
  if ('error' in result) {
    respondToLoadError(res, result.error);
    return;
  }
  const { offer, submission } = result;

  offer.status = 'declined';
  offer.respondedAt = new Date();
  offer.respondedBy = new Types.ObjectId(req.user!.id);
  await offer.save();

  // A seller declining ends the trade; a trade_desk user declining a seller's counter
  // just rejects that amount and reopens the trade for further negotiation.
  submission.status = req.user!.role === 'seller' ? 'declined' : 'submitted';
  await submission.save();

  await AuditLog.create({
    tenantId: submission.tenantId,
    submissionId: submission._id,
    actorId: req.user!.id,
    action: 'offer_declined',
    detail: buildOfferDeclinedDetail(offer),
  });

  res.status(200).json(offer);
});

offersRouter.post('/:id/counter', requireRole('seller'), async (req: Request, res: Response) => {
  const result = await loadActionableOffer(paramId(req), req.user!);
  if ('error' in result) {
    respondToLoadError(res, result.error);
    return;
  }
  const { offer, submission } = result;

  const parsed = offerCounterInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { amount, notes } = parsed.data;

  offer.status = 'superseded';
  offer.respondedAt = new Date();
  offer.respondedBy = new Types.ObjectId(req.user!.id);
  await offer.save();

  const nextVersion = (await Offer.countDocuments({ submissionId: submission._id })) + 1;
  const counterOffer = await Offer.create({
    submissionId: submission._id,
    tenantId: submission.tenantId,
    version: nextVersion,
    amount,
    expiresAt: offer.expiresAt,
    notes: notes ?? '',
    status: 'pending',
    createdByRole: 'seller',
    createdBy: req.user!.id,
  });

  // Reopen the trade in the desk's actionable queue for review of the counter.
  submission.status = 'submitted';
  await submission.save();

  await AuditLog.create({
    tenantId: submission.tenantId,
    submissionId: submission._id,
    actorId: req.user!.id,
    action: 'offer_countered',
    detail: buildOfferCounteredDetail(offer, counterOffer),
  });

  res.status(201).json(counterOffer);
});
