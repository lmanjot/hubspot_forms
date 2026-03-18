import { NextRequest, NextResponse } from "next/server";

const HUBSPOT_BASE = "https://api.hubapi.com";

type Payload = {
  values: Record<string, string>;
  contactId?: string;
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
    properties.mobilephonenumber = normalizedPhone;
  }

  return properties;
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

  const targetUrl = `${HUBSPOT_BASE}/crm/v3/objects/contacts/${encodeURIComponent(
    body.contactId
  )}`;

  try {
    const res = await fetch(targetUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ properties }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { error: "HubSpot request failed", details: text },
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

