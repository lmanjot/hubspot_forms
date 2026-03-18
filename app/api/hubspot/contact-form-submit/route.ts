import { NextRequest, NextResponse } from "next/server";

const HUBSPOT_BASE = "https://api.hubapi.com";

type Payload = {
  language?: "de" | "en";
  values: Record<string, string>;
  contactId?: string;
};

/** Build contact properties from form values. Keys are HubSpot property names from the stored schema. */
function buildContactProperties(values: Record<string, string>): Record<string, string> {
  const properties: Record<string, string> = {};
  for (const [key, value] of Object.entries(values)) {
    if (typeof value === "string" && value.trim().length > 0) {
      properties[key] = value.trim();
    }
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

  const properties = buildContactProperties(body.values || {});

  if (body.contactId) {
    if (Object.keys(properties).length === 0) {
      return NextResponse.json(
        { error: "No properties to update" },
        { status: 400 }
      );
    }
  } else {
    if (Object.keys(properties).length === 0) {
      return NextResponse.json(
        { error: "Missing identification (contactId or form values)" },
        { status: 400 }
      );
    }
  }

  try {
    const targetUrl = body.contactId
      ? `${HUBSPOT_BASE}/crm/v3/objects/contacts/${encodeURIComponent(
          body.contactId
        )}`
      : `${HUBSPOT_BASE}/crm/v3/objects/contacts`;

    const method = body.contactId ? "PATCH" : "POST";

    const res = await fetch(targetUrl, {
      method,
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
