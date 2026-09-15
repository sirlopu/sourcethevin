import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import {
  MIN_REQUIRED_PHOTOS,
  messageCreateInputSchema,
  offerCreateInputSchema,
  photoSlotSchema,
  submissionCreateSchema,
  submissionPatchSchema,
  valuationInputSchema,
  valuationOverrideInputSchema,
} from '@sourcethevin/shared';
import { computeRecommendedMaxAcquisition, formatCurrency } from '../lib/valuation';
import { buildOfferSentDetail } from '../lib/offers';
import {
  buildSubmissionPhotoPublicId,
  createSignedUpload,
  isValidCloudinaryUrl,
} from '../lib/cloudinary';
import { getDeskRecipients, getSeller, notify } from '../lib/notifications';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';
import { AuditLog } from '../models/AuditLog';
import { nextSubmissionReferenceId } from '../models/Counter';
import { Message } from '../models/Message';
import { Offer } from '../models/Offer';
import { Submission } from '../models/Submission';
import { User } from '../models/User';
import { ValuationWorkspace } from '../models/ValuationWorkspace';
import { listSubmissionsQuerySchema } from '../validation/submissions';

/** Audit actions visible to a seller viewing their own submission's history — never the
 * internal valuation-strategy actions (limit_overridden etc.) that trade_desk/admin see. */
const SELLER_VISIBLE_AUDIT_ACTIONS = new Set([
  'submitted',
  'offer_sent',
  'offer_accepted',
  'offer_declined',
  'offer_countered',
]);

export const submissionsRouter = Router();
submissionsRouter.use(requireAuth);

function paramId(req: Request): string {
  const { id } = req.params;
  return Array.isArray(id) ? (id[0] ?? '') : (id ?? '');
}

/** Seller-only access: the submission must belong to this seller. Used by the wizard routes. */
async function loadSellerOwnedSubmission(id: string, sellerId: string) {
  const submission = await Submission.findById(id).catch(() => null);
  if (!submission || submission.sellerId.toString() !== sellerId) {
    return null;
  }
  return submission;
}

/**
 * Read access for GET /submissions/:id: a seller may only view their own submission;
 * trade_desk/admin may view any submission within their own tenant.
 */
async function loadViewableSubmission(
  id: string,
  user: { id: string; role: string; tenantId: string },
) {
  const submission = await Submission.findById(id).catch(() => null);
  if (!submission) return null;
  if (user.role === 'seller') {
    return submission.sellerId.toString() === user.id ? submission : null;
  }
  return submission.tenantId.toString() === user.tenantId ? submission : null;
}

/** trade_desk-only access to a submission's valuation, scoped to their own tenant. */
async function loadTenantSubmission(id: string, tenantId: string) {
  const submission = await Submission.findById(id).catch(() => null);
  if (!submission || submission.tenantId.toString() !== tenantId) {
    return null;
  }
  return submission;
}

/**
 * Enriches submissions for a trade_desk/admin viewer: basic seller identification (email,
 * dealership name — not sensitive) for both roles, plus the valuation workspace for trade_desk
 * only. A seller viewing their own submissions needs neither and gets the bare document.
 */
async function enrichForDeskView(submissions: InstanceType<typeof Submission>[], role: string) {
  const sellerIds = [...new Set(submissions.map((s) => s.sellerId.toString()))];
  const [sellers, valuations] = await Promise.all([
    User.find({ _id: { $in: sellerIds } }).select('email dealership'),
    role === 'trade_desk'
      ? ValuationWorkspace.find({ submissionId: { $in: submissions.map((s) => s._id) } })
      : Promise.resolve([]),
  ]);
  const sellerById = new Map(sellers.map((u) => [u._id.toString(), u]));
  const valuationBySubmissionId = new Map(valuations.map((v) => [v.submissionId.toString(), v]));

  return submissions.map((s) => {
    const seller = sellerById.get(s.sellerId.toString());
    return {
      ...s.toObject(),
      seller: seller
        ? {
            id: seller._id.toString(),
            email: seller.email,
            dealershipName: seller.dealership?.name ?? null,
          }
        : null,
      ...(role === 'trade_desk'
        ? { valuation: valuationBySubmissionId.get(s._id.toString()) ?? null }
        : {}),
    };
  });
}

