import type { PrescriptionHistoryEntry } from "../types";

export const PRESCRIPTION_JSON_PROPERTY = "prescription_json";

export function parsePrescriptionHistory(raw: unknown): PrescriptionHistoryEntry[] {
  if (typeof raw !== "string" || raw.trim().length === 0) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(isValidEntry);
    }
    if (isValidEntry(parsed)) return [parsed];
  } catch {
    return [];
  }

  return [];
}

function isValidEntry(value: unknown): value is PrescriptionHistoryEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.id === "string" &&
    typeof entry.createdAt === "string" &&
    typeof entry.fileId === "string" &&
    typeof entry.filename === "string" &&
    typeof entry.diagnosis === "string" &&
    Array.isArray(entry.medications)
  );
}

export function appendPrescriptionHistory(
  existing: PrescriptionHistoryEntry[],
  entry: PrescriptionHistoryEntry
): PrescriptionHistoryEntry[] {
  return [entry, ...existing];
}
