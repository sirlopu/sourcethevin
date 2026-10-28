const BRAND_CAPITALIZATION: Record<string, string> = {
  BMW: 'BMW',
  FIAT: 'FIAT',
  GMC: 'GMC',
  MINI: 'MINI',
  RAM: 'RAM',
};

export interface VehicleDisplayFields {
  year?: number | string | null;
  make?: string | null;
  model?: string | null;
  trim?: string | null;
}

export function formatVehicleMake(make: string | null | undefined): string {
  const trimmed = make?.trim() ?? '';
  if (!trimmed) return '';

  const normalized = trimmed.toUpperCase();
  return (
    BRAND_CAPITALIZATION[normalized] ??
    trimmed.toLowerCase().replace(/\b\w/g, (character) => character.toUpperCase())
  );
}

export function vehicleLabel(vehicle: VehicleDisplayFields, fallback = 'Vehicle'): string {
  return (
    [vehicle.year, formatVehicleMake(vehicle.make), vehicle.model, vehicle.trim]
      .filter(Boolean)
      .join(' ') || fallback
  );
}
