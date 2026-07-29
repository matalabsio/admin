/** Normalise Indian mobile input to digits only (10-digit national, no country code in return). */
export function normalizeIndiaMobile(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.length >= 12 && digits.startsWith("91")) {
    return digits.slice(-10);
  }
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
}

export function isValidIndiaMobile10(digits: string): boolean {
  return /^[6-9]\d{9}$/.test(digits);
}

export function toIndiaE164(digits10: string): string {
  return `+91${digits10}`;
}

export function formatIndiaDisplay(digits10: string): string {
  if (digits10.length !== 10) return digits10;
  return `+91 ${digits10.slice(0, 5)} ${digits10.slice(5)}`;
}
