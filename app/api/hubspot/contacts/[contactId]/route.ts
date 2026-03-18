import { NextRequest, NextResponse } from "next/server";

const HUBSPOT_BASE = "https://api.hubapi.com";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ contactId: string }> }
) {
  const token = process.env.HUBSPOT_TOKEN;

  if (!token) {
    return NextResponse.json(
      { error: "HubSpot configuration missing on server" },
      { status: 500 }
    );
  }

  const { contactId } = await context.params;

  if (!contactId) {
    return NextResponse.json(
      { error: "Missing contactId in URL" },
      { status: 400 }
    );
  }

  const requestUrl = new URL(req.url);
  const requestedProperties = requestUrl.searchParams
    .getAll("properties")
    .flatMap((item) => item.split(","))
    .map((item) => item.trim())
    .filter(Boolean);

  const hubspotUrl = new URL(
    `${HUBSPOT_BASE}/crm/v3/objects/contacts/${encodeURIComponent(contactId)}`
  );

  for (const property of requestedProperties) {
    hubspotUrl.searchParams.append("properties", property);
  }

  try {
    const res = await fetch(hubspotUrl.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const json = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: "HubSpot contact fetch failed", details: json },
        { status: res.status }
      );
    }

    return NextResponse.json(json, { status: 200 });
  } catch (err) {
    console.error("HubSpot contacts error", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}