submissionsRouter.post('/', requireRole('seller'), async (req: Request, res: Response) => {
  const parsed = submissionCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { vin, decoded } = parsed.data;
  const referenceId = await nextSubmissionReferenceId();
  const submission = await Submission.create({
    referenceId,
    sellerId: req.user!.id,
    tenantId: req.user!.tenantId,
    status: 'new',
    currentStep: 2,
    vin,
    decoded,
    vehicle: decoded,
  });
  res.status(201).json(submission);
});

submissionsRouter.get(
  '/',
  requireRole('seller', 'trade_desk', 'admin'),
  async (req: Request, res: Response) => {
    const parsedQuery = listSubmissionsQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      res.status(400).json({ error: parsedQuery.error.flatten() });
      return;
    }
    const { status, seller, dateFrom, dateTo, page, limit } = parsedQuery.data;

    // Tenant (and, for sellers, owner) scoping is enforced directly in the query — never
    // fetched broadly and filtered afterward.
    const filter: Record<string, unknown> = { tenantId: req.user!.tenantId };
    if (req.user!.role === 'seller') {
      filter.sellerId = req.user!.id;
    } else if (seller) {
      filter.sellerId = seller;
    }
    if (status) {
      filter.status = status;
    } else if (req.user!.role !== 'seller') {
      // No explicit status filter: show the full queue across every post-submission status
      // (submitted, offer_sent, accepted, declined) but never a seller's in-progress draft.
      filter.status = { $ne: 'new' };
    }
    if (dateFrom || dateTo) {
      const createdAt: Record<string, Date> = {};
      if (dateFrom) createdAt.$gte = new Date(dateFrom);
      if (dateTo) createdAt.$lte = new Date(dateTo);
      filter.createdAt = createdAt;
    }

    const [items, total] = await Promise.all([
      Submission.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Submission.countDocuments(filter),
    ]);

    const results =
      req.user!.role === 'trade_desk' || req.user!.role === 'admin'
        ? await enrichForDeskView(items, req.user!.role)
        : items;

    res.status(200).json({ items: results, total, page, limit });
  },
);

submissionsRouter.get(
  '/:id',
  requireRole('seller', 'trade_desk', 'admin'),
  async (req: Request, res: Response) => {
    const submission = await loadViewableSubmission(paramId(req), req.user!);
    if (!submission) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }
    const result =
      req.user!.role === 'trade_desk' || req.user!.role === 'admin'
        ? (await enrichForDeskView([submission], req.user!.role))[0]
        : submission;
    res.status(200).json(result);
  },
);

submissionsRouter.patch('/:id', requireRole('seller'), async (req: Request, res: Response) => {
  const submission = await loadSellerOwnedSubmission(paramId(req), req.user!.id);
  if (!submission) {
    res.status(404).json({ error: 'Submission not found' });
    return;
  }
  if (submission.status !== 'new') {
    res.status(409).json({ error: 'This submission has already been submitted' });
    return;
  }

  const parsed = submissionPatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { currentStep, vin, decoded, vehicle, condition, payoff } = parsed.data;

  if (currentStep !== undefined) submission.currentStep = currentStep;
  if (vin !== undefined) submission.vin = vin;
  if (decoded !== undefined) submission.decoded = decoded ?? undefined;
  if (vehicle) Object.assign(submission.vehicle, vehicle);
  if (condition) Object.assign(submission.condition, condition);
  if (payoff) Object.assign(submission.payoff, payoff);

  await submission.save();
  res.status(200).json(submission);
});

submissionsRouter.delete('/:id', requireRole('seller'), async (req: Request, res: Response) => {
  const submission = await loadSellerOwnedSubmission(paramId(req), req.user!.id);
  if (!submission) {
    res.status(404).json({ error: 'Submission not found' });
    return;
  }
  if (submission.status !== 'new') {
    res.status(409).json({ error: 'Only drafts can be deleted' });
    return;
  }

  await submission.deleteOne();
  res.status(204).send();
});

const photoSignBodySchema = z.object({ slot: photoSlotSchema });

submissionsRouter.post(
  '/:id/photos/sign',
  requireRole('seller'),
  async (req: Request, res: Response) => {
    const submission = await loadSellerOwnedSubmission(paramId(req), req.user!.id);
    if (!submission) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }
    if (submission.status !== 'new') {
      res.status(409).json({ error: 'This submission has already been submitted' });
      return;
    }

    const parsed = photoSignBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid photo slot' });
      return;
    }

    const publicId = buildSubmissionPhotoPublicId(submission.referenceId, parsed.data.slot);
    try {
      res.status(200).json(createSignedUpload(publicId));
    } catch {
      res.status(500).json({ error: 'Photo upload is not configured' });
    }
  },
);

