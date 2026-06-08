import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
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

const MARGIN = 50;
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const COL_MEDIKAMENT = 240;
const COL_DOSIERUNG = 110;
const COL_BEMERKUNG = CONTENT_WIDTH - COL_MEDIKAMENT - COL_DOSIERUNG;

type BuildPdfInput = {
  patient: PatientInfo;
  diagnosis: string;
  medications: MedicationRow[];
  issuedAt?: Date;
};

function wrapText(text: string, maxWidth: number, fontSize: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];

  const lines: string[] = [];
  let current = words[0];

  for (let i = 1; i < words.length; i += 1) {
    const next = `${current} ${words[i]}`;
    if (next.length * (fontSize * 0.5) <= maxWidth) {
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

export async function buildPrescriptionPdf(input: BuildPdfInput): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = PAGE_HEIGHT - MARGIN;
  const black = rgb(0, 0, 0);

  const drawLine = (
    text: string,
    opts: { size?: number; font?: typeof regular; gap?: number } = {}
  ) => {
    const size = opts.size ?? 11;
    const font = opts.font ?? regular;
    const gap = opts.gap ?? size + 4;
    page.drawText(text, { x: MARGIN, y, size, font, color: black });
    y -= gap;
  };

  for (const line of [
    DOCTOR.name,
    DOCTOR.title,
    DOCTOR.company,
    DOCTOR.street,
    DOCTOR.city,
    DOCTOR.gln,
  ]) {
    drawLine(line, { size: 11, gap: 14 });
  }

  y -= 10;
  drawLine("REZEPT", { size: 16, font: bold, gap: 22 });

  const issued = input.issuedAt ?? new Date();
  drawLine(`Zürich, ${formatSwissDate(issued)}`, { gap: 20 });

  const patientName = formatPatientName(input.patient);
  const patientAddress = formatPatientAddress(input.patient);
  const birthdate = formatBirthdateForDisplay(input.patient.birthdate);

  drawLine(`Patient: ${patientName}`, { gap: 16 });
  if (patientAddress) {
    drawLine(`Adresse: ${patientAddress}`, { gap: 16 });
  }
  drawLine(`Geburtsdatum: ${birthdate}`, { gap: 22 });

  drawLine("Diagnose:", { font: bold, gap: 16 });
  for (const line of splitLines(input.diagnosis)) {
    drawLine(line, { gap: 14 });
  }

  y -= 8;
  drawLine("Rp.", { font: bold, gap: 14 });

  const tableTop = y;
  const headerY = tableTop;
  const rowHeight = 18;
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

  y = headerY - 6;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 0.5,
    color: black,
  });
  y -= rowHeight;

  for (const med of input.medications) {
    const medLines = wrapText(med.name, COL_MEDIKAMENT - 8, 10);
    const usageLines = med.usage ? wrapText(med.usage, COL_DOSIERUNG - 8, 10) : [""];
    const remarkLines = med.remarks
      ? wrapText(med.remarks, COL_BEMERKUNG - 8, 10)
      : [""];
    const lineCount = Math.max(medLines.length, usageLines.length, remarkLines.length, 1);
    const blockHeight = lineCount * 14;

    if (y - blockHeight < MARGIN + 80) {
      break;
    }

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

    y -= blockHeight + 4;
  }

  y = Math.min(y, MARGIN + 120);
  page.drawText("Unterschrift und Stempel", {
    x: MARGIN,
    y: MARGIN + 40,
    size: 11,
    font: regular,
    color: black,
  });

  return pdfDoc.save();
}
