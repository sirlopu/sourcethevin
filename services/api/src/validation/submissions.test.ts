import { describe, expect, it } from 'vitest';
import { listSubmissionsQuerySchema } from './submissions';

describe('listSubmissionsQuerySchema', () => {
  it('accepts the in-negotiation status', () => {
    expect(listSubmissionsQuerySchema.safeParse({ status: 'in_negotiation' }).success).toBe(true);
  });
});
