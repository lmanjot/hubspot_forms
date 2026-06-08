"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  formatBirthdateForDisplay,
  formatPatientAddress,
  formatPatientName,
} from "./lib/formatPatient";
import type {
  MedicationRow,
  PatientInfo,
  PrescriptionHistoryEntry,
} from "./types";

const EMPTY_MEDICATION: MedicationRow = { name: "", usage: "", remarks: "" };

function formatHistoryDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function diagnosisPreview(text: string): string {
  const first = text.split(/\r?\n/).find((line) => line.trim());
  return first?.trim() ?? "";
}

export default function PrescriptionContent() {
  const searchParams = useSearchParams();
  const contactId = searchParams.get("contact_id") ?? undefined;

  const [patient, setPatient] = useState<PatientInfo | null>(null);
  const [history, setHistory] = useState<
    Array<PrescriptionHistoryEntry & { downloadUrl: string | null }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [diagnosis, setDiagnosis] = useState("");
  const [medications, setMedications] = useState<MedicationRow[]>([
    { ...EMPTY_MEDICATION },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    if (!contactId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(
        `/api/prescription/history?contact_id=${encodeURIComponent(contactId)}`
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error ?? "Fehler beim Laden");
      }
      setPatient(json.patient ?? null);
      setHistory(json.prescriptions ?? []);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  function updateMedication(index: number, field: keyof MedicationRow, value: string) {
    setMedications((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  }

  function addMedication() {
    setMedications((prev) => [...prev, { ...EMPTY_MEDICATION }]);
  }

  function removeMedication(index: number) {
    setMedications((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleGenerate() {
    if (!contactId) return;

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const res = await fetch("/api/prescription/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId, diagnosis, medications }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error ?? "Rezept konnte nicht erstellt werden");
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? "Rezept.pdf";

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      setDiagnosis("");
      setMedications([{ ...EMPTY_MEDICATION }]);
      setSubmitSuccess("Rezept erstellt und heruntergeladen.");
      await loadHistory();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Fehler beim Erstellen");
    } finally {
      setSubmitting(false);
    }
  }

  if (!contactId) {
    return (
      <main className="page">
        <div className="card">
          <p className="status-error">contact_id fehlt in der URL.</p>
        </div>
      </main>
    );
  }

  const patientName = patient ? formatPatientName(patient) : "—";
  const patientAddress = patient ? formatPatientAddress(patient) : "—";
  const patientBirthdate = patient
    ? formatBirthdateForDisplay(patient.birthdate) || "—"
    : "—";

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Rezept erstellen</h1>
          <p className="page-subtitle">
            Patientendaten aus HubSpot · PDF wird gespeichert und heruntergeladen
          </p>
        </div>
      </header>

      <section className="card">
        <h2 className="section-title">Bisherige Rezepte</h2>
        {loading && <p className="card-description">Wird geladen…</p>}
        {loadError && <p className="status-error">{loadError}</p>}
        {!loading && !loadError && history.length === 0 && (
          <p className="card-description">Noch keine Rezepte vorhanden.</p>
        )}
        {!loading && history.length > 0 && (
          <ul className="history-list">
            {history.map((entry) => (
              <li key={entry.id} className="history-item">
                <div className="history-item-main">
                  <strong>{formatHistoryDate(entry.createdAt)}</strong>
                  <span className="history-item-diagnosis">
                    {diagnosisPreview(entry.diagnosis)}
                  </span>
                  <span className="status-muted">
                    {entry.medications.length}{" "}
                    {entry.medications.length === 1 ? "Medikament" : "Medikamente"}
                  </span>
                </div>
                {entry.downloadUrl ? (
                  <a
                    className="button button-secondary history-download"
                    href={entry.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Herunterladen
                  </a>
                ) : (
                  <span className="status-muted">Download nicht verfügbar</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2 className="section-title">Neues Rezept</h2>

        <div className="grid">
          <div className="field">
            <span className="field-label">Patient</span>
            <div className="read-only-value">{patientName}</div>
          </div>
          <div className="field">
            <span className="field-label">Geburtsdatum</span>
            <div className="read-only-value">{patientBirthdate}</div>
          </div>
          <div className="field grid-full">
            <span className="field-label">Adresse</span>
            <div className="read-only-value">{patientAddress}</div>
          </div>

          <div className="field grid-full">
            <label className="field-label" htmlFor="diagnosis">
              Diagnose <span className="field-required">*</span>
            </label>
            <textarea
              id="diagnosis"
              className="input textarea"
              rows={4}
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="z. B. Androgenetische Alopezie"
            />
          </div>
        </div>

        <div className="medications-section">
          <div className="medications-header">
            <h3 className="subsection-title">Medikamente</h3>
            <button
              type="button"
              className="button button-secondary medication-add"
              onClick={addMedication}
            >
              + Medikament
            </button>
          </div>

          {medications.map((row, index) => (
            <div key={index} className="medication-row card card-nested">
              <div className="medication-row-header">
                <span className="status-muted">Medikament {index + 1}</span>
                {medications.length > 1 && (
                  <button
                    type="button"
                    className="button button-secondary medication-remove"
                    onClick={() => removeMedication(index)}
                  >
                    Entfernen
                  </button>
                )}
              </div>
              <div className="grid">
                <div className="field grid-full">
                  <label className="field-label" htmlFor={`med-name-${index}`}>
                    Medikament <span className="field-required">*</span>
                  </label>
                  <input
                    id={`med-name-${index}`}
                    className="input"
                    value={row.name}
                    onChange={(e) => updateMedication(index, "name", e.target.value)}
                    placeholder="z. B. Finasterid 1mg 28Stk"
                  />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor={`med-usage-${index}`}>
                    Dosierung
                  </label>
                  <input
                    id={`med-usage-${index}`}
                    className="input"
                    value={row.usage}
                    onChange={(e) => updateMedication(index, "usage", e.target.value)}
                    placeholder="z. B. 1-0-0"
                  />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor={`med-remarks-${index}`}>
                    Bemerkung
                  </label>
                  <input
                    id={`med-remarks-${index}`}
                    className="input"
                    value={row.remarks}
                    onChange={(e) => updateMedication(index, "remarks", e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {submitError && <p className="status-error">{submitError}</p>}
        {submitSuccess && <p className="status-success">{submitSuccess}</p>}

        <div className="actions form-actions">
          <button
            type="button"
            className="button button-nav button-primary"
            disabled={submitting || loading}
            onClick={handleGenerate}
          >
            {submitting ? "Wird erstellt…" : "Rezept erstellen"}
          </button>
        </div>
      </section>
    </main>
  );
}
