"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ALL_MEDICAL_FIELD_NAMES,
  MEDICAL_QUESTIONNAIRE_SCHEMA,
  type Language,
  type QuestionDef,
} from "./schema";

type FormState = Record<string, string>;
type FormErrors = Record<string, string>;

function isLongField(question: QuestionDef) {
  return (
    question.fieldType === "radio" ||
    question.label.length > 90 ||
    question.fieldType === "single_line_text" && question.name.endsWith("_detail")
  );
}

function inputTypeFor(fieldType: QuestionDef["fieldType"]): string {
  if (fieldType === "email") return "email";
  if (fieldType === "phone") return "tel";
  if (fieldType === "number") return "number";
  if (fieldType === "datepicker") return "date";
  return "text";
}

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

  const visibleQuestions = useMemo(
    () => MEDICAL_QUESTIONNAIRE_SCHEMA[language].filter((q) => !q.hidden),
    [language]
  );

  const title =
    language === "de" ? "Medizinischer Fragebogen" : "Medical Questionnaire";
  const subtitle =
    language === "de"
      ? "Bitte beantworten Sie die Fragen so genau wie möglich."
      : "Please answer the questions as accurately as possible.";
  const allDataSecure =
    language === "de"
      ? "Ihre Daten werden verschlüsselt übertragen und sicher gespeichert."
      : "Your data is transmitted securely and stored safely.";

  const tRequired =
    language === "de"
      ? "Bitte füllen Sie dieses Feld aus."
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
        const query = ALL_MEDICAL_FIELD_NAMES
          .map((name) => `properties=${encodeURIComponent(name)}`)
          .join("&");

        const contactRes = await fetch(
          `/api/hubspot/contacts/${encodeURIComponent(currentContactId)}?${query}`
        );

        if (!contactRes.ok) {
          const text = await contactRes.text();
          throw new Error(text || `Contact load failed (${contactRes.status})`);
        }

        const contactJson: { properties?: Record<string, unknown> } =
          await contactRes.json();
        const props = contactJson.properties || {};
        const initialValues: FormState = {};

        for (const name of ALL_MEDICAL_FIELD_NAMES) {
          const value = props[name];
          if (value !== null && value !== undefined) {
            initialValues[name] = String(value);
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
    () => visibleQuestions.filter((q) => q.required),
    [visibleQuestions]
  );

  function validate(): FormErrors {
    const nextErrors: FormErrors = {};

    for (const field of requiredFields) {
      const value = values[field.name] ?? "";
      if (value.trim().length === 0) {
        nextErrors[field.name] = tRequired;
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
        body: JSON.stringify({ values, contactId }),
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
            {visibleQuestions.map((q) => {
              const fieldKey = q.name;
              const value = values[fieldKey] ?? "";
              const error = errors[fieldKey];
              const isFullWidth = isLongField(q);

              if (q.fieldType === "radio" && q.options) {
                return (
                  <div key={fieldKey} className={`field ${isFullWidth ? "grid-full" : ""}`}>
                    <div className="field-label-row">
                      <label className="field-label">
                        {q.label} {q.required && <span className="field-required">*</span>}
                      </label>
                    </div>
                    <div className="radio-group">
                      {q.options.map((opt) => {
                        const selected = value === opt.value;
                        return (
                          <label
                            key={opt.value}
                            className={`chip ${selected ? "chip-selected" : ""}`}
                          >
                            <span className="chip-dot" />
                            <input
                              type="radio"
                              name={fieldKey}
                              value={opt.value}
                              checked={selected}
                              onChange={() =>
                                setValues((prev) => ({ ...prev, [fieldKey]: opt.value }))
                              }
                            />
                            {opt.label}
                          </label>
                        );
                      })}
                    </div>
                    {error && <div className="field-error">{error}</div>}
                  </div>
                );
              }

              if (q.fieldType === "dropdown" && q.options) {
                return (
                  <div key={fieldKey} className={`field ${isFullWidth ? "grid-full" : ""}`}>
                    <div className="field-label-row">
                      <label className="field-label">
                        {q.label} {q.required && <span className="field-required">*</span>}
                      </label>
                    </div>
                    <select
                      className="select"
                      value={value}
                      onChange={(e) =>
                        setValues((prev) => ({ ...prev, [fieldKey]: e.target.value }))
                      }
                    >
                      <option value="">
                        {language === "de" ? "Bitte auswählen..." : "Select..."}
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
                <div key={fieldKey} className={`field ${isFullWidth ? "grid-full" : ""}`}>
                  <div className="field-label-row">
                    <label className="field-label">
                      {q.label} {q.required && <span className="field-required">*</span>}
                    </label>
                  </div>
                  <input
                    type={inputTypeFor(q.fieldType)}
                    className="input"
                    value={value}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, [fieldKey]: e.target.value }))
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
            disabled={submitting || loadingContact}
          >
            {submitting ? tSaving : tSubmit}
          </button>
        </div>
      </footer>
    </main>
  );
}

