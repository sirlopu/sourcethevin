import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { MIN_REQUIRED_PHOTOS, photoSlotSchema, submissionPatchSchema } from '@sourcethevin/shared';
import { createSignedUpload, isValidCloudinaryUrl } from '../lib/cloudinary';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';
import { AuditLog } from '../models/AuditLog';
import { nextSubmissionReferenceId } from '../models/Counter';
import { Submission } from '../models/Submission';

export const submissionsRouter = Router();
submissionsRouter.use(requireAuth, requireRole('seller'));

function paramId(req: Request): string {
  const { id } = req.params;
  return Array.isArray(id) ? (id[0] ?? '') : (id ?? '');
}

async function loadOwnedSubmission(id: string, sellerId: string) {
  const submission = await Submission.findById(id).catch(() => null);
  if (!submission || submission.sellerId.toString() !== sellerId) {
    return null;
  }
  return submission;
}

submissionsRouter.post('/', async (req: Request, res: Response) => {
  const referenceId = await nextSubmissionReferenceId();
  const submission = await Submission.create({
    referenceId,
    sellerId: req.user!.id,
    tenantId: req.user!.tenantId,
    status: 'new',
    currentStep: 1,
  });
  res.status(201).json(submission);
});

submissionsRouter.get('/', async (req: Request, res: Response) => {
  const submissions = await Submission.find({ sellerId: req.user!.id }).sort({ updatedAt: -1 });
  res.status(200).json(submissions);
});

submissionsRouter.get('/:id', async (req: Request, res: Response) => {
  const submission = await loadOwnedSubmission(paramId(req), req.user!.id);
  if (!submission) {
    res.status(404).json({ error: 'Submission not found' });
    return;
  }
  res.status(200).json(submission);
});

submissionsRouter.patch('/:id', async (req: Request, res: Response) => {
  const submission = await loadOwnedSubmission(paramId(req), req.user!.id);
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

const photoSignBodySchema = z.object({ slot: photoSlotSchema });

submissionsRouter.post('/:id/photos/sign', async (req: Request, res: Response) => {
  const submission = await loadOwnedSubmission(paramId(req), req.user!.id);
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

  const publicId = `submissions/${submission._id.toString()}/${parsed.data.slot}`;
  try {
    res.status(200).json(createSignedUpload(publicId));
  } catch {
    res.status(500).json({ error: 'Photo upload is not configured' });
  }
});

const photoConfirmBodySchema = z.object({
  slot: photoSlotSchema,
  publicId: z.string(),
  url: z.string().url(),
});

submissionsRouter.post('/:id/photos', async (req: Request, res: Response) => {
  const submission = await loadOwnedSubmission(paramId(req), req.user!.id);
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
  const expectedPublicId = `submissions/${submission._id.toString()}/${slot}`;
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
});

submissionsRouter.post('/:id/submit', async (req: Request, res: Response) => {
  const submission = await loadOwnedSubmission(paramId(req), req.user!.id);
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

  res.status(200).json(submission);
});
