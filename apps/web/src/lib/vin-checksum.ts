const TRANSLITERATION: Record<string, number> = {
  A: 1,
  B: 2,
  C: 3,
  D: 4,
  E: 5,
  F: 6,
  G: 7,
  H: 8,
  J: 1,
  K: 2,
  L: 3,
  M: 4,
  N: 5,
  P: 7,
  R: 9,
  S: 2,
  T: 3,
  U: 4,
  V: 5,
  W: 6,
  X: 7,
  Y: 8,
  Z: 9,
};

const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

/** ISO 3779 VIN check-digit validation (position 9). Returns false for anything not shaped like a VIN. */
export function isValidVinChecksum(vin: string): boolean {
  const value = vin.trim().toUpperCase();
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(value)) {
    return false;
  }

  let sum = 0;
  for (let i = 0; i < 17; i += 1) {
    const char = value[i]!;
    const digit = /[0-9]/.test(char) ? Number(char) : TRANSLITERATION[char];
    if (digit === undefined) return false;
    sum += digit * WEIGHTS[i]!;
  }

  const remainder = sum % 11;
  const expected = remainder === 10 ? 'X' : String(remainder);
  return value[8] === expected;
}
