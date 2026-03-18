"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type Language = "de" | "en";

type FieldType = "text" | "textarea" | "select" | "radio" | "checkbox";

type Option = {
  value: string;
  label: string;
};

type Question = {
  id: string;
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: Option[];
  help?: string | null;
};

type FormState = Record<string, string>;
type FormErrors = Record<string, string>;

const FORM_ID_DE = "2HWzjWa9sTuKJCYnrdu_0ogsn7kf";
const FORM_ID_EN = "2u74nBol5RzeXmtFWMqVO-wsn7kf";

export default function MedicalQuestionnaireContent() {
  const searchParams = useSearchParams();
  const initialLang =
    (searchParams.get("lang") as Language | null) ?? ("de" as Language);
  const [language, setLanguage] = useState<Language>(initialLang);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [values, setValues] = useState<FormState>({});
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const contactId = searchParams.get("contact_id") ?? undefined;

  const title = language === "de" ? "Medizinischer Fragebogen" : "Medical Questionnaire";
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
  const tSaving = language === "de" ? "Wird gespeichert …" : "Saving…";
  const tLanguage = language === "de" ? "Sprache" : "Language";

  const formId = language === "de" ? FORM_ID_DE : FORM_ID_EN;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadingError(null);
      setQuestions([]);
      setValues({});
      setErrors({});

      try {
        const [formRes, contactRes] = await Promise.all([
          fetch(`/api/hubspot/forms/${formId}`),
          contactId
            ? fetch(`/api/hubspot/contacts/${encodeURIComponent(contactId)}`)
            : Promise.resolve(null),
        ]);

        if (!formRes.ok) {
          const text = await formRes.text();
          throw new Error(text || `Form load failed (${formRes.status})`);
        }

        const formJson: Record<string, unknown> = await formRes.json();
        const fieldGroups = (formJson.fieldGroups as Array<{ fields?: unknown[] }>) || [];

        const builtQuestions: Question[] = [];

        type HubSpotField = {
          hidden?: boolean;
          name?: string;
          label?: string;
          fieldType?: string;
          required?: boolean;
          options?: Array<{ value?: string; label?: string }>;
          description?: string | null;
        };

        for (const group of fieldGroups) {
          const fields: HubSpotField[] = (group.fields || []) as HubSpotField[];

          for (const f of fields) {
            if (f.hidden) continue;
            const name: string = f.name ?? "";
            const label: string = f.label ?? name;
            const fieldType: string = f.fieldType ?? "";
            const required: boolean = !!f.required;

            let type: FieldType | null = null;

            if (
              fieldType === "email" ||
              fieldType === "phone" ||
              fieldType === "mobile_phone" ||
              fieldType === "single_line_text" ||
              fieldType === "number" ||
              fieldType === "datepicker"
            ) {
              type = "text";
            } else if (fieldType === "multi_line_text") {
              type = "textarea";
            } else if (fieldType === "radio" || fieldType === "payment_link_radio") {
              type = "radio";
            } else if (fieldType === "dropdown" || fieldType === "multiple_checkboxes") {
              type = "select";
            } else {
              continue;
            }

            const options: Option[] | undefined =
              f.options && Array.isArray(f.options)
                ? f.options.map((opt) => ({
                    value: String(opt.value ?? ""),
                    label: String(opt.label ?? opt.value ?? ""),
                  }))
                : undefined;

            builtQuestions.push({
              id: name,
              name,
              label,
              type,
              required,
              options,
              help: f.description ?? null,
            });
          }
        }

        let initialValues: FormState = {};

        if (contactRes) {
          if (!contactRes.ok) {
            const text = await contactRes.text();
            console.warn("Contact load failed", text);
          } else {
            const contactJson: { properties?: Record<string, unknown> } = await contactRes.json();
            const props: Record<string, unknown> = contactJson.properties || {};
            for (const q of builtQuestions) {
              if (props[q.name] != null) {
                initialValues[q.id] = String(props[q.name]);
              }
            }
          }
        }

        if (!cancelled) {
          setQuestions(builtQuestions);
          setValues(initialValues);
        }
      } catch (err: unknown) {
        console.error("Form load error", err);
        if (!cancelled) {
          setLoadingError(err instanceof Error ? err.message : "Failed to load form");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [formId, contactId]);

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
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
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
              className={`language-pill ${language === "de" ? "language-pill-active" : ""}`}
              onClick={() => setLanguage("de")}
            >
              DE
            </button>
            <button
              type="button"
              className={`language-pill ${language === "en" ? "language-pill-active" : ""}`}
              onClick={() => setLanguage("en")}
            >
              EN
            </button>
          </div>
        </div>
      </header>

      <section className="card">
        {loading ? (
          <p className="card-description">
            {language === "de" ? "Formular wird geladen …" : "Loading form…"}
          </p>
        ) : loadingError ? (
          <p className="card-description status-error">{loadingError}</p>
        ) : (
          <div className="grid">
            {questions.map((q) => {
              const error = errors[q.id];
              if (q.type === "radio" && q.options) {
                return (
                  <div key={q.id} className="field grid-full">
                    <div className="field-label-row">
                      <label className="field-label">
                        {q.label} {q.required && <span className="field-required">*</span>}
                      </label>
                    </div>
                    {q.help && <p className="field-help">{q.help}</p>}
                    <div className="radio-group">
                      {q.options.map((opt) => {
                        const selected = values[q.id] === opt.value;
                        return (
                          <label
                            key={opt.value}
                            className={`chip ${selected ? "chip-selected" : ""}`}
                          >
                            <span className="chip-dot" />
                            <input
                              type="radio"
                              name={q.id}
                              value={opt.value}
                              checked={selected}
                              onChange={() =>
                                setValues((prev) => ({ ...prev, [q.id]: opt.value }))
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
                        {language === "de" ? "Bitte auswählen…" : "Select…"}
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
            disabled={submitting || loading}
          >
            {submitting ? tSaving : tSubmit}
          </button>
        </div>
      </footer>
    </main>
  );
}
