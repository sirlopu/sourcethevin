import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

describe('refresh cookie SameSite', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('defaults to SameSite=Lax', async () => {
    const response = await request(createApp()).post('/auth/logout');
    expect(response.status).toBe(204);
    expect(response.headers['set-cookie']?.[0]).toMatch(/SameSite=Lax/);
  });

  it('uses SameSite=None; Secure for cross-site deployments', async () => {
    vi.stubEnv('COOKIE_SAMESITE', 'none');
    const response = await request(createApp()).post('/auth/logout');
    expect(response.status).toBe(204);
    const cookie = response.headers['set-cookie']?.[0] ?? '';
    expect(cookie).toMatch(/SameSite=None/);
    expect(cookie).toMatch(/Secure/);
  });
});
