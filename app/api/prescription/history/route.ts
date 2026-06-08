import { NextRequest, NextResponse } from "next/server";
import { getSignedFileUrl } from "../../../prescription/lib/hubspotFiles";
import { patientFromHubSpotProps } from "../../../prescription/lib/formatPatient";
import {
  PRESCRIPTION_JSON_PROPERTY,
  parsePrescriptionHistory,
} from "../../../prescription/lib/prescriptionHistory";
import type { PrescriptionHistoryResponse } from "../../../prescription/types";

const HUBSPOT_BASE = "https://api.hubapi.com";

const PATIENT_PROPERTIES = [
  "firstname",
  "lastname",
  "address",
  "zip",
  "city",
  "birthdate",
  PRESCRIPTION_JSON_PROPERTY,
];

export async function GET(req: NextRequest) {
  const token = process.env.HUBSPOT_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "HubSpot configuration missing on server" },
      { status: 500 }
    );
  }

  const contactId = req.nextUrl.searchParams.get("contact_id");
  if (!contactId) {
    return NextResponse.json({ error: "Missing contact_id" }, { status: 400 });
  }

  const hubspotUrl = new URL(
    `${HUBSPOT_BASE}/crm/v3/objects/contacts/${encodeURIComponent(contactId)}`
  );
  for (const property of PATIENT_PROPERTIES) {
    hubspotUrl.searchParams.append("properties", property);
  }

  try {
    const res = await fetch(hubspotUrl.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: "HubSpot contact fetch failed", details: json },
        { status: res.status }
      );
    }

    const props = (json?.properties ?? {}) as Record<string, string | undefined>;
    const history = parsePrescriptionHistory(props[PRESCRIPTION_JSON_PROPERTY]);

    const prescriptions = await Promise.all(
      history.map(async (entry) => ({
        ...entry,
        downloadUrl: await getSignedFileUrl(token, entry.fileId),
      }))
    );

    const body: PrescriptionHistoryResponse = {
      patient: patientFromHubSpotProps(props),
      prescriptions,
    };

    return NextResponse.json(body, { status: 200 });
  } catch (err) {
    console.error("Prescription history error", err);
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
