import { hubspotBirthdateToDdMmYyyy } from "../../medical_questionnaire/birthdate";
import type { PatientInfo } from "../types";

export function formatPatientName(patient: PatientInfo): string {
  return [patient.firstname, patient.lastname].filter(Boolean).join(" ").trim();
}

export function formatPatientAddress(patient: PatientInfo): string {
  const street = patient.address.trim();
  const locality = [patient.zip, patient.city].filter(Boolean).join(" ").trim();
  return [street, locality].filter(Boolean).join(", ");
}

export function formatBirthdateForDisplay(raw: string): string {
  const ddMmYyyy = hubspotBirthdateToDdMmYyyy(raw);
  if (!ddMmYyyy) return "";
  const parts = ddMmYyyy.split("-");
  if (parts.length === 3) {
    return `${parts[0]}.${parts[1]}.${parts[2]}`;
  }
  return ddMmYyyy;
}

export function formatSwissDate(date = new Date()): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

export function buildPrescriptionFilename(lastname: string, date = new Date()): string {
  const safeLast = (lastname || "Patient").replace(/[^\w\-]/g, "_");
  return `Rezept_${safeLast}_${formatSwissDate(date).replace(/\./g, "-")}.pdf`;
}

export function patientFromHubSpotProps(
  props: Record<string, string | undefined>
): PatientInfo {
  return {
    firstname: props.firstname ?? "",
    lastname: props.lastname ?? "",
    address: props.address ?? "",
    zip: props.zip ?? "",
    city: props.city ?? "",
    birthdate: props.birthdate ?? "",
  };
}
