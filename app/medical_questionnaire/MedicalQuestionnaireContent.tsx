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

type PhoneCountry = {
  iso: string;
  label: string;
  dial: string;
};

type AddressSuggestion = {
  label: string;
  street: string;
  zip: string;
  city: string;
};

const PHONE_COUNTRIES: PhoneCountry[] = [
  { iso: "CH", label: "Switzerland", dial: "+41" },
  { iso: "DE", label: "Germany", dial: "+49" },
  { iso: "AT", label: "Austria", dial: "+43" },
  { iso: "FR", label: "France", dial: "+33" },
  { iso: "IT", label: "Italy", dial: "+39" },
  { iso: "GB", label: "United Kingdom", dial: "+44" },
  { iso: "US", label: "United States", dial: "+1" },
];

function isLongField(question: QuestionDef) {
  return (
    question.fieldType === "radio" ||
    question.label.length > 90 ||
    (question.fieldType === "single_line_text" && question.name.endsWith("_detail"))
  );
}

function digitsOnly(input: string) {
  return input.replace(/\D/g, "");
}

function normalizeDial(input: string) {
  if (!input.startsWith("+")) return `+${digitsOnly(input)}`;
  return `+${digitsOnly(input)}`;
}

function normalizeLocalPhone(local: string) {
  return digitsOnly(local).replace(/^0+/, "");
}

function buildPhoneValue(dial: string, local: string) {
  const cleanDial = normalizeDial(dial);
  const cleanLocal = normalizeLocalPhone(local);
  return `${cleanDial}${cleanLocal}`;
}

function parsePhoneValue(value: string): { dial: string; local: string } {
  const compact = value.replace(/[^\d+]/g, "");
  const sortedCountries = [...PHONE_COUNTRIES].sort(
    (a, b) => b.dial.length - a.dial.length
  );

  for (const country of sortedCountries) {
    if (compact.startsWith(country.dial)) {
      return {
        dial: country.dial,
        local: normalizeLocalPhone(compact.slice(country.dial.length)),
      };
    }
  }

  return { dial: PHONE_COUNTRIES[0].dial, local: normalizeLocalPhone(compact) };
}

function inputTypeFor(fieldType: QuestionDef["fieldType"]): string {
  if (fieldType === "email") return "email";
  if (fieldType === "number") return "number";
  if (fieldType === "datepicker") return "date";
  return "text";
}