const photoConfirmBodySchema = z.object({
  slot: photoSlotSchema,
  publicId: z.string(),
  url: z.string().url(),
});

submissionsRouter.post(
  '/:id/photos',
  requireRole('seller'),
  async (req: Request, res: Response) => {
    const submission = await loadSellerOwnedSubmission(paramId(req), req.user!.id);
    if (!submission) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }
    if (submission.status !== 'new') {
      res.status(409).json({ error: 'This submission has already been submitted' });
      return;
    }

    const parsed = photoConfirmBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const { slot, publicId, url } = parsed.data;

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const expectedPublicId = buildSubmissionPhotoPublicId(submission.referenceId, slot);
    if (!cloudName || publicId !== expectedPublicId || !isValidCloudinaryUrl(url, cloudName)) {
      res.status(400).json({ error: 'Photo does not match the expected upload target' });
      return;
    }

    const existing = submission.photos.find((photo) => photo.slot === slot);
    if (existing) {
      existing.url = url;
      existing.publicId = publicId;
      existing.uploadedAt = new Date();
    } else {
      submission.photos.push({ slot, url, publicId, uploadedAt: new Date() });
    }

    await submission.save();
    res.status(200).json(submission);
  },
);

submissionsRouter.post(
  '/:id/submit',
  requireRole('seller'),
  async (req: Request, res: Response) => {
    const submission = await loadSellerOwnedSubmission(paramId(req), req.user!.id);
    if (!submission) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }
    if (submission.status !== 'new') {
      res.status(409).json({ error: 'This submission has already been submitted' });
      return;
    }
    if (submission.photos.length < MIN_REQUIRED_PHOTOS) {
      res.status(400).json({ error: `At least ${MIN_REQUIRED_PHOTOS} photos are required` });
      return;
    }

    submission.status = 'submitted';
    submission.currentStep = 6;
    submission.submittedAt = new Date();
    await submission.save();

    await AuditLog.create({
      tenantId: submission.tenantId,
      submissionId: submission._id,
      actorId: req.user!.id,
      action: 'submitted',
      detail: `${submission.photos.length} photos, VIN decoded via vPIC`,
    });

    await notify({
      tenantId: submission.tenantId,
      submissionId: submission._id,
      type: 'submission_submitted',
      recipients: await getDeskRecipients(submission.tenantId),
      title: 'New trade submitted',
      body: `Submission ${submission.referenceId} was submitted and is ready for review.`,
      link: `/desk/submissions/${submission._id}`,
    });

    res.status(200).json(submission);
  },
);

// ── Valuation workspace — trade_desk only; never exposed to seller or admin ────────────────

function emptyValuation(submissionId: string, tenantId: string) {
  return {
    submissionId,
    tenantId,
    bidReferences: [],
    estimatedExpenses: { transport: 0, recon: 0, arbitrationCondition: 0, other: 0 },
    targetMargin: 0,
    recommendedMaxAcquisition: 0,
    buyerOverride: null,
    internalNotes: '',
  };
}

submissionsRouter.get(
  '/:id/valuation',
  requireRole('trade_desk'),
  async (req: Request, res: Response) => {
    const submission = await loadTenantSubmission(paramId(req), req.user!.tenantId);
    if (!submission) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }
    const valuation = await ValuationWorkspace.findOne({ submissionId: submission._id });
    res
      .status(200)
      .json(valuation ?? emptyValuation(submission._id.toString(), submission.tenantId.toString()));
  },
);

