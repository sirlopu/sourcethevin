import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchVpicDecode } from './vpic';

function mockFetchOnce(results: Record<string, string>[]) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ Results: results }),
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchVpicDecode', () => {
  it('normalizes a full vPIC result into the shared shape', async () => {
    mockFetchOnce([
      {
        ModelYear: '2003',
        Make: 'HONDA',
        Model: 'Accord',
        Trim: 'EX-V6',
        DriveType: 'FWD/Front Wheel Drive',
        EngineCylinders: '6',
        DisplacementL: '2.998832712',
        EngineConfiguration: 'V-Shaped',
        FuelTypePrimary: 'Gasoline',
      },
    ]);

    const result = await fetchVpicDecode('1HGCM82633A004352');

    expect(result).toEqual({
      vin: '1HGCM82633A004352',
      year: 2003,
      make: 'Honda',
      model: 'Accord',
      trim: 'EX-V6',
      drivetrain: 'FWD/Front Wheel Drive',
      engine: '3.0L V6 Gas',
    });
  });

  it('fills unavailable fields with null instead of throwing', async () => {
    mockFetchOnce([{ ModelYear: '', Make: '', Model: '', DriveType: '' }]);

    const result = await fetchVpicDecode('11111111111111111');

    expect(result).toEqual({
      vin: '11111111111111111',
      year: null,
      make: null,
      model: null,
      trim: null,
      drivetrain: null,
      engine: null,
    });
  });

  it('throws when vPIC returns no results', async () => {
    mockFetchOnce([]);
    await expect(fetchVpicDecode('1HGCM82633A004352')).rejects.toThrow('vPIC returned no results');
  });

  it('throws when the vPIC request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    await expect(fetchVpicDecode('1HGCM82633A004352')).rejects.toThrow(
      'vPIC request failed with status 503',
    );
  });
});
