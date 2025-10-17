// Parse a string token as either decimal digits or Roman numerals into a number.
// Returns null if parsing fails.

const ROMAN_VALUES: Record<string, number> = {
  i: 1,
  v: 5,
  x: 10,
  l: 50,
  c: 100,
  d: 500,
  m: 1000,
};

export function romanToInt(s: string): number | null {
  if (!s) return null;
  const str = s.trim().toLowerCase();
  if (!/^[ivxlcdm]+$/.test(str)) return null;
  let total = 0;
  let prev = 0;
  for (let i = str.length - 1; i >= 0; i--) {
    const ch = str[i];
    const val = ROMAN_VALUES[ch];
    if (!val) return null;
    if (val < prev) total -= val; else total += val;
    prev = val;
  }
  return total;
}

export function parseNumericToken(s: string | undefined | null): number | null {
  if (!s) return null;
  const str = s.trim().toLowerCase();
  if (!str) return null;
  // Decimal digits
  if (/^\d+$/.test(str)) {
    const n = parseInt(str, 10);
    return isNaN(n) ? null : n;
  }
  // Roman numerals
  const r = romanToInt(str);
  return r ?? null;
}

export function isRomanToken(s: string | undefined | null): boolean {
  if (!s) return false;
  return /^[ivxlcdm]+$/i.test(s.trim());
}

export function isArabicToken(s: string | undefined | null): boolean {
  if (!s) return false;
  return /^\d+$/.test(s.trim());
}
