"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  formatBirthdateForDisplay,
  formatPatientAddress,
  formatPatientName,
} from "./lib/formatPatient";
import type {
  MedicationRow,
  PatientInfo,
  PrescriptionCreatedBy,
  PrescriptionHistoryEntry,
} from "./types";
import { normalizeCreatedByInput } from "./lib/hubspotUser";

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

function formatCreator(entry: HistoryEntry): string | null {
  const creator = entry.createdBy;
  if (!creator) return null;
  return creator.name || creator.email || creator.id;
}

function HistoryRow({
  entry,
  onCopy,
}: {
  entry: HistoryEntry;
  onCopy: (entry: HistoryEntry) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const preview = diagnosisPreview(entry.diagnosis);
  const medCount = entry.medications.length;
  const creator = formatCreator(entry);
  const summary = [
    formatHistoryDateShort(entry.createdAt),
    creator,
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
            {entry.createdBy && (
              <div className="history-expanded-block">
                <span className="history-expanded-label">Erstellt von</span>
                <p className="history-expanded-text">
                  {[entry.createdBy.name, entry.createdBy.email].filter(Boolean).join(" · ") ||
                    entry.createdBy.id}
                </p>
              </div>
            )}
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
            <div className="history-item-actions">
              <button
                type="button"
                className="button button-secondary history-action-btn"
                onClick={() => onCopy(entry)}
              >
                Rezept kopieren
              </button>
              {entry.downloadUrl ? (
                <button
                  type="button"
                  className="button button-secondary history-action-btn"
                  onClick={() => window.open(entry.downloadUrl!, "_blank", "noopener,noreferrer")}
                >
                  PDF herunterladen
                </button>
              ) : (
                <span className="status-muted">Download nicht verfügbar</span>
              )}
            </div>
          </div>
        )}
      </div>
    </li>
  );
}

function getCreatedByFromSearchParams(searchParams: {
  get(name: string): string | null;
}): PrescriptionCreatedBy | undefined {
  return normalizeCreatedByInput({
    id: searchParams.get("hs_user_id") ?? undefined,
    email: searchParams.get("hs_user_email") ?? undefined,
    name: searchParams.get("hs_user_name") ?? undefined,
  });
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
  const [copyNotice, setCopyNotice] = useState<string | null>(null);
  const [completed, setCompleted] = useState<CompletedPrescription | null>(null);
  const formSectionRef = useRef<HTMLElement | null>(null);

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

  function copyPrescription(entry: HistoryEntry) {
    setCompleted(null);
    setSubmitError(null);
    setCopyNotice(null);
    setDiagnosis(entry.diagnosis);
    setMedications(
      entry.medications.length > 0
        ? entry.medications.map((med) => ({
            name: med.name,
            usage: med.usage ?? "",
            remarks: med.remarks ?? "",
          }))
        : [{ ...EMPTY_MEDICATION }]
    );
    setCopyNotice("Vorheriges Rezept in das Formular übernommen.");
    requestAnimationFrame(() => {
      formSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function openPdf(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
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
        body: JSON.stringify({
          contactId,
          diagnosis,
          medications,
          createdBy: getCreatedByFromSearchParams(searchParams),
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error ?? "Rezept konnte nicht erstellt werden");
      }

      const blob = await res.blob();
      void blob;
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? "Rezept.pdf";
      const prescriptionId = res.headers.get("X-Prescription-Id") ?? "";
      let downloadUrl = res.headers.get("X-Prescription-Download-Url");

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
            Patientendaten aus HubSpot · PDF wird in HubSpot gespeichert
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
              <HistoryRow key={entry.id} entry={entry} onCopy={copyPrescription} />
            ))}
          </ul>
        )}
      </section>

      {completed ? (
        <section className="card prescription-completed">
          <h2 className="section-title">Rezept erstellt</h2>
          <p className="card-description">Das Rezept wurde gespeichert.</p>
          <div className="prescription-completed-actions">
            {completed.downloadUrl ? (
              <button
                type="button"
                className="button button-primary"
                onClick={() => openPdf(completed.downloadUrl!)}
              >
                PDF öffnen
              </button>
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
        <section className="card" ref={formSectionRef}>
          <h2 className="section-title">Neues Rezept</h2>

          {copyNotice && <p className="status-success">{copyNotice}</p>}

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
