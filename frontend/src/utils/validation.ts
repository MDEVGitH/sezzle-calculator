export type ParseResult = { ok: true; value: number } | { ok: false; error: string };

// Accepts integers, decimals (".5", "5.") and scientific notation ("1e3").
const NUMBER_PATTERN = /^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i;

/** Validates raw user input and converts it into a finite number. */
export function parseOperand(raw: string): ParseResult {
  const input = raw.trim();
  if (input === '') return { ok: false, error: 'Enter a number' };
  if (!NUMBER_PATTERN.test(input)) return { ok: false, error: 'Not a valid number' };
  const value = Number(input);
  if (!Number.isFinite(value)) return { ok: false, error: 'Number is too large' };
  return { ok: true, value };
}

/** Formats a result for display, avoiding float noise like 0.30000000000000004. */
export function formatNumber(n: number): string {
  if (n === 0) return '0';
  const abs = Math.abs(n);
  if (abs >= 1e15 || abs < 1e-9) return n.toExponential(6).replace(/\.?0+e/, 'e');
  return String(Number.parseFloat(n.toPrecision(12)));
}
