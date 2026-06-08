import type { PrescriptionCreatedBy } from "../types";

const HUBSPOT_BASE = "https://api.hubapi.com";

export function normalizeCreatedByInput(
  raw: { id?: string; email?: string; name?: string } | undefined | null
): PrescriptionCreatedBy | undefined {
  if (!raw) return undefined;

  const id = raw.id?.trim() || raw.email?.trim();
  if (!id) return undefined;

  const email = raw.email?.trim();
  const name = raw.name?.trim();

  return {
    id,
    ...(email ? { email } : {}),
    ...(name ? { name } : {}),
  };
}

export async function resolveCreatedBy(
  token: string,
  partial: PrescriptionCreatedBy | undefined
): Promise<PrescriptionCreatedBy | undefined> {
  if (!partial) return undefined;

  let { id, email, name } = partial;
  if (!id && email) id = email;
  if (!id) return undefined;

  if (/^\d+$/.test(id)) {
    try {
      const res = await fetch(`${HUBSPOT_BASE}/settings/v3/users/${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const user = await res.json();
        return {
          id: String(user.id ?? id),
          email: user.email ?? email,
          name:
            [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
            name,
        };
      }
    } catch (err) {
      console.error("resolveCreatedBy user lookup failed", err);
    }
  }

  return {
    id,
    ...(email ? { email } : {}),
    ...(name ? { name } : {}),
  };
}