submissionsRouter.put(
  '/:id/valuation',
  requireRole('trade_desk'),
  async (req: Request, res: Response) => {
    const submission = await loadTenantSubmission(paramId(req), req.user!.tenantId);
    if (!submission) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }

    const parsed = valuationInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const { bidReferences, estimatedExpenses, targetMargin, internalNotes } = parsed.data;

    const recommendedMaxAcquisition = computeRecommendedMaxAcquisition(
      bidReferences,
      estimatedExpenses,
      targetMargin,
    );

    const valuation = await ValuationWorkspace.findOneAndUpdate(
      { submissionId: submission._id },
      {
        submissionId: submission._id,
        tenantId: submission.tenantId,
        bidReferences: bidReferences.map((bid) => ({
          source: bid.source,
          amount: bid.amount,
          loggedAt: bid.loggedAt ? new Date(bid.loggedAt) : new Date(),
        })),
        estimatedExpenses,
        targetMargin,
        internalNotes: internalNotes ?? '',
        recommendedMaxAcquisition,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    res.status(200).json(valuation);
  },
);

submissionsRouter.post(
  '/:id/valuation/override',
  requireRole('trade_desk'),
  async (req: Request, res: Response) => {
    const submission = await loadTenantSubmission(paramId(req), req.user!.tenantId);
    if (!submission) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }

    const parsed = valuationOverrideInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const { amount, reason } = parsed.data;

    const existing = await ValuationWorkspace.findOne({ submissionId: submission._id });
    const previousMax = existing?.recommendedMaxAcquisition ?? 0;

    const valuation = await ValuationWorkspace.findOneAndUpdate(
      { submissionId: submission._id },
      {
        submissionId: submission._id,
        tenantId: submission.tenantId,
        buyerOverride: { amount, reason, loggedBy: req.user!.id, loggedAt: new Date() },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    await AuditLog.create({
      tenantId: submission.tenantId,
      submissionId: submission._id,
      actorId: req.user!.id,
      action: 'limit_overridden',
      detail: `${formatCurrency(previousMax)} → ${formatCurrency(amount)} · "${reason}"`,
    });

    res.status(200).json(valuation);
  },
);

// ── Offers ───────────────────────────────────────────────────────────────────────────────

submissionsRouter.post(
  '/:id/offers',
  requireRole('trade_desk'),
  async (req: Request, res: Response) => {
    const submission = await loadTenantSubmission(paramId(req), req.user!.tenantId);
    if (!submission) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }
    if (submission.status === 'new') {
      res.status(409).json({ error: 'This submission has not been submitted yet' });
      return;
    }
    if (submission.status === 'accepted' || submission.status === 'declined') {
      res.status(409).json({ error: 'This trade has already been resolved' });
      return;
    }

    const parsed = offerCreateInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const { amount, expiresAt, terms } = parsed.data;

    // At most one pending offer per submission — a new offer supersedes any prior one,
    // whether it was sent by trade_desk or is an unanswered seller counter.
    await Offer.updateMany(
      { submissionId: submission._id, status: 'pending' },
      { status: 'superseded' },
    );

    const version = (await Offer.countDocuments({ submissionId: submission._id })) + 1;
    const offer = await Offer.create({
      submissionId: submission._id,
      tenantId: submission.tenantId,
      version,
      amount,
      expiresAt: new Date(expiresAt),
      terms: terms ?? '',
      status: 'pending',
      createdByRole: 'trade_desk',
      createdBy: req.user!.id,
    });

    submission.status = 'offer_sent';
    await submission.save();

    await AuditLog.create({
      tenantId: submission.tenantId,
      submissionId: submission._id,
      actorId: req.user!.id,
      action: 'offer_sent',
      detail: buildOfferSentDetail(offer),
    });

    const seller = await getSeller(submission);
    await notify({
      tenantId: submission.tenantId,
      submissionId: submission._id,
      type: 'offer_sent',
      recipients: seller ? [seller] : [],
      title: 'You have a new offer',
      body: `A new offer of ${formatCurrency(offer.amount)} was sent for submission ${submission.referenceId}.`,
      link: `/submissions/${submission._id}`,
    });

    res.status(201).json(offer);
  },
);

submissionsRouter.post(
  '/:id/decline',
  requireRole('trade_desk'),
  async (req: Request, res: Response) => {
    const submission = await loadTenantSubmission(paramId(req), req.user!.tenantId);
    if (!submission) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }
    if (submission.status === 'accepted' || submission.status === 'declined') {
      res.status(409).json({ error: 'This trade has already been resolved' });
      return;
    }

    // Close out any live offer so it can't later be accepted/declined once the trade is closed.
    await Offer.updateMany(
      { submissionId: submission._id, status: 'pending' },
      { status: 'declined', respondedAt: new Date(), respondedBy: req.user!.id },
    );

    submission.status = 'declined';
    await submission.save();

    await AuditLog.create({
      tenantId: submission.tenantId,
      submissionId: submission._id,
      actorId: req.user!.id,
      action: 'submission_declined',
      detail: 'Trade desk ended the trade',
    });

    const seller = await getSeller(submission);
    await notify({
      tenantId: submission.tenantId,
      submissionId: submission._id,
      type: 'trade_declined',
      recipients: seller ? [seller] : [],
      title: 'Trade ended',
      body: `Trade desk ended the trade for submission ${submission.referenceId}.`,
      link: `/submissions/${submission._id}`,
    });

    res.status(200).json(submission);
  },
);

