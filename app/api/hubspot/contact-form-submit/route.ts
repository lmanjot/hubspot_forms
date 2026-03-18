import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, PDFFont, StandardFonts, rgb } from "pdf-lib";
import {
  MEDICAL_QUESTIONNAIRE_SCHEMA,
  type Language,
  type QuestionDef,
} from "../../../medical_questionnaire/schema";

const HUBSPOT_BASE = "https://api.hubapi.com";

type Payload = {
  values: Record<string, string>;
  contactId?: string;
  language?: Language;
  finalSubmit?: boolean;
  pdfOnly?: boolean;
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
  }

  return properties;
}

function mapDisplayValue(question: QuestionDef, rawValue: string): string {
  if (!question.options || question.options.length === 0) {
    return rawValue;
  }

  const mapped = question.options.find((opt) => opt.value === rawValue);
  return mapped ? mapped.label : rawValue;
}

type PdfRow = {
  label: string;
  value: string;
  isAffirmative: boolean;
};

function buildPdfRows(
  values: Record<string, string>,
  language: Language
) {
  const questions = MEDICAL_QUESTIONNAIRE_SCHEMA[language];
  const rows: PdfRow[] = [];

  for (const question of questions) {
    const rawValue = values[question.name];
    if (typeof rawValue !== "string" || rawValue.trim().length === 0) {
      continue;
    }

    rows.push({
      label: question.label,
      value: mapDisplayValue(question, rawValue.trim()),
      isAffirmative: rawValue.trim() === "true",
    });
  }

  return rows;
}

function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number
) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];

  const lines: string[] = [];
  let current = words[0];

  for (let i = 1; i < words.length; i += 1) {
    const candidate = `${current} ${words[i]}`;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = words[i];
    }
  }

  lines.push(current);
  return lines;
}

async function generateQuestionnairePdf(
  values: Record<string, string>,
  language: Language,
  contactId: string
) {
  const rows = buildPdfRows(values, language);
  const pdf = await PDFDocument.create();
  let page = pdf.addPage([595, 842]);
  const width = page.getWidth();
  const height = page.getHeight();
  const margin = 40;
  const contentWidth = width - margin * 2;
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const lineGap = 16;
  const smallGap = 6;
  const labelSize = 10;
  const valueSize = 11;
  let y = height - margin;

  const title =
    language === "de"
      ? "Medizinischer Fragebogen"
      : "Medical Questionnaire";
  const generatedAt = new Date().toISOString();

  page.drawText(title, {
    x: margin,
    y,
    size: 18,
    font: bold,
    color: rgb(0.09, 0.15, 0.23),
  });
  y -= 26;

  page.drawText(`Contact ID: ${contactId}`, {
    x: margin,
    y,
    size: 10,
    font,
    color: rgb(0.35, 0.44, 0.54),
  });
  y -= 14;
  page.drawText(`Generated: ${generatedAt}`, {
    x: margin,
    y,
    size: 10,
    font,
    color: rgb(0.35, 0.44, 0.54),
  });
  y -= 24;

  for (const row of rows) {
    const labelLines = wrapText(row.label, bold, labelSize, contentWidth);
    const valueLines = wrapText(row.value, font, valueSize, contentWidth);
    const needed =
      labelLines.length * lineGap + valueLines.length * lineGap + smallGap;

    if (y - needed < margin) {
      page = pdf.addPage([595, 842]);
      y = page.getHeight() - margin;
    }

    const rowStartY = y;

    const labelColor = row.isAffirmative
      ? rgb(0.81, 0.12, 0.17)
      : rgb(0.1, 0.2, 0.3);
    const valueColor = row.isAffirmative
      ? rgb(0.81, 0.12, 0.17)
      : rgb(0.12, 0.12, 0.12);

    // Highlight affirmative answers with a red background behind the whole block.
    if (row.isAffirmative) {
      const padX = 6;
      const padY = 3;
      const bgX = margin - padX;
      const bgY = rowStartY - needed - padY;
      const bgW = contentWidth + padX * 2;
      const bgH = needed + padY * 2;

      page.drawRectangle({
        x: bgX,
        y: bgY,
        width: bgW,
        height: bgH,
        color: rgb(1, 0.2, 0.25),
        opacity: 0.16,
        borderColor: rgb(0.81, 0.12, 0.17),
        borderWidth: 1,
      });
    }

    for (const line of labelLines) {
      page.drawText(line, {
        x: margin,
        y,
        size: labelSize,
        font: bold,
        color: labelColor,
      });
      y -= lineGap;
    }

    for (const line of valueLines) {
      page.drawText(line, {
        x: margin,
        y,
        size: valueSize,
        font,
        color: valueColor,
      });
      y -= lineGap;
    }

    y -= smallGap;
  }

  return pdf.save();
}

async function uploadPdfToHubSpot(
  token: string,
  pdfBytes: Uint8Array,
  fileName: string
) {
  const file = new File([Buffer.from(pdfBytes)], fileName, {
    type: "application/pdf",
  });
  const formData = new FormData();
  formData.append("file", file);
  formData.append("fileName", fileName);
  formData.append("folderPath", "/medical-questionnaires");
  formData.append(
    "options",
    JSON.stringify({
      access: "PUBLIC_NOT_INDEXABLE",
      duplicateValidationStrategy: "NONE",
      duplicateValidationScope: "ENTIRE_PORTAL",
    })
  );

  const uploadRes = await fetch(`${HUBSPOT_BASE}/files/v3/files`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const uploadJson = (await uploadRes.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  if (!uploadRes.ok) {
    throw new Error(
      `HubSpot file upload failed: ${JSON.stringify(uploadJson)}`
    );
  }

  const fileUrl =
    (uploadJson.url as string | undefined) ||
    (uploadJson.defaultHostingUrl as string | undefined) ||
    (uploadJson.friendlyUrl as string | undefined) ||
    "";
  const fileId = uploadJson.id != null ? String(uploadJson.id) : "";

  return { fileUrl, fileId };
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

  if (!body.finalSubmit && !body.pdfOnly && Object.keys(properties).length === 0) {
    return NextResponse.json(
      { error: "No properties provided" },
      { status: 400 }
    );
  }

  if (body.finalSubmit || body.pdfOnly) {
    try {
      const language: Language = body.language === "de" ? "de" : "en";
      const pdfBytes = await generateQuestionnairePdf(
        body.values || {},
        language,
        body.contactId
      );
      const fileName = `medical-questionnaire-${body.contactId}-${Date.now()}.pdf`;
      const uploaded = await uploadPdfToHubSpot(token, pdfBytes, fileName);
      const linkValue = uploaded.fileUrl || uploaded.fileId || "";
      if (body.pdfOnly) {
        properties.medical_questionnaire = linkValue;
        // In debug-only mode we only patch the PDF link field.
        for (const key of Object.keys(properties)) {
          if (key !== "medical_questionnaire") delete properties[key];
        }
      } else {
        properties.medical_questionnaire = linkValue;
      }
    } catch (err) {
      console.error("PDF generation/upload error", err);
      return NextResponse.json(
        { error: "Failed to generate and upload questionnaire PDF" },
        { status: 502 }
      );
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

    return NextResponse.json(
      { ok: true, pdf: properties.medical_questionnaire ? { link: properties.medical_questionnaire } : undefined },
      { status: 200 }
    );
  } catch (err) {
    console.error("HubSpot error", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}

