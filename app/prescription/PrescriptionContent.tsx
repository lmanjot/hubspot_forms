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

type CompletedPrescription = {
  id: string;
  filename: string;
  downloadUrl: string | null;
};

type HistoryEntry = PrescriptionHistoryEntry & { downloadUrl: string | null };

function formatHistoryDateShort(iso: string): string {
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

function HistoryRow({ entry }: { entry: HistoryEntry }) {
  const [expanded, setExpanded] = useState(false);
  const preview = diagnosisPreview(entry.diagnosis);
  const medCount = entry.medications.length;
  const summary = [
    formatHistoryDateShort(entry.createdAt),
    preview,
    `${medCount} ${medCount === 1 ? "Medikament" : "Medikamente"}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="history-item history-item-compact">
      <div className="history-item-inner">
        <button
          type="button"
          className="history-item-summary"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
        >
          <span className="history-item-summary-text">{summary}</span>
          <span className="history-toggle" aria-hidden>
            {expanded ? "▾" : "▸"}
          </span>
        </button>

        {expanded && (
          <div className="history-item-expanded">
            {entry.diagnosis.includes("\n") && (
              <div className="history-expanded-block">
                <span className="history-expanded-label">Diagnose</span>
                <p className="history-expanded-text">{entry.diagnosis}</p>
              </div>
            )}
            <div className="history-expanded-block">
              <span className="history-expanded-label">Medikamente</span>
              <ul className="history-med-list">
                {entry.medications.map((med, index) => (
                  <li key={`${entry.id}-${index}`}>
                    <strong>{med.name}</strong>
                    {[med.usage, med.remarks].filter(Boolean).length > 0 && (
                      <span className="status-muted">
                        {" "}
                        · {[med.usage, med.remarks].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            {entry.downloadUrl ? (
              <a
                className="button button-secondary history-download"
                href={entry.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                PDF herunterladen
              </a>
            ) : (
              <span className="status-muted">Download nicht verfügbar</span>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

export default function PrescriptionContent() {
  const searchParams = useSearchParams();
  const contactId = searchParams.get("contact_id") ?? undefined;

  const [patient, setPatient] = useState<PatientInfo | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [diagnosis, setDiagnosis] = useState("");
  const [medications, setMedications] = useState<MedicationRow[]>([
    { ...EMPTY_MEDICATION },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [completed, setCompleted] = useState<CompletedPrescription | null>(null);

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
      return json.prescriptions as HistoryEntry[];
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Fehler beim Laden");
      return null;
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

  function startNewPrescription() {
    setCompleted(null);
    setDiagnosis("");
    setMedications([{ ...EMPTY_MEDICATION }]);
    setSubmitError(null);
  }

  async function handleGenerate() {
    if (!contactId) return;

    setSubmitting(true);
    setSubmitError(null);
    setCompleted(null);

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
      const prescriptionId = res.headers.get("X-Prescription-Id") ?? "";
      let downloadUrl = res.headers.get("X-Prescription-Download-Url");

      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);

      const refreshed = await loadHistory();
      if (!downloadUrl && prescriptionId && refreshed) {
        downloadUrl =
          refreshed.find((entry) => entry.id === prescriptionId)?.downloadUrl ?? null;
      }

      setCompleted({
        id: prescriptionId,
        filename,
        downloadUrl,
      });
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

      <section className="card card-compact">
        <h2 className="section-title section-title-compact">Bisherige Rezepte</h2>
        {loading && <p className="card-description">Wird geladen…</p>}
        {loadError && <p className="status-error">{loadError}</p>}
        {!loading && !loadError && history.length === 0 && (
          <p className="card-description card-description-compact">
            Noch keine Rezepte vorhanden.
          </p>
        )}
        {!loading && history.length > 0 && (
          <ul className="history-list history-list-compact">
            {history.map((entry) => (
              <HistoryRow key={entry.id} entry={entry} />
            ))}
          </ul>
        )}
      </section>

      {completed ? (
        <section className="card prescription-completed">
          <h2 className="section-title">Rezept erstellt</h2>
          <p className="card-description">
            Das Rezept wurde gespeichert und heruntergeladen.
          </p>
          <div className="prescription-completed-actions">
            {completed.downloadUrl ? (
              <a
                className="button button-primary"
                href={completed.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                PDF öffnen
              </a>
            ) : (
              <p className="status-muted prescription-completed-fallback">
                PDF gespeichert. Download-Link wird in Kürze in der Liste oben
                verfügbar sein.
              </p>
            )}
            <button
              type="button"
              className="button button-secondary"
              onClick={startNewPrescription}
            >
              Neues Rezept erstellen
            </button>
          </div>
        </section>
      ) : (
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
            <h3 className="subsection-title">Medikamente</h3>

            {medications.map((row, index) => (
              <div key={index} className="medication-row card card-nested">
                <div className="medication-row-header">
                  <span className="status-muted">Medikament {index + 1}</span>
                  {medications.length > 1 && (
                    <button
                      type="button"
                      className="button button-secondary medication-remove"
                      onClick={() => removeMedication(index)}
                      aria-label={`Medikament ${index + 1} entfernen`}
                    >
                      <span className="medication-remove-icon" aria-hidden>
                        ×
                      </span>
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

            <div className="medication-add-row">
              <button
                type="button"
                className="button button-secondary medication-add"
                onClick={addMedication}
              >
                + Medikament
              </button>
            </div>
          </div>

          {submitError && <p className="status-error">{submitError}</p>}

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
      )}
    </main>
  );
}