submissionsRouter.get(
  '/:id/offers/latest',
  requireRole('seller', 'trade_desk', 'admin'),
  async (req: Request, res: Response) => {
    const submission = await loadViewableSubmission(paramId(req), req.user!);
    if (!submission) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }
    const offer = await Offer.findOne({ submissionId: submission._id }).sort({ version: -1 });
    if (!offer) {
      res.status(404).json({ error: 'No offer has been made yet' });
      return;
    }
    res.status(200).json(offer);
  },
);

// ── Audit trail ──────────────────────────────────────────────────────────────────────────
// trade_desk/admin see every action; a seller sees only the seller-relevant subset (never
// internal valuation-strategy actions like limit_overridden).

submissionsRouter.get(
  '/:id/audit',
  requireRole('seller', 'trade_desk', 'admin'),
  async (req: Request, res: Response) => {
    const submission = await loadViewableSubmission(paramId(req), req.user!);
    if (!submission) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }

    const query: Record<string, unknown> = { submissionId: submission._id };
    if (req.user!.role === 'seller') {
      query.action = { $in: [...SELLER_VISIBLE_AUDIT_ACTIONS] };
    }

    const entries = await AuditLog.find(query).sort({ createdAt: -1 });
    const actorIds = [...new Set(entries.map((entry) => entry.actorId.toString()))];
    const actors = await User.find({ _id: { $in: actorIds } }).select('email role');
    const actorById = new Map(actors.map((actor) => [actor._id.toString(), actor]));

    const results = entries.map((entry) => {
      const actor = actorById.get(entry.actorId.toString());
      return {
        _id: entry._id,
        action: entry.action,
        detail: entry.detail,
        createdAt: entry.createdAt,
        actor: actor ? { email: actor.email, role: actor.role } : null,
      };
    });

    res.status(200).json(results);
  },
);

// ── Messages ─────────────────────────────────────────────────────────────────────────────
// Per-submission message thread between the seller and trade_desk staff in the submission's
// tenant. History persists and is scoped strictly to this submission — trade_desk access is
// tenant-wide (no per-submission assignment), matching loadViewableSubmission elsewhere.

submissionsRouter.get(
  '/:id/messages',
  requireRole('seller', 'trade_desk', 'admin'),
  async (req: Request, res: Response) => {
    const submission = await loadViewableSubmission(paramId(req), req.user!);
    if (!submission) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }

    const entries = await Message.find({ submissionId: submission._id }).sort({ createdAt: 1 });
    const authorIds = [...new Set(entries.map((entry) => entry.authorId.toString()))];
    const authors = await User.find({ _id: { $in: authorIds } }).select('email role');
    const authorById = new Map(authors.map((author) => [author._id.toString(), author]));

    const results = entries.map((entry) => {
      const author = authorById.get(entry.authorId.toString());
      return {
        _id: entry._id,
        body: entry.body,
        createdAt: entry.createdAt,
        author: author ? { email: author.email, role: author.role } : null,
      };
    });

    res.status(200).json(results);
  },
);

submissionsRouter.post(
  '/:id/messages',
  requireRole('seller', 'trade_desk'),
  async (req: Request, res: Response) => {
    const submission = await loadViewableSubmission(paramId(req), req.user!);
    if (!submission) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }

    const parsed = messageCreateInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid message', details: parsed.error.flatten() });
      return;
    }

    const message = await Message.create({
      tenantId: submission.tenantId,
      submissionId: submission._id,
      authorId: req.user!.id,
      body: parsed.data.body,
    });

    const recipients =
      req.user!.role === 'seller'
        ? await getDeskRecipients(submission.tenantId)
        : await getSeller(submission).then((seller) => (seller ? [seller] : []));
    await notify({
      tenantId: submission.tenantId,
      submissionId: submission._id,
      type: 'message_received',
      recipients,
      title: 'New message',
      body: `New message on submission ${submission.referenceId}: "${message.body}"`,
      link:
        req.user!.role === 'seller'
          ? `/desk/submissions/${submission._id}`
          : `/submissions/${submission._id}`,
    });

    res.status(201).json({
      _id: message._id,
      body: message.body,
      createdAt: message.createdAt,
      author: { email: req.user!.email, role: req.user!.role },
    });
  },
);
