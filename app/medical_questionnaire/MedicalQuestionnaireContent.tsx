"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  MEDICAL_QUESTIONNAIRE_SCHEMA,
  type Language,
  type Question,
} from "./schema";

type FormState = Record<string, string>;
type FormErrors = Record<string, string>;

export default function MedicalQuestionnaireContent() {
  const searchParams = useSearchParams();
  const initialLang =
    (searchParams.get("lang") as Language | null) ?? ("de" as Language);

  const [language, setLanguage] = useState<Language>(initialLang);
  const [values, setValues] = useState<FormState>({});
  const [errors, setErrors] = useState<FormErrors>({});
  const [loadingContact, setLoadingContact] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const contactId = searchParams.get("contact_id") ?? undefined;
  const questions: Question[] = useMemo(
    () => MEDICAL_QUESTIONNAIRE_SCHEMA[language],
    [language]
  );

  const title =
    language === "de" ? "Medizinischer Fragebogen" : "Medical Questionnaire";
  const subtitle =
    language === "de"
      ? "Bitte beantworten Sie die Fragen so genau wie moeglich."
      : "Please answer the questions as accurately as possible.";
  const allDataSecure =
    language === "de"
      ? "Ihre Daten werden verschluesselt uebertragen und sicher gespeichert."
      : "Your data is transmitted securely and stored safely.";

  const tRequired =
    language === "de"
      ? "Bitte fuellen Sie dieses Feld aus."
      : "Please complete this field.";
  const tGenericError =
    language === "de"
      ? "Beim Speichern ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut."
      : "Something went wrong while saving. Please try again.";
  const tSubmitted =
    language === "de"
      ? "Vielen Dank! Ihre Angaben wurden erfolgreich gespeichert."
      : "Thank you! Your information has been saved successfully.";
  const tSubmit =
    language === "de" ? "Fragebogen abschliessen" : "Submit questionnaire";
  const tSaving = language === "de" ? "Wird gespeichert ..." : "Saving...";
  const tLanguage = language === "de" ? "Sprache" : "Language";

  useEffect(() => {
    const currentContactId = contactId ?? "";
    if (!currentContactId) return;

    let cancelled = false;

    async function loadContact() {
      setLoadingContact(true);
      setLoadingError(null);

      try {
        const contactRes = await fetch(
          `/api/hubspot/contacts/${encodeURIComponent(currentContactId)}`
        );

        if (!contactRes.ok) {
          const text = await contactRes.text();
          throw new Error(text || `Contact load failed (${contactRes.status})`);
        }

        const contactJson: { properties?: Record<string, unknown> } =
          await contactRes.json();
        const props = contactJson.properties || {};
        const initialValues: FormState = {};

        for (const q of MEDICAL_QUESTIONNAIRE_SCHEMA.de) {
          if (props[q.name] != null) {
            initialValues[q.id] = String(props[q.name]);
          }
        }

        if (!cancelled) {
          setValues((prev) => ({ ...initialValues, ...prev }));
        }
      } catch (err: unknown) {
        console.error("Contact load error", err);
        if (!cancelled) {
          setLoadingError(
            err instanceof Error ? err.message : "Failed to load contact"
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingContact(false);
        }
      }
    }

    void loadContact();

    return () => {
      cancelled = true;
    };
  }, [contactId]);

  const requiredFields = useMemo(
    () => questions.filter((q) => q.required),
    [questions]
  );

  function validate(): FormErrors {
    const nextErrors: FormErrors = {};
    for (const field of requiredFields) {
      const value = values[field.id];
      if (!value || value.trim().length === 0) {
        nextErrors[field.id] = tRequired;
      }
    }
    return nextErrors;
  }

  async function handleSubmit() {
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/hubspot/contact-form-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, values, contactId }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Request failed: ${res.status}`);
      }

      setSubmitted(true);
    } catch (err) {
      console.error(err);
      setSubmitError(tGenericError);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <main className="page">
        <div className="page-header">
          <div>
            <div className="pill">
              {tLanguage}: <span>{language === "de" ? "DE" : "EN"}</span>
            </div>
            <h1 className="page-title">{title}</h1>
            <p className="page-subtitle">{tSubmitted}</p>
          </div>
        </div>
        <div className="card">
          <p className="card-description">{allDataSecure}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <div className="pill">
            {tLanguage}: <span>{language === "de" ? "DE" : "EN"}</span>
          </div>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">{subtitle}</p>
        </div>
        <div>
          <div className="language-switcher" aria-label={tLanguage}>
            <button
              type="button"
              className={`language-pill ${
                language === "de" ? "language-pill-active" : ""
              }`}
              onClick={() => setLanguage("de")}
            >
              DE
            </button>
            <button
              type="button"
              className={`language-pill ${
                language === "en" ? "language-pill-active" : ""
              }`}
              onClick={() => setLanguage("en")}
            >
              EN
            </button>
          </div>
        </div>
      </header>

      <section className="card">
        {loadingContact ? (
          <p className="card-description">
            {language === "de"
              ? "Kontaktdaten werden geladen ..."
              : "Loading contact data..."}
          </p>
        ) : loadingError ? (
          <p className="card-description status-error">{loadingError}</p>
        ) : (
          <div className="grid">
            {questions.map((q) => {
              const error = errors[q.id];

              if (q.type === "textarea") {
                return (
                  <div key={q.id} className="field grid-full">
                    <div className="field-label-row">
                      <label className="field-label">
                        {q.label} {q.required && <span className="field-required">*</span>}
                      </label>
                    </div>
                    {q.help && <p className="field-help">{q.help}</p>}
                    <textarea
                      className="textarea"
                      value={values[q.id] ?? ""}
                      onChange={(e) =>
                        setValues((prev) => ({ ...prev, [q.id]: e.target.value }))
                      }
                    />
                    {error && <div className="field-error">{error}</div>}
                  </div>
                );
              }

              if (q.type === "select" && q.options) {
                return (
                  <div key={q.id} className="field">
                    <div className="field-label-row">
                      <label className="field-label">
                        {q.label} {q.required && <span className="field-required">*</span>}
                      </label>
                    </div>
                    {q.help && <p className="field-help">{q.help}</p>}
                    <select
                      className="select"
                      value={values[q.id] ?? ""}
                      onChange={(e) =>
                        setValues((prev) => ({ ...prev, [q.id]: e.target.value }))
                      }
                    >
                      <option value="">
                        {language === "de" ? "Bitte auswaehlen..." : "Select..."}
                      </option>
                      {q.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    {error && <div className="field-error">{error}</div>}
                  </div>
                );
              }

              return (
                <div key={q.id} className="field">
                  <div className="field-label-row">
                    <label className="field-label">
                      {q.label} {q.required && <span className="field-required">*</span>}
                    </label>
                  </div>
                  {q.help && <p className="field-help">{q.help}</p>}
                  <input
                    className="input"
                    value={values[q.id] ?? ""}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, [q.id]: e.target.value }))
                    }
                  />
                  {error && <div className="field-error">{error}</div>}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <hr className="divider" />

      <footer className="footer">
        <div className="footnote">{allDataSecure}</div>
        <div className="actions">
          {submitError && (
            <div className="status status-error">
              <span className="status-dot status-dot-error" />
              {submitError}
            </div>
          )}
          <button
            type="button"
            className="button button-primary"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? tSaving : tSubmit}
          </button>
        </div>
      </footer>
    </main>
  );
}

