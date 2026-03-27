import { NextRequest, NextResponse } from "next/server";

import { normalizeBirthdateForHubSpot } from "../../../medical_questionnaire/birthdate";
import type { Language } from "../../../medical_questionnaire/schema";

const HUBSPOT_BASE = "https://api.hubapi.com";

type Payload = {
  values: Record<string, string>;
  contactId?: string;
  finalSubmit?: boolean;
  language?: Language;
};

function normalizePhoneForHubSpot(phone: string) {
  let normalized = phone.replace(/[^\d+]/g, "");
  if (!normalized.startsWith("+")) {
    normalized = `+${normalized.replace(/\+/g, "")}`;
  }

  const countryCodes = ["41", "49", "43", "33", "39", "44", "1"];
  for (const cc of countryCodes) {
    const prefix = `+${cc}`;
    if (normalized.startsWith(prefix)) {
      // Strip a leading 0 in the national part (e.g. +41 0xxx -> +41xxx).
      const rest = normalized.slice(prefix.length).replace(/^0+/, "");
      return `${prefix}${rest}`;
    }
  }

  return normalized;
}

function buildContactProperties(values: Record<string, string>): Record<string, string> {
  const properties: Record<string, string> = {};

  for (const [key, value] of Object.entries(values)) {
    if (typeof value === "string") {
      properties[key] = value;
    }
  }

  if (typeof properties.phone === "string" && properties.phone.trim().length > 0) {
    const normalizedPhone = normalizePhoneForHubSpot(properties.phone);
    properties.phone = normalizedPhone;
    properties.mobilephone = normalizedPhone;
  }

  if (typeof properties.birthdate === "string" && properties.birthdate.trim().length > 0) {
    properties.birthdate = normalizeBirthdateForHubSpot(properties.birthdate);
  }

  return properties;
}

async function appendMedicalQuestionnaireJson(
  token: string,
  contactId: string,
  values: Record<string, string>,
  language: Language
) {
  const contactUrl = new URL(
    `${HUBSPOT_BASE}/crm/v3/objects/contacts/${encodeURIComponent(contactId)}`
  );
  contactUrl.searchParams.set("properties", "medical_questionnaire_json");

  let existingRaw: unknown = null;
  try {
    const res = await fetch(contactUrl.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const json = await res.json().catch(() => ({} as any));
    existingRaw = (json?.properties as any)?.medical_questionnaire_json ?? null;
  } catch (err) {
    console.error("Failed to fetch existing medical_questionnaire_json", err);
  }

  let history: any[] = [];
  if (typeof existingRaw === "string" && existingRaw.trim().length > 0) {
    try {
      const parsed = JSON.parse(existingRaw);
      if (Array.isArray(parsed)) history = parsed;
      else history = [parsed];
    } catch {
      // If it's not valid JSON, keep it as a historical blob.
      history = [{ previousRaw: existingRaw }];
    }
  }

  history.push({
    timestamp: new Date().toISOString(),
    language,
    values,
  });

  return JSON.stringify(history);
}

function parseMissingPropertyNames(errorText: string): string[] {
  const missing = new Set<string>();
  const trimmed = errorText.trim();
  if (!trimmed) return [];

  const tryAddFromJson = (input: unknown) => {
    if (!input || typeof input !== "object") return;
    const record = input as Record<string, unknown>;
    const errors = Array.isArray(record.errors) ? record.errors : [];
    for (const err of errors) {
      if (!err || typeof err !== "object") continue;
      const errRecord = err as Record<string, unknown>;
      const context = errRecord.context as Record<string, unknown> | undefined;
      const propertyNames = Array.isArray(context?.propertyName)
        ? context?.propertyName
        : [];
      for (const prop of propertyNames) {
        if (typeof prop === "string" && prop.trim()) missing.add(prop.trim());
      }
    }
  };

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    tryAddFromJson(parsed);
  } catch {
    // ignore parse error
  }

  for (const match of trimmed.matchAll(/"name":"([^"]+)"/g)) {
    if (match[1]) missing.add(match[1]);
  }
  for (const match of trimmed.matchAll(/"propertyName":\["([^"]+)"\]/g)) {
    if (match[1]) missing.add(match[1]);
  }

  return [...missing];
}

async function patchContactWithFallback(
  targetUrl: string,
  token: string,
  initialProperties: Record<string, string>
) {
  const patchOnce = async (properties: Record<string, string>) => {
    const res = await fetch(targetUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ properties }),
    });
    const text = await res.text().catch(() => "");
    return { res, text };
  };

  const firstAttempt = await patchOnce(initialProperties);
  if (firstAttempt.res.ok) return { ok: true as const };

  const missingProps = parseMissingPropertyNames(firstAttempt.text);
  if (missingProps.length === 0) {
    return { ok: false as const, details: firstAttempt.text };
  }

  const retryProperties = { ...initialProperties };
  let removedAny = false;
  for (const missingProp of missingProps) {
    if (missingProp in retryProperties) {
      delete retryProperties[missingProp];
      removedAny = true;
    }
  }

  if (!removedAny || Object.keys(retryProperties).length === 0) {
    return { ok: false as const, details: firstAttempt.text };
  }

  const secondAttempt = await patchOnce(retryProperties);
  if (secondAttempt.res.ok) return { ok: true as const };

  return { ok: false as const, details: secondAttempt.text || firstAttempt.text };
}

export async function POST(req: NextRequest) {
  const token = process.env.HUBSPOT_TOKEN;

  if (!token) {
    return NextResponse.json(
      { error: "HubSpot configuration missing on server" },
      { status: 500 }
    );
  }

  let body: Payload;

  try {
    body = (await req.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.contactId) {
    return NextResponse.json(
      { error: "Missing contactId for contact update" },
      { status: 400 }
    );
  }

  const properties = buildContactProperties(body.values || {});

  if (Object.keys(properties).length === 0) {
    return NextResponse.json(
      { error: "No properties provided" },
      { status: 400 }
    );
  }

  if (body.finalSubmit) {
    try {
      const lang: Language = body.language === "de" ? "de" : "en";
      const historyJson = await appendMedicalQuestionnaireJson(
        token,
        body.contactId,
        body.values || {},
        lang
      );
      properties.medical_questionnaire_json = historyJson;
    } catch (err) {
      console.error("Failed to append medical_questionnaire_json", err);
    }
  }

  const targetUrl = `${HUBSPOT_BASE}/crm/v3/objects/contacts/${encodeURIComponent(
    body.contactId
  )}`;

  try {
    const result = await patchContactWithFallback(
      targetUrl,
      token,
      properties
    );
    if (!result.ok) {
      return NextResponse.json(
        { error: "HubSpot request failed", details: result.details },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("HubSpot error", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}

