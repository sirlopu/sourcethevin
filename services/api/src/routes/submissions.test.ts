import type { NextFunction, Request, Response } from 'express';
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findSubmissionById, findValuationOneAndUpdate } = vi.hoisted(() => ({
  findSubmissionById: vi.fn(),
  findValuationOneAndUpdate: vi.fn(),
}));

vi.mock('../middleware/requireAuth', () => ({
  requireAuth: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

vi.mock('../models/Submission', () => ({
  SUBMISSION_STATUSES: ['new', 'submitted', 'offer_sent', 'accepted', 'declined'],
  Submission: { findById: findSubmissionById },
}));

vi.mock('../models/ValuationWorkspace', () => ({
  ValuationWorkspace: { findOneAndUpdate: findValuationOneAndUpdate },
}));

import { submissionsRouter } from './submissions';

const valuationInput = {
  bidReferences: [],
  estimatedExpenses: { transport: 0, recon: 0, arbitrationCondition: 0, other: 0 },
  targetMargin: 0,
};

function createTestApp(role: 'trade_desk' | 'seller' = 'trade_desk') {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = {
      id: 'desk-user',
      email: 'desk@example.com',
      role,
      tenantId: 'tenant-1',
      status: 'active',
    };
    next();
  });
  app.use('/submissions', submissionsRouter);
  return app;
}

describe('PUT /submissions/:id/valuation internal notes', () => {
  beforeEach(() => {
    findSubmissionById.mockReset().mockResolvedValue({
      _id: 'submission-1',
      tenantId: 'tenant-1',
    });
    findValuationOneAndUpdate.mockReset().mockResolvedValue({
      submissionId: 'submission-1',
      internalNoteHistory: [{ text: 'Existing internal note', createdAt: new Date() }],
    });
  });

  it('does not modify note history when valuation data is saved', async () => {
    const response = await request(createTestApp())
      .put('/submissions/submission-1/valuation')
      .send(valuationInput);

    expect(response.status).toBe(200);
    expect(findValuationOneAndUpdate.mock.calls[0]?.[1]).not.toHaveProperty('$push');
    expect(findValuationOneAndUpdate.mock.calls[0]?.[1]).not.toHaveProperty('internalNoteHistory');
  });

  it('appends a timestamped note and requests newest-first ordering', async () => {
    findValuationOneAndUpdate.mockResolvedValueOnce({
      submissionId: 'submission-1',
      internalNoteHistory: [
        { text: 'New note', createdAt: '2026-10-03T12:00:00.000Z' },
        { text: 'Existing internal note', createdAt: '2026-10-02T12:00:00.000Z' },
      ],
    });
    const response = await request(createTestApp())
      .post('/submissions/submission-1/valuation/notes')
      .send({ text: '  New note  ' });

    expect(response.status).toBe(200);
    const [filter, update] = findValuationOneAndUpdate.mock.calls[0] ?? [];
    expect(filter).toEqual({ submissionId: 'submission-1', tenantId: 'tenant-1' });
    expect(update.$push.internalNoteHistory.$each[0].text).toBe('New note');
    expect(update.$push.internalNoteHistory.$sort).toEqual({ createdAt: -1 });
    expect(response.body.internalNoteHistory[0].text).toBe('New note');
  });

  it('rejects blank notes without appending', async () => {
    const response = await request(createTestApp())
      .post('/submissions/submission-1/valuation/notes')
      .send({ text: '   ' });

    expect(response.status).toBe(400);
    expect(findValuationOneAndUpdate).not.toHaveBeenCalled();
  });

  it('restricts note history writes to the trade desk role', async () => {
    const response = await request(createTestApp('seller'))
      .post('/submissions/submission-1/valuation/notes')
      .send({ text: 'Not permitted' });

    expect(response.status).toBe(403);
    expect(findSubmissionById).not.toHaveBeenCalled();
  });

  it('rejects submissions outside the desk tenant', async () => {
    findSubmissionById.mockResolvedValueOnce({
      _id: 'submission-1',
      tenantId: 'another-tenant',
    });

    const response = await request(createTestApp())
      .post('/submissions/submission-1/valuation/notes')
      .send({ text: 'Not permitted' });

    expect(response.status).toBe(404);
    expect(findValuationOneAndUpdate).not.toHaveBeenCalled();
  });
});