export default function MedicalQuestionnaireContent() {
  const searchParams = useSearchParams();
  const initialLang =
    (searchParams.get("lang") as Language | null) ?? ("de" as Language);
  const [language, setLanguage] = useState<Language>(initialLang);
  const [step, setStep] = useState<1 | 2>(1);
  const [values, setValues] = useState<FormState>({});
  const [errors, setErrors] = useState<FormErrors>({});
  const [loadingContact, setLoadingContact] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [savingStep, setSavingStep] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [phoneCountryDial, setPhoneCountryDial] = useState<string>(
    PHONE_COUNTRIES[0].dial
  );
  const [phoneLocalValue, setPhoneLocalValue] = useState<string>("");
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressFocused, setAddressFocused] = useState(false);

  const contactId = searchParams.get("contact_id") ?? undefined;

  const allQuestions = useMemo(() => MEDICAL_QUESTIONNAIRE_SCHEMA[language], [language]);

  function isVisibleByCondition(question: QuestionDef) {
    if (!question.showWhen) return true;
    const sourceValue = values[question.showWhen.field] ?? "";
    return sourceValue === question.showWhen.value;
  }

  const visibleQuestions = useMemo(
    () => allQuestions.filter((q) => isVisibleByCondition(q)),
    [allQuestions, values]
  );
  const currentStepQuestions = useMemo(
    () => visibleQuestions.filter((q) => q.step === step),
    [visibleQuestions, step]
  );

  const title =
    language === "de" ? "Medizinischer Fragebogen" : "Medical Questionnaire";
  const subtitle =
    language === "de"
      ? "Bitte beantworten Sie die Fragen so genau wie m\u00f6glich."
      : "Please answer the questions as accurately as possible.";
  const trustText =
    language === "de"
      ? "Ihre Daten werden verschl\u00fcsselt \u00fcbertragen und sicher gespeichert."
      : "Your data is transmitted securely and stored safely.";

  const tRequired =
    language === "de"
      ? "Bitte f\u00fcllen Sie dieses Feld aus."
      : "Please complete this field.";
  const tPhoneInvalid =
    language === "de"
      ? "Bitte geben Sie eine g\u00fcltige Telefonnummer ein (7-20 Ziffern)."
      : "Please enter a valid phone number (7-20 digits).";
  const tGenericError =
    language === "de"
      ? "Beim Speichern ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut."
      : "Something went wrong while saving. Please try again.";
  const tSubmitted =
    language === "de"
      ? "Vielen Dank! Ihre Angaben wurden erfolgreich gespeichert."
      : "Thank you! Your information has been saved successfully.";
  const tNext = language === "de" ? "Weiter" : "Continue";
  const tBack = language === "de" ? "Zur\u00fcck" : "Back";
  const tSubmit = language === "de" ? "Fragebogen abschliessen" : "Submit questionnaire";
  const tSaving = language === "de" ? "Wird gespeichert ..." : "Saving...";
  const tSavingDraft = language === "de" ? "Speichert ..." : "Saving draft...";
  const tLanguage = language === "de" ? "Sprache" : "Language";
  const tStepTitle = language === "de" ? "Schritt" : "Step";
  const introParagraphs = language === "de"
    ? [
        "Dieser medizinische Fragebogen hilft uns, einen individuellen Behandlungsplan f\u00fcr Sie zu erstellen. Wir bitten Sie, ihn sorgf\u00e4ltig auszuf\u00fcllen.",
        "Ihre Angaben werden ausschlie\u00dflich f\u00fcr medizinische Zwecke verwendet und niemals an Dritte weitergegeben. Wenn Sie es w\u00fcnschen, k\u00f6nnen Sie die L\u00f6schung Ihrer Daten nach Abschluss Ihrer Behandlung beantragen.",
        "Wir danken Ihnen f\u00fcr Ihr Vertrauen in die Mara Care AG!",
      ]
    : [
        "This medical questionnaire helps us create a personalized treatment plan for you. We kindly ask you to fill it out carefully.",
        "Your information is used exclusively for medical purposes and is never shared with third parties. If you wish, you can request the deletion of your data after your treatment is complete.",
        "Thank you for your trust in Mara Care AG!",
      ];
  const declarationText =
    language === "de"
      ? "Ich best\u00e4tige hiermit, dass die Angaben auf mich zutreffen und wahrheitsgem\u00e4\u00df beantwortet wurden. Mit meiner Unterschrift erm\u00e4chtige ich die Mara Care AG, Informationen und Daten ausschlie\u00dflich zu Behandlungszwecken weiterzugeben."
      : "I hereby confirm that the information provided applies to me and has been answered truthfully. With my signature, I authorize Mara Care AG to share information and data exclusively for treatment purposes.";

  function updateValue(field: string, nextValue: string) {
    setValues((prev) => {
      const next = { ...prev, [field]: nextValue };
      for (const question of allQuestions) {
        if (question.showWhen && question.showWhen.field === field && question.showWhen.value !== nextValue) {
          next[question.name] = "";
        }
      }
      return next;
    });
  }

  function updatePhone(nextDial: string, nextLocal: string) {
    const cleanLocal = normalizeLocalPhone(nextLocal);
    setPhoneCountryDial(nextDial);
    setPhoneLocalValue(cleanLocal);
    updateValue("phone", buildPhoneValue(nextDial, cleanLocal));
  }

  function selectedCountryCodesFromNationality(nationality: string) {
    if (nationality === "Switzerland") return "ch";
    if (nationality === "Germany") return "de";
    if (nationality === "Austria") return "at";
    if (nationality === "France") return "fr";
    return "ch,de,at,fr";
  }

  function applyAddressSuggestion(item: AddressSuggestion) {
    updateValue("address", item.street || item.label);
    if (item.zip) updateValue("zip", item.zip);
    if (item.city) updateValue("city", item.city);
    setAddressSuggestions([]);
    setAddressFocused(false);
  }

  async function persistDraft() {
    if (!contactId) return true;
    try {
      setSavingStep(true);
      const res = await fetch("/api/hubspot/contact-form-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values, contactId }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Request failed: ${res.status}`);
      }
      return true;
    } catch (err) {
      console.error(err);
      setSubmitError(tGenericError);
      return false;
    } finally {
      setSavingStep(false);
    }
  }

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
          if (initialValues.phone) {
            const parsed = parsePhoneValue(initialValues.phone);
            setPhoneCountryDial(parsed.dial);
            setPhoneLocalValue(parsed.local);
          }
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

  useEffect(() => {
    if (step !== 1) return;
    const query = (values.address ?? "").trim();
    if (query.length < 3 || !addressFocused) {
      setAddressSuggestions([]);
      setAddressLoading(false);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setAddressLoading(true);
        const countrycodes = selectedCountryCodesFromNationality(values.nationality ?? "");
        const url = new URL("https://nominatim.openstreetmap.org/search");
        url.searchParams.set("format", "jsonv2");
        url.searchParams.set("addressdetails", "1");
        url.searchParams.set("limit", "6");
        url.searchParams.set("countrycodes", countrycodes);
        url.searchParams.set("q", query);

        const res = await fetch(url.toString());
        if (!res.ok) return;
        const json = (await res.json()) as Array<{
          display_name?: string;
          address?: {
            road?: string;
            house_number?: string;
            postcode?: string;
            city?: string;
            town?: string;
            village?: string;
          };
        }>;

        const suggestions: AddressSuggestion[] = json.map((item) => {
          const road = item.address?.road ?? "";
          const house = item.address?.house_number ?? "";
          const street = `${road}${house ? ` ${house}` : ""}`.trim();
          const city =
            item.address?.city ?? item.address?.town ?? item.address?.village ?? "";
          return {
            label: item.display_name ?? street,
            street: street || item.display_name || "",
            zip: item.address?.postcode ?? "",
            city,
          };
        });

        setAddressSuggestions(suggestions);
      } catch (err) {
        console.error("Address autocomplete error", err);
      } finally {
        setAddressLoading(false);
      }
    }, 350);

    return () => clearTimeout(timeout);
  }, [values.address, values.nationality, step, addressFocused]);

  const requiredFieldsByStep = useMemo(() => {
    return currentStepQuestions.filter((q) => q.required);
  }, [currentStepQuestions]);

  function validateCurrentStep(): FormErrors {
    const nextErrors: FormErrors = {};

    for (const field of requiredFieldsByStep) {
      const value = values[field.name] ?? "";
      if (value.trim().length === 0) {
        nextErrors[field.name] = tRequired;
      }
    }

    if (step === 1) {
      const phoneDigits = digitsOnly(phoneLocalValue);
      if (phoneDigits.length < 7 || phoneDigits.length > 20) {
        nextErrors.phone = tPhoneInvalid;
      }
    }

    return nextErrors;
  }

  async function handleNextStep() {
    const validationErrors = validateCurrentStep();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return false;
    const persisted = await persistDraft();
    if (!persisted) return false;
    setStep(2);
    return true;
  }

  async function handleSubmit() {
    const validationErrors = validateCurrentStep();
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
            <h1 className="page-title">{title}</h1>
            <p className="page-subtitle">{tSubmitted}</p>
          </div>
        </div>
        <div className="card">
          <p className="card-description">{trustText}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <header className="page-header">
        <div>
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
        {introParagraphs.map((paragraph) => (
          <p key={paragraph} className="intro-paragraph">{paragraph}</p>
        ))}
      </section>

      <section className="stepper card">
        <div className="stepper-row">
          <strong>{tStepTitle} {step} / 2</strong>
          <span className="status-muted">{step === 1 ? (language === "de" ? "Pers\u00f6nliche Angaben" : "Personal information") : (language === "de" ? "Medizinische Angaben" : "Medical information")}</span>
        </div>
        <div className="stepper-track">
          <div className={`stepper-fill ${step === 2 ? "stepper-fill-complete" : ""}`} />
        </div>
      </section>

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
            {currentStepQuestions.map((q) => {
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
                              onChange={() => updateValue(fieldKey, opt.value)}
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
                      onChange={(e) => updateValue(fieldKey, e.target.value)}
                    >
                      <option value="">
                        {language === "de" ? "Bitte ausw\u00e4hlen..." : "Select..."}
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

              if (q.fieldType === "phone") {
                return (
                  <div key={fieldKey} className={`field ${isFullWidth ? "grid-full" : ""}`}>
                    <div className="field-label-row">
                      <label className="field-label">
                        {q.label} {q.required && <span className="field-required">*</span>}
                      </label>
                    </div>
                    <div className="phone-row">
                      <select
                        className="select phone-country"
                        value={phoneCountryDial}
                        onChange={(e) => updatePhone(e.target.value, phoneLocalValue)}
                      >
                        {PHONE_COUNTRIES.map((country) => (
                          <option key={country.iso} value={country.dial}>
                            {country.label} ({country.dial})
                          </option>
                        ))}
                      </select>
                      <input
                        type="tel"
                        className="input"
                        value={phoneLocalValue}
                        onChange={(e) => updatePhone(phoneCountryDial, e.target.value)}
                        placeholder={language === "de" ? "Telefonnummer" : "Phone number"}
                      />
                    </div>
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
                  {fieldKey === "address" ? (
                    <div className="address-autocomplete">
                      <input
                        type={inputTypeFor(q.fieldType)}
                        className="input"
                        value={value}
                        onChange={(e) => updateValue(fieldKey, e.target.value)}
                        onFocus={() => setAddressFocused(true)}
                        onBlur={() => {
                          setTimeout(() => setAddressFocused(false), 120);
                        }}
                      />
                      {addressFocused && addressLoading && (
                        <div className="address-loading">
                          {language === "de" ? "Adressen werden geladen..." : "Loading addresses..."}
                        </div>
                      )}
                      {addressFocused && !addressLoading && addressSuggestions.length > 0 && (
                        <div className="address-suggestions">
                          {addressSuggestions.map((item) => (
                            <button
                              key={`${item.label}-${item.zip}-${item.city}`}
                              type="button"
                              className="address-suggestion"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => applyAddressSuggestion(item)}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <input
                      type={inputTypeFor(q.fieldType)}
                      className="input"
                      value={value}
                      onChange={(e) => updateValue(fieldKey, e.target.value)}
                    />
                  )}
                  {error && <div className="field-error">{error}</div>}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <hr className="divider" />

      <footer className="footer">
        {step === 2 && (
          <p className="declaration-text">{declarationText}</p>
        )}
        <div className="actions form-actions">
          {step === 1 && (
            <button
              type="button"
              className="button button-secondary"
              onClick={() => window.history.back()}
              disabled={loadingContact || savingStep}
            >
              {tBack}
            </button>
          )}
          {step === 2 && (
            <button
              type="button"
              className="button button-secondary"
              onClick={() => setStep(1)}
              disabled={submitting}
            >
              {tBack}
            </button>
          )}
          {step === 1 && (
            <button
              type="button"
              className="button button-secondary"
              onClick={async () => {
                const ok = await handleNextStep();
                if (ok) window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              disabled={loadingContact || savingStep}
            >
              {savingStep ? tSavingDraft : tNext}
            </button>
          )}
          {submitError && (
            <div className="status status-error">
              <span className="status-dot status-dot-error" />
              {submitError}
            </div>
          )}
          {step === 2 && (
            <button
              type="button"
              className="button button-primary"
              onClick={handleSubmit}
              disabled={submitting || loadingContact}
            >
              {submitting ? tSaving : tSubmit}
            </button>
          )}
        </div>
      </footer>
    </main>
  );
}

