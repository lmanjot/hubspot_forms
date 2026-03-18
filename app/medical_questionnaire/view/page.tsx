import { MEDICAL_QUESTIONNAIRE_SCHEMA, ALL_MEDICAL_FIELD_NAMES, type Language, type QuestionDef } from "../schema";

const HUBSPOT_BASE = "https://api.hubapi.com";

function mapDisplayValue(question: QuestionDef, rawValue: string): string {
  if (!question.options || question.options.length === 0) return rawValue;
  const mapped = question.options.find((opt) => opt.value === rawValue);
  return mapped ? mapped.label : rawValue;
}

function isVisibleByCondition(question: QuestionDef, values: Record<string, string>) {
  if (!question.showWhen) return true;
  const sourceValue = values[question.showWhen.field] ?? "";
  return sourceValue === question.showWhen.value;
}

export default async function MedicalQuestionnaireViewPage({
  searchParams,
}: {
  searchParams: { contact_id?: string; lang?: string };
}) {
  const token = process.env.HUBSPOT_TOKEN;

  const contactId = searchParams.contact_id ?? "";
  const language: Language = (searchParams.lang === "en" ? "en" : "de") as Language;

  const requestedProperties = [
    ...ALL_MEDICAL_FIELD_NAMES,
    // link to the stored PDF generated at submit time
    "medical_questionnaire",
  ];

  if (!token) {
    return (
      <main className="page">
        <div className="card">
          <h1 className="page-title">Doctor View</h1>
          <p className="card-description status-error">HubSpot configuration missing on server.</p>
        </div>
      </main>
    );
  }

  if (!contactId) {
    return (
      <main className="page">
        <div className="card">
          <h1 className="page-title">Doctor View</h1>
          <p className="card-description status-error">Missing `contact_id` in URL.</p>
        </div>
      </main>
    );
  }

  let values: Record<string, string> = {};
  let pdfLink: string | null = null;
  try {
    const hubspotUrl = new URL(
      `${HUBSPOT_BASE}/crm/v3/objects/contacts/${encodeURIComponent(contactId)}`
    );
    for (const prop of requestedProperties) {
      hubspotUrl.searchParams.append("properties", prop);
    }

    const res = await fetch(hubspotUrl.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const json: any = await res.json();
    if (!res.ok) {
      return (
        <main className="page">
          <div className="card">
            <h1 className="page-title">Doctor View</h1>
            <p className="card-description status-error">
              HubSpot contact fetch failed.
            </p>
            <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(json, null, 2)}</pre>
          </div>
        </main>
      );
    }

    const props = (json?.properties ?? {}) as Record<string, unknown>;

    for (const name of ALL_MEDICAL_FIELD_NAMES) {
      const v = props[name];
      if (v !== null && v !== undefined) values[name] = String(v);
    }

    const maybePdf = props["medical_questionnaire"];
    if (maybePdf !== null && maybePdf !== undefined) {
      pdfLink = String(maybePdf);
      // HubSpot may return just an ID; still show it as a link-ish value if so.
      if (pdfLink.trim().length === 0) pdfLink = null;
    }
  } catch (err) {
    return (
      <main className="page">
        <div className="card">
          <h1 className="page-title">Doctor View</h1>
          <p className="card-description status-error">
            Failed to load patient questionnaire.
          </p>
        </div>
      </main>
    );
  }

  const step1Questions = MEDICAL_QUESTIONNAIRE_SCHEMA[language].filter(
    (q) => q.step === 1
  );
  const step2Questions = MEDICAL_QUESTIONNAIRE_SCHEMA[language].filter(
    (q) => q.step === 2
  );

  const title =
    language === "de" ? "Arztansicht" : "Doctor View";

  const subtitle =
    language === "de"
      ? "Medizinischer Fragebogen (nicht editierbar)"
      : "Medical Questionnaire (read-only)";

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">{subtitle}</p>
        </div>
      </header>

      {pdfLink && (
        <section className="card">
          <div className="doctor-field-row">
            <div className="doctor-field-label">
              {language === "de" ? "PDF" : "PDF"}
            </div>
            <div className="doctor-field-value">
              <a href={pdfLink} target="_blank" rel="noreferrer">
                {language === "de" ? "Öffnen" : "Open"} PDF
              </a>
            </div>
          </div>
        </section>
      )}

      <section className="card">
        <h2 className="doctor-section-title">
          {language === "de" ? "Schritt 1: Persönliche Angaben" : "Step 1: Personal information"}
        </h2>
        <div className="doctor-table">
          {step1Questions.map((q) => {
            if (!isVisibleByCondition(q, values)) return null;
            const rawValue = values[q.name] ?? "";
            const isAffirmative = q.fieldType === "radio" && rawValue === "true";
            const displayValue =
              rawValue.trim().length > 0
                ? mapDisplayValue(q, rawValue)
                : "—";
            return (
              <div key={q.name} className="doctor-table-row">
                <div className="doctor-table-label">
                  {q.label}
                </div>
                <div className={`doctor-table-value ${isAffirmative ? "doctor-yes" : ""}`}>
                  {displayValue}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card">
        <h2 className="doctor-section-title">
          {language === "de" ? "Schritt 2: Medizinische Angaben" : "Step 2: Medical information"}
        </h2>
        <div className="doctor-table">
          {step2Questions.map((q) => {
            if (!isVisibleByCondition(q, values)) return null;
            const rawValue = values[q.name] ?? "";
            const isAffirmative = q.fieldType === "radio" && rawValue === "true";
            const displayValue =
              rawValue.trim().length > 0
                ? mapDisplayValue(q, rawValue)
                : "—";
            return (
              <div key={q.name} className="doctor-table-row">
                <div className="doctor-table-label">
                  {q.label}
                </div>
                <div className={`doctor-table-value ${isAffirmative ? "doctor-yes" : ""}`}>
                  {displayValue}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}

