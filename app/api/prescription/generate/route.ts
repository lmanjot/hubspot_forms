import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { buildPrescriptionPdf } from "../../../prescription/lib/buildPrescriptionPdf";
import {
  buildPrescriptionFilename,
  patientFromHubSpotProps,
} from "../../../prescription/lib/formatPatient";
import { getSignedFileUrl, uploadPdfToHubSpot } from "../../../prescription/lib/hubspotFiles";
import {
  PRESCRIPTION_JSON_PROPERTY,
  appendPrescriptionHistory,
  parsePrescriptionHistory,
} from "../../../prescription/lib/prescriptionHistory";
import type { MedicationRow, PrescriptionCreatedBy, PrescriptionHistoryEntry } from "../../../prescription/types";

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

type GenerateBody = {
  contactId?: string;
  diagnosis?: string;
  medications?: { name?: string; usage?: string; remarks?: string }[];
  createdBy?: {
    id?: string;
    email?: string;
    name?: string;
  };
};

function normalizeCreatedBy(
  raw: GenerateBody["createdBy"]
): PrescriptionCreatedBy | undefined {
  const id = raw?.id?.trim();
  if (!id) return undefined;

  const email = raw?.email?.trim();
  const name = raw?.name?.trim();

  return {
    id,
    ...(email ? { email } : {}),
    ...(name ? { name } : {}),
  };
}

function normalizeMedications(
  raw: GenerateBody["medications"]
): MedicationRow[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;

  const rows: MedicationRow[] = [];
  for (const item of raw) {
    const name = (item?.name ?? "").trim();
    if (!name) return null;
    rows.push({
      name,
      usage: (item?.usage ?? "").trim(),
      remarks: (item?.remarks ?? "").trim(),
    });
  }

  return rows;
}

export async function POST(req: NextRequest) {
  const token = process.env.HUBSPOT_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "HubSpot configuration missing on server" },
      { status: 500 }
    );
  }

  let body: GenerateBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const contactId = body.contactId?.trim();
  const diagnosis = body.diagnosis?.trim();
  const medications = normalizeMedications(body.medications);
  const createdBy = normalizeCreatedBy(body.createdBy);

  if (!contactId) {
    return NextResponse.json({ error: "Missing contactId" }, { status: 400 });
  }
  if (!diagnosis) {
    return NextResponse.json({ error: "Diagnose ist erforderlich" }, { status: 400 });
  }
  if (!medications) {
    return NextResponse.json(
      { error: "Mindestens ein Medikament mit Name ist erforderlich" },
      { status: 400 }
    );
  }

  const hubspotUrl = new URL(
    `${HUBSPOT_BASE}/crm/v3/objects/contacts/${encodeURIComponent(contactId)}`
  );
  for (const property of PATIENT_PROPERTIES) {
    hubspotUrl.searchParams.append("properties", property);
  }

  try {
    const contactRes = await fetch(hubspotUrl.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const contactJson = await contactRes.json();

    if (!contactRes.ok) {
      return NextResponse.json(
        { error: "HubSpot contact fetch failed", details: contactJson },
        { status: contactRes.status }
      );
    }

    const props = (contactJson?.properties ?? {}) as Record<string, string | undefined>;
    const patient = patientFromHubSpotProps(props);
    const issuedAt = new Date();
    const filename = buildPrescriptionFilename(patient.lastname, issuedAt);

    const pdfBytes = await buildPrescriptionPdf({
      patient,
      diagnosis,
      medications,
      issuedAt,
    });

    const fileId = await uploadPdfToHubSpot(token, pdfBytes, filename);
    const downloadUrl = await getSignedFileUrl(token, fileId);

    const entry: PrescriptionHistoryEntry = {
      id: randomUUID(),
      createdAt: issuedAt.toISOString(),
      fileId,
      filename,
      diagnosis,
      medications: medications.map((m) => ({
        name: m.name,
        ...(m.usage ? { usage: m.usage } : {}),
        ...(m.remarks ? { remarks: m.remarks } : {}),
      })),
      ...(createdBy ? { createdBy } : {}),
    };

    const existing = parsePrescriptionHistory(props[PRESCRIPTION_JSON_PROPERTY]);
    const history = appendPrescriptionHistory(existing, entry);

    const patchRes = await fetch(hubspotUrl.toString(), {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: {
          [PRESCRIPTION_JSON_PROPERTY]: JSON.stringify(history),
        },
      }),
    });

    if (!patchRes.ok) {
      const patchJson = await patchRes.json().catch(() => ({}));
      console.error("Failed to update prescription_json", patchJson);
      return NextResponse.json(
        {
          error:
            "PDF erstellt, aber Speichern in HubSpot fehlgeschlagen. Bitte prüfen Sie, ob die Eigenschaft prescription_json existiert.",
          details: patchJson,
        },
        { status: 502 }
      );
    }

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Prescription-Id": entry.id,
        ...(downloadUrl ? { "X-Prescription-Download-Url": downloadUrl } : {}),
      },
    });
  } catch (err) {
    console.error("Prescription generate error", err);
    const message = err instanceof Error ? err.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
