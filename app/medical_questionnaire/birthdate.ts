const DD_MM_YYYY = /^(\d{2})-(\d{2})-(\d{4})$/;

/** User input: digits only → DD-MM-YYYY with dashes (max 8 digits). */
export function formatBirthdateDigits(input: string): string {
  const d = input.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}-${d.slice(2)}`;
  return `${d.slice(0, 2)}-${d.slice(2, 4)}-${d.slice(4)}`;
}

/** Strict calendar check; returns YYYY-MM-DD for HubSpot date properties. */
export function parseDdMmYyyy(value: string): { isoYmd: string } | null {
  const m = DD_MM_YYYY.exec(value.trim());
  if (!m) return null;
  const dd = Number(m[1]);
  const mm = Number(m[2]);
  const yyyy = Number(m[3]);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  const dt = new Date(Date.UTC(yyyy, mm - 1, dd));
  if (dt.getUTCFullYear() !== yyyy || dt.getUTCMonth() !== mm - 1 || dt.getUTCDate() !== dd) return null;
  const isoYmd = `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  return { isoYmd };
}

/** Convert stored / API birthdate value to DD-MM-YYYY for display. */
export function hubspotBirthdateToDdMmYyyy(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (DD_MM_YYYY.test(trimmed)) return trimmed;
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const [y, m, day] = trimmed.slice(0, 10).split("-");
    return `${day}-${m}-${y}`;
  }
  if (/^\d+$/.test(trimmed)) {
    const n = Number(trimmed);
    if (!Number.isFinite(n)) return trimmed;
    const dt = new Date(n);
    if (Number.isNaN(dt.getTime())) return trimmed;
    const y = dt.getUTCFullYear();
    const mo = dt.getUTCMonth() + 1;
    const d = dt.getUTCDate();
    return `${String(d).padStart(2, "0")}-${String(mo).padStart(2, "0")}-${y}`;
  }
  return trimmed;
}

/** HubSpot accepts YYYY-MM-DD for date fields. */
export function normalizeBirthdateForHubSpot(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const p = parseDdMmYyyy(trimmed);
  return p ? p.isoYmd : trimmed;
}
