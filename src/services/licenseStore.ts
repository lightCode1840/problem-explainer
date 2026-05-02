export type LicenseTier = 'free' | 'pro';

export interface LicenseState {
  key: string;
  tier: LicenseTier;
  expiresAt: number;
  activatedAt: number;
  lastValidatedAt: number;
}

const LICENSE_KEY = 'pex_license';
const OFFLINE_GRACE_DAYS = 7;

export function getLicense(): LicenseState | null {
  try {
    const raw = localStorage.getItem(LICENSE_KEY);
    return raw ? (JSON.parse(raw) as LicenseState) : null;
  } catch {
    return null;
  }
}

export function getCurrentTier(): LicenseTier {
  const license = getLicense();
  if (!license) return 'free';
  if (license.expiresAt !== -1 && Date.now() > license.expiresAt) return 'free';
  const daysSince = (Date.now() - license.lastValidatedAt) / (1000 * 60 * 60 * 24);
  if (daysSince > OFFLINE_GRACE_DAYS) return 'free';
  return license.tier;
}

export function saveLicense(state: LicenseState): void {
  localStorage.setItem(LICENSE_KEY, JSON.stringify(state));
}

export function clearLicense(): void {
  localStorage.removeItem(LICENSE_KEY);
}

const LICENSE_SERVER = (typeof import.meta !== 'undefined' && (import.meta as { env?: { VITE_LICENSE_SERVER_URL?: string } }).env?.VITE_LICENSE_SERVER_URL) ?? 'https://license.problemexplainer.app';

export async function validateLicenseKey(key: string): Promise<LicenseState> {
  const res = await fetch(`${LICENSE_SERVER}/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Invalid key' }));
    throw new Error((err as { error?: string }).error ?? 'License validation failed');
  }
  const { tier, expiresAt } = await res.json() as { tier: LicenseTier; expiresAt: number };
  const state: LicenseState = {
    key, tier, expiresAt,
    activatedAt: Date.now(),
    lastValidatedAt: Date.now(),
  };
  saveLicense(state);
  return state;
}
