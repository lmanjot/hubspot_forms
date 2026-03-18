"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  { iso: "FR", label: "France", dial: "+33" },
  { iso: "IT", label: "Italy", dial: "+39" },
  { iso: "AT", label: "Austria", dial: "+43" },
  { iso: "ES", label: "Spain", dial: "+34" },
  { iso: "GB", label: "United Kingdom", dial: "+44" },
  { iso: "US", label: "United States", dial: "+1" },
];
const PRIORITY_PHONE_ISOS = ["CH", "DE", "FR", "IT", "AT", "ES"] as const;

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
  const [phoneCountryIso, setPhoneCountryIso] = useState<string>(
    PHONE_COUNTRIES[0].iso
  );
  const [phoneInputValue, setPhoneInputValue] = useState<string>(
    PHONE_COUNTRIES[0].dial
  );
  const [phoneCountries, setPhoneCountries] = useState<PhoneCountry[]>(PHONE_COUNTRIES);
  const [phoneDropdownOpen, setPhoneDropdownOpen] = useState(false);
  const [phoneCountrySearch, setPhoneCountrySearch] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressFocused, setAddressFocused] = useState(false);
  const phoneDropdownRef = useRef<HTMLDivElement | null>(null);
  const stepHistorySourceRef = useRef<"app" | "pop" | null>(null);

  const contactId = searchParams.get("contact_id") ?? undefined;

  const allQuestions = useMemo(() => MEDICAL_QUESTIONNAIRE_SCHEMA[language], [language]);
  const countriesByDialLength = useMemo(
    () => [...phoneCountries].sort((a, b) => b.dial.length - a.dial.length),
    [phoneCountries]
  );
  const orderedPhoneCountries = useMemo(() => {
    return [...phoneCountries].sort((a, b) => {
      const ia = PRIORITY_PHONE_ISOS.indexOf(a.iso as (typeof PRIORITY_PHONE_ISOS)[number]);
      const ib = PRIORITY_PHONE_ISOS.indexOf(b.iso as (typeof PRIORITY_PHONE_ISOS)[number]);
      const aRank = ia === -1 ? Number.MAX_SAFE_INTEGER : ia;
      const bRank = ib === -1 ? Number.MAX_SAFE_INTEGER : ib;
      if (aRank !== bRank) return aRank - bRank;
      return a.label.localeCompare(b.label, "en");
    });
  }, [phoneCountries]);
  const filteredPhoneCountries = useMemo(() => {
    const query = phoneCountrySearch.trim().toLowerCase();
    if (!query) return orderedPhoneCountries;
    return orderedPhoneCountries.filter((country) =>
      `${country.iso} ${country.label} ${country.dial}`.toLowerCase().includes(query)
    );
  }, [orderedPhoneCountries, phoneCountrySearch]);

  function parsePhoneWithCountries(value: string) {
    const compact = value.replace(/[^\d+]/g, "");
    for (const country of countriesByDialLength) {
      if (compact.startsWith(country.dial)) {
        return {
          dial: country.dial,
          local: compact.slice(country.dial.length),
          iso: country.iso,
        };
      }
    }
    return {
      dial: PHONE_COUNTRIES[0].dial,
      local: compact.replace(/^\+/, ""),
      iso: PHONE_COUNTRIES[0].iso,
    };
  }

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

  function updatePhoneFromInput(nextRaw: string) {
    const normalizedRaw =
      nextRaw.length === 0
        ? ""
        : nextRaw.startsWith("+")
          ? `+${nextRaw.slice(1).replace(/[^\d]/g, "")}`
          : `+${nextRaw.replace(/[^\d]/g, "")}`;

    setPhoneInputValue(normalizedRaw);
    updateValue("phone", normalizedRaw);

    const parsed = parsePhoneWithCountries(normalizedRaw);
    setPhoneCountryIso(parsed.iso);
  }

  function applyPhoneCountry(nextIso: string) {
    const selected =
      phoneCountries.find((country) => country.iso === nextIso) ??
      PHONE_COUNTRIES[0];
    const parsed = parsePhoneWithCountries(phoneInputValue);
    const localDigits = parsed.local.replace(/[^\d]/g, "");
    const nextValue = `${selected.dial}${localDigits}`;
    setPhoneCountryIso(selected.iso);
    setPhoneInputValue(nextValue);
    updateValue("phone", nextValue);
  }

  function handlePhoneCountrySelect(nextIso: string) {
    applyPhoneCountry(nextIso);
    setPhoneDropdownOpen(false);
    setPhoneCountrySearch("");
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
        body: JSON.stringify({ values, contactId, finalSubmit: false, language }),
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
            const parsed = parsePhoneWithCountries(initialValues.phone);
            setPhoneCountryIso(parsed.iso);
            setPhoneInputValue(`${parsed.dial}${parsed.local}`);
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

  // Make browser "back" behave like "previous step" while on step 2.
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      window.history.replaceState(
        { ...(window.history.state || {}), mqStep: 1 },
        "",
        window.location.href
      );
    } catch {
      // ignore history errors
    }

    function onPopState(e: PopStateEvent) {
      const mqStep = (e.state as any)?.mqStep;
      if (mqStep === 1 || mqStep === 2) {
        stepHistorySourceRef.current = "pop";
        setStep(mqStep);
      }
    }

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (stepHistorySourceRef.current !== "app") return;

    try {
      if (step === 2) {
        window.history.pushState(
          { ...(window.history.state || {}), mqStep: 2 },
          "",
          window.location.href
        );
      } else {
        window.history.replaceState(
          { ...(window.history.state || {}), mqStep: 1 },
          "",
          window.location.href
        );
      }
    } finally {
      stepHistorySourceRef.current = null;
    }
  }, [step]);

  useEffect(() => {
    let cancelled = false;

    async function loadCountries() {
      try {
        const res = await fetch("https://restcountries.com/v3.1/all?fields=cca2,name,idd");
        if (!res.ok) return;
        const json = (await res.json()) as Array<{
          cca2?: string;
          name?: { common?: string };
          idd?: { root?: string; suffixes?: string[] };
        }>;

        const parsed: PhoneCountry[] = json
          .flatMap((item) => {
            const iso = (item.cca2 ?? "").toUpperCase();
            const label = item.name?.common ?? iso;
            const root = item.idd?.root ?? "";
            const suffixes = item.idd?.suffixes ?? [];
            if (!iso || !root || !suffixes.length) return [];
            return suffixes.map((suffix) => ({
              iso,
              label,
              dial: `${root}${suffix}`,
            }));
          })
          .filter((item) => /^\+\d+$/.test(item.dial));

        const unique = new Map<string, PhoneCountry>();
        for (const entry of [...PHONE_COUNTRIES, ...parsed]) {
          if (!unique.has(entry.iso)) {
            unique.set(entry.iso, entry);
          }
        }

        const all = [...unique.values()].sort((a, b) =>
          a.label.localeCompare(b.label, "en")
        );

        if (!cancelled) {
          setPhoneCountries(all);
        }
      } catch (err) {
        console.error("Country list load error", err);
      }
    }

    void loadCountries();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!phoneDropdownRef.current) return;
      if (!phoneDropdownRef.current.contains(event.target as Node)) {
        setPhoneDropdownOpen(false);
        setPhoneCountrySearch("");
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

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
        const countrycodes = "ch";
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
          const zip = item.address?.postcode ?? "";
          return {
            label: `${street}${zip || city ? ", " : ""}${zip} ${city}`.trim(),
            street: street || item.display_name || "",
            zip,
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
  }, [values.address, step, addressFocused]);

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
      const parsed = parsePhoneWithCountries(phoneInputValue);
      const phoneDigits = digitsOnly(parsed.local);
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
    stepHistorySourceRef.current = "app";
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
        body: JSON.stringify({ values, contactId, finalSubmit: true, language }),
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

      {step === 2 && (
        <div className="actions" style={{ justifyContent: "flex-start", margin: "0 0 12px" }}>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => {
              stepHistorySourceRef.current = "app";
              setStep(1);
            }}
            disabled={submitting}
          >
            {tBack}
          </button>
        </div>
      )}

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
                      <div className="phone-country-dropdown" ref={phoneDropdownRef}>
                        <button
                          type="button"
                          className="phone-country-trigger"
                          onClick={() => setPhoneDropdownOpen((prev) => !prev)}
                          aria-haspopup="listbox"
                          aria-expanded={phoneDropdownOpen}
                        >
                          <span>{phoneCountryIso}</span>
                          <span className="phone-country-caret" />
                        </button>
                        {phoneDropdownOpen && (
                          <div className="phone-country-menu" role="listbox">
                            <input
                              type="text"
                              className="phone-country-search"
                              placeholder={language === "de" ? "Suchen" : "Search"}
                              value={phoneCountrySearch}
                              onChange={(e) => setPhoneCountrySearch(e.target.value)}
                            />
                            <div className="phone-country-list">
                              {filteredPhoneCountries.map((country) => (
                                <button
                                  key={country.iso}
                                  type="button"
                                  className={`phone-country-option ${
                                    country.iso === phoneCountryIso
                                      ? "phone-country-option-active"
                                      : ""
                                  }`}
                                  onClick={() => handlePhoneCountrySelect(country.iso)}
                                >
                                  <span className="phone-country-option-iso">{country.iso}</span>
                                  <span className="phone-country-option-label">{country.label}</span>
                                  <span className="phone-country-option-dial">{country.dial}</span>
                                </button>
                              ))}
                              {filteredPhoneCountries.length === 0 && (
                                <div className="phone-country-empty">
                                  {language === "de" ? "Keine Treffer" : "No matches"}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      <input
                        type="tel"
                        className="input"
                        value={phoneInputValue}
                        onChange={(e) => updatePhoneFromInput(e.target.value)}
                        placeholder={language === "de" ? "+41..." : "+41..."}
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
              className="button button-secondary button-nav"
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

