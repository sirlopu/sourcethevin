import type { NextFunction, Request, Response } from 'express';
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findOfferById: vi.fn(),
  findLatestOffer: vi.fn(),
  countOffers: vi.fn(),
  createOffer: vi.fn(),
  findSubmissionById: vi.fn(),
  createAuditLog: vi.fn(),
  notify: vi.fn(),
  getDeskRecipients: vi.fn(),
  getSeller: vi.fn(),
}));

vi.mock('../middleware/requireAuth', () => ({
  requireAuth: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

vi.mock('../middleware/requireRole', () => ({
  requireRole: () => (_req: Request, _res: Response, next: NextFunction) => next(),
}));

vi.mock('../models/Offer', () => ({
  Offer: {
    findById: mocks.findOfferById,
    findOne: mocks.findLatestOffer,
    countDocuments: mocks.countOffers,
    create: mocks.createOffer,
  },
}));

vi.mock('../models/Submission', () => ({
  Submission: { findById: mocks.findSubmissionById },
}));

vi.mock('../models/AuditLog', () => ({
  AuditLog: { create: mocks.createAuditLog },
}));

vi.mock('../lib/notifications', () => ({
  getDeskRecipients: mocks.getDeskRecipients,
  getSeller: mocks.getSeller,
  notify: mocks.notify,
}));

import { offersRouter } from './offers';

const sellerId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const tenantId = 'bbbbbbbbbbbbbbbbbbbbbbbb';

function createTestApp(role: 'seller' | 'trade_desk') {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = {
      id: role === 'seller' ? sellerId : 'cccccccccccccccccccccccc',
      email: `${role}@example.com`,
      role,
      tenantId,
      status: 'active',
    };
    next();
  });
  app.use('/offers', offersRouter);
  return app;
}

function setupOffer() {
  const offer = {
    _id: 'offer-1',
    submissionId: 'submission-1',
    version: 1,
    amount: 10000,
    expiresAt: new Date(Date.now() + 60_000),
    notes: '',
    status: 'pending',
    createdByRole: 'trade_desk',
    createdBy: 'desk-user',
    save: vi.fn().mockResolvedValue(undefined),
  };
  const submission = {
    _id: 'dddddddddddddddddddddddd',
    sellerId: { toString: () => sellerId },
    tenantId: { toString: () => tenantId },
    referenceId: 'STV-2026-00001',
    status: 'offer_sent',
    save: vi.fn().mockResolvedValue(undefined),
  };
  mocks.findOfferById.mockResolvedValue(offer);
  mocks.findLatestOffer.mockReturnValue({ sort: () => Promise.resolve(offer) });
  mocks.findSubmissionById.mockResolvedValue(submission);
  mocks.countOffers.mockResolvedValue(1);
  mocks.createAuditLog.mockResolvedValue(undefined);
  mocks.notify.mockResolvedValue(undefined);
  mocks.getDeskRecipients.mockResolvedValue([]);
  mocks.getSeller.mockResolvedValue({ email: 'seller@example.com' });
  return { offer, submission };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('offer negotiation status', () => {
  it('sets in_negotiation when the seller submits a counter-offer', async () => {
    const { offer, submission } = setupOffer();
    mocks.createOffer.mockImplementation(async (input) => ({ ...input, _id: 'counter-1' }));

    const response = await request(createTestApp('seller'))
      .post('/offers/offer-1/counter')
      .send({ amount: 11000, notes: 'New tires' });

    expect(response.status).toBe(201);
    expect(offer.status).toBe('superseded');
    expect(submission.status).toBe('in_negotiation');
    expect(submission.save).toHaveBeenCalledOnce();
  });

  it('stays in negotiation when the desk declines the seller counter', async () => {
    const { offer, submission } = setupOffer();
    offer.createdByRole = 'seller';
    offer.notes = 'Seller counter';
    submission.status = 'in_negotiation';

    const response = await request(createTestApp('trade_desk')).post('/offers/offer-1/decline');

    expect(response.status).toBe(200);
    expect(offer.status).toBe('declined');
    expect(submission.status).toBe('in_negotiation');
    expect(submission.save).toHaveBeenCalledOnce();
  });

  it('allows another seller counter after desk decline, even when the declined offer expired', async () => {
    const { offer, submission } = setupOffer();
    offer.createdByRole = 'seller';
    offer.status = 'declined';
    offer.expiresAt = new Date('2000-01-01T00:00:00.000Z');
    submission.status = 'submitted';
    mocks.createOffer.mockImplementation(async (input) => ({ ...input, _id: 'counter-2' }));

    const response = await request(createTestApp('seller'))
      .post('/offers/offer-1/counter')
      .send({ amount: 12000 });

    expect(response.status).toBe(201);
    expect(offer.status).toBe('declined');
    expect(offer.save).not.toHaveBeenCalled();
    expect(mocks.createOffer).toHaveBeenCalledWith(
      expect.objectContaining({ version: 2, status: 'pending', createdByRole: 'seller' }),
    );
    expect(new Date(response.body.expiresAt).getTime()).toBeGreaterThan(Date.now());
    expect(submission.status).toBe('in_negotiation');
  });

  it('rejects counters after the desk explicitly closes the submission', async () => {
    const { offer, submission } = setupOffer();
    offer.createdByRole = 'seller';
    offer.status = 'declined';
    submission.status = 'closed';

    const response = await request(createTestApp('seller'))
      .post('/offers/offer-1/counter')
      .send({ amount: 12000 });

    expect(response.status).toBe(409);
    expect(mocks.createOffer).not.toHaveBeenCalled();
  });

  it('rejects a counter against a stale offer version', async () => {
    const { offer } = setupOffer();
    mocks.findLatestOffer.mockReturnValue({
      sort: () => Promise.resolve({ ...offer, _id: 'newer-offer', version: 2 }),
    });

    const response = await request(createTestApp('seller'))
      .post('/offers/offer-1/counter')
      .send({ amount: 12000 });

    expect(response.status).toBe(409);
    expect(mocks.createOffer).not.toHaveBeenCalled();
  });
});