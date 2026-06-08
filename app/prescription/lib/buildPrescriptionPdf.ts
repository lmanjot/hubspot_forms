import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { MedicationRow, PatientInfo } from "../types";
import {
  formatBirthdateForDisplay,
  formatPatientAddress,
  formatPatientName,
  formatSwissDate,
} from "./formatPatient";

const DOCTOR = {
  name: "Dr. med. (LT) Juste Baksanskaite",
  title: "Praktische Ärztin",
  company: "MARA CARE AG",
  street: "Bleicherweg 72",
  city: "8002 Zürich",
  gln: "GLN: 7601002825023",
};

const MARGIN = 56;
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const COL_MEDIKAMENT = 230;
const COL_DOSIERUNG = 105;
const COL_BEMERKUNG = CONTENT_WIDTH - COL_MEDIKAMENT - COL_DOSIERUNG;

type BuildPdfInput = {
  patient: PatientInfo;
  diagnosis: string;
  medications: MedicationRow[];
  issuedAt?: Date;
};

function textWidth(font: PDFFont, text: string, size: number): number {
  return font.widthOfTextAtSize(text, size);
}

function wrapText(
  text: string,
  maxWidth: number,
  font: PDFFont,
  fontSize: number
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];

  const lines: string[] = [];
  let current = words[0];

  for (let i = 1; i < words.length; i += 1) {
    const next = `${current} ${words[i]}`;
    if (textWidth(font, next, fontSize) <= maxWidth) {
      current = next;
    } else {
      lines.push(current);
      current = words[i];
    }
  }
  lines.push(current);
  return lines;
}

function splitLines(text: string): string[] {
  return text.split(/\r?\n/).flatMap((line) => (line.trim() ? [line.trim()] : []));
}

function drawLeftBlock(
  page: PDFPage,
  lines: string[],
  startY: number,
  font: PDFFont,
  size: number,
  lineGap: number
): number {
  let y = startY;
  const black = rgb(0, 0, 0);
  for (const line of lines) {
    page.drawText(line, { x: MARGIN, y, size, font, color: black });
    y -= lineGap;
  }
  return y;
}

function drawRightBlock(
  page: PDFPage,
  lines: string[],
  startY: number,
  font: PDFFont,
  size: number,
  lineGap: number
): number {
  let y = startY;
  const black = rgb(0, 0, 0);
  for (const line of lines) {
    const width = textWidth(font, line, size);
    page.drawText(line, {
      x: PAGE_WIDTH - MARGIN - width,
      y,
      size,
      font,
      color: black,
    });
    y -= lineGap;
  }
  return y;
}

function drawRightLine(
  page: PDFPage,
  text: string,
  y: number,
  font: PDFFont,
  size: number
): void {
  const width = textWidth(font, text, size);
  page.drawText(text, {
    x: PAGE_WIDTH - MARGIN - width,
    y,
    size,
    font,
    color: rgb(0, 0, 0),
  });
}

function drawCentered(
  page: PDFPage,
  text: string,
  y: number,
  font: PDFFont,
  size: number
): number {
  const black = rgb(0, 0, 0);
  const width = textWidth(font, text, size);
  page.drawText(text, {
    x: (PAGE_WIDTH - width) / 2,
    y,
    size,
    font,
    color: black,
  });
  return y;
}

export async function buildPrescriptionPdf(input: BuildPdfInput): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const black = rgb(0, 0, 0);

  const issued = input.issuedAt ?? new Date();
  const patientName = formatPatientName(input.patient);
  const patientAddress = formatPatientAddress(input.patient);
  const birthdate = formatBirthdateForDisplay(input.patient.birthdate);

  const headerTop = PAGE_HEIGHT - MARGIN;
  const bodySize = 10.5;
  const bodyGap = 15;

  const doctorLines = [
    DOCTOR.name,
    DOCTOR.title,
    DOCTOR.company,
    DOCTOR.street,
    DOCTOR.city,
    DOCTOR.gln,
  ];

  const patientDetailLines = [
    `Patient: ${patientName}`,
    ...(patientAddress ? [`Adresse: ${patientAddress}`] : []),
    `Geburtsdatum: ${birthdate}`,
  ];
  const dateLine = `Zürich, ${formatSwissDate(issued)}`;

  const leftBottom = drawLeftBlock(
    page,
    doctorLines,
    headerTop,
    regular,
    bodySize,
    bodyGap
  );

  const patientStartY = leftBottom - 12;
  let rightBottom = drawRightBlock(
    page,
    patientDetailLines,
    patientStartY,
    regular,
    bodySize,
    bodyGap
  );

  rightBottom -= 22;
  drawRightLine(page, dateLine, rightBottom, regular, bodySize);
  rightBottom -= bodyGap;

  let y = rightBottom - 28;
  drawCentered(page, "REZEPT", y, bold, 18);
  y -= 48;

  page.drawText("Diagnose:", {
    x: MARGIN,
    y,
    size: 11,
    font: bold,
    color: black,
  });
  y -= 18;

  for (const line of splitLines(input.diagnosis)) {
    page.drawText(line, { x: MARGIN, y, size: bodySize, font: regular, color: black });
    y -= 15;
  }

  y -= 16;
  page.drawText("Rp.", { x: MARGIN, y, size: 11, font: bold, color: black });
  y -= 20;

  const headerY = y;
  const headerSize = 10;

  page.drawText("Medikament", {
    x: MARGIN,
    y: headerY,
    size: headerSize,
    font: bold,
    color: black,
  });
  page.drawText("Dosierung", {
    x: MARGIN + COL_MEDIKAMENT,
    y: headerY,
    size: headerSize,
    font: bold,
    color: black,
  });
  page.drawText("Bemerkung", {
    x: MARGIN + COL_MEDIKAMENT + COL_DOSIERUNG,
    y: headerY,
    size: headerSize,
    font: bold,
    color: black,
  });

  y = headerY - 8;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 0.5,
    color: black,
  });
  y -= 18;

  for (const med of input.medications) {
    const medLines = wrapText(med.name, COL_MEDIKAMENT - 10, regular, 10);
    const usageLines = med.usage
      ? wrapText(med.usage, COL_DOSIERUNG - 8, regular, 10)
      : [""];
    const remarkLines = med.remarks
      ? wrapText(med.remarks, COL_BEMERKUNG - 8, regular, 10)
      : [""];
    const lineCount = Math.max(medLines.length, usageLines.length, remarkLines.length, 1);
    const blockHeight = lineCount * 14;

    if (y - blockHeight < MARGIN + 80) break;

    for (let i = 0; i < lineCount; i += 1) {
      const lineY = y - i * 14;
      if (medLines[i]) {
        page.drawText(medLines[i], {
          x: MARGIN,
          y: lineY,
          size: 10,
          font: regular,
          color: black,
        });
      }
      if (usageLines[i]) {
        page.drawText(usageLines[i], {
          x: MARGIN + COL_MEDIKAMENT,
          y: lineY,
          size: 10,
          font: regular,
          color: black,
        });
      }
      if (remarkLines[i]) {
        page.drawText(remarkLines[i], {
          x: MARGIN + COL_MEDIKAMENT + COL_DOSIERUNG,
          y: lineY,
          size: 10,
          font: regular,
          color: black,
        });
      }
    }

    y -= blockHeight + 10;
  }

  const signatureY = (MARGIN + 36) * 1.3;
  page.drawText(DOCTOR.name, {
    x: MARGIN,
    y: signatureY,
    size: 10.5,
    font: regular,
    color: black,
  });

  return pdfDoc.save();
}
