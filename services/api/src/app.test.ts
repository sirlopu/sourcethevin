import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app';

describe('GET /health', () => {
  it('returns ok', async () => {
    const response = await request(createApp()).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});

describe('POST /vehicles', () => {
  it('accepts a valid vehicle', async () => {
    const response = await request(createApp())
      .post('/vehicles')
      .send({ vin: '1HGCM82633A004352', make: 'Honda', model: 'Accord', year: 2003 });
    expect(response.status).toBe(201);
  });

  it('rejects an invalid vehicle', async () => {
    const response = await request(createApp()).post('/vehicles').send({ vin: 'bad' });
    expect(response.status).toBe(400);
  });
});
