/**
 * P3 money: amounts are integers in minor units (ISO 4217 exponent 2 for every
 * supported currency, IDR included). The editor shows and accepts major units.
 */
import type { CURRENCIES } from "../types";

export type Currency = (typeof CURRENCIES)[number];

export const CURRENCY_META: Record<Currency, { symbol: string; locale: string; /** decimals shown/typed */ fraction: number }> = {
  IDR: { symbol: "Rp", locale: "id-ID", fraction: 0 },
  USD: { symbol: "$", locale: "en-US", fraction: 2 },
  SGD: { symbol: "S$", locale: "en-SG", fraction: 2 },
  MYR: { symbol: "RM", locale: "ms-MY", fraction: 2 },
};

/** Largest amount we accept: 1 billion major units. */
export const MAX_MAJOR = 1_000_000_000;

const meta = (c?: Currency) => CURRENCY_META[c ?? "IDR"];

/** 8500000 → "85.000" (no symbol), for an input's value. */
export function minorToInput(minor: number | undefined, c?: Currency): string {
  if (minor == null) return "";
  const m = meta(c);
  return new Intl.NumberFormat(m.locale, { minimumFractionDigits: 0, maximumFractionDigits: m.fraction }).format(minor / 100);
}

/** 8500000 → "Rp 85.000" */
export function formatMoney(minor: number, c?: Currency): string {
  return `${meta(c).symbol} ${minorToInput(minor, c)}`;
}

/**
 * Parse what someone typed into minor units, or undefined for empty.
 * IDR: every non-digit is a separator ("85.000", "85,000", "Rp 85 000" → 8500000);
 * "85rb"/"85k" and "1,5jt" shortcuts are understood. Others: the last "." or "," with
 * 1–2 digits after it is the decimal point. Returns NaN when unparseable.
 */
export function inputToMinor(raw: string, c?: Currency): number | undefined {
  let s = raw.trim().toLowerCase().replace(/^(rp|s\$|\$|rm)\s*/, "");
  if (!s) return undefined;
  const mult = /(rb|k)$/.test(s) ? 1e3 : /(jt|m)$/.test(s) ? 1e6 : 1;
  s = s.replace(/(rb|k|jt|m)$/, "").trim();
  if (mult > 1) {
    // "1,5jt" / "1.5jt": the separator is a decimal point here
    const n = Number(s.replace(",", "."));
    return Number.isFinite(n) && /^[0-9]+([.,][0-9]+)?$/.test(s) ? Math.round(n * mult * 100) : NaN;
  }
  if (meta(c).fraction === 0) {
    if (!/^[0-9][0-9.,\s]*$/.test(s)) return NaN;
    return Number(s.replace(/[^0-9]/g, "")) * 100;
  }
  if (!/^[0-9][0-9.,\s]*$/.test(s)) return NaN;
  const m = s.match(/^(.*)[.,]([0-9]{1,2})$/);
  const whole = (m ? m[1] : s).replace(/[^0-9]/g, "") || "0";
  const frac = m ? m[2].padEnd(2, "0") : "00";
  return Number(whole) * 100 + Number(frac);
}

export function moneyError(minor: number | undefined): string | null {
  if (minor === undefined) return null;
  if (Number.isNaN(minor)) return "Enter a number, like 85.000";
  if (minor < 0) return "Can't be negative";
  if (minor > MAX_MAJOR * 100) return "That's too large";
  return null;
}
