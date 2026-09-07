import { vinDecodeResultSchema, type VinDecodeResult } from '@sourcethevin/shared';

const VPIC_BASE_URL = 'https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues';

interface VpicRawResult {
  ModelYear?: string;
  Make?: string;
  Model?: string;
  Trim?: string;
  Trim2?: string;
  DriveType?: string;
  EngineCylinders?: string;
  DisplacementL?: string;
  EngineConfiguration?: string;
  FuelTypePrimary?: string;
}

interface VpicResponse {
  Results?: VpicRawResult[];
}

function nullableTrim(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseIntOrNull(value: string | undefined): number | null {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function titleCase(value: string | null): string | null {
  if (!value) return value;
  return value.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeFuelType(value: string | undefined): string | null {
  const fuel = value?.trim().toLowerCase();
  if (!fuel) return null;
  if (fuel.startsWith('gasoline')) return 'Gas';
  if (fuel.startsWith('diesel')) return 'Diesel';
  if (fuel.startsWith('electric')) return 'Electric';
  if (fuel.includes('flexible fuel')) return 'Flex Fuel';
  if (fuel.startsWith('hybrid')) return 'Hybrid';
  return nullableTrim(value);
}

function buildEngineDescription(raw: VpicRawResult): string | null {
  const parts: string[] = [];

  const displacement = Number.parseFloat(raw.DisplacementL ?? '');
  if (!Number.isNaN(displacement)) {
    parts.push(`${displacement.toFixed(1)}L`);
  }

  const cylinders = nullableTrim(raw.EngineCylinders);
  if (cylinders) {
    const configuration = raw.EngineConfiguration?.trim().toLowerCase() ?? '';
    const prefix = configuration.startsWith('v')
      ? 'V'
      : configuration.startsWith('inline')
        ? 'I'
        : '';
    parts.push(`${prefix}${cylinders}`);
  }

  const fuel = normalizeFuelType(raw.FuelTypePrimary);
  if (fuel) {
    parts.push(fuel);
  }

  return parts.length > 0 ? parts.join(' ') : null;
}

function normalizeVpicResult(vin: string, raw: VpicRawResult): VinDecodeResult {
  return vinDecodeResultSchema.parse({
    vin,
    year: parseIntOrNull(raw.ModelYear),
    make: titleCase(nullableTrim(raw.Make)),
    model: nullableTrim(raw.Model),
    trim: nullableTrim(raw.Trim) ?? nullableTrim(raw.Trim2),
    drivetrain: nullableTrim(raw.DriveType),
    engine: buildEngineDescription(raw),
  });
}

export async function fetchVpicDecode(vin: string): Promise<VinDecodeResult> {
  const response = await fetch(`${VPIC_BASE_URL}/${encodeURIComponent(vin)}?format=json`);
  if (!response.ok) {
    throw new Error(`vPIC request failed with status ${response.status}`);
  }

  const body = (await response.json()) as VpicResponse;
  const raw = body.Results?.[0];
  if (!raw) {
    throw new Error('vPIC returned no results');
  }

  return normalizeVpicResult(vin, raw);
}
