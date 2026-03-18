export type Language = "de" | "en";

export type FieldType = "text" | "textarea" | "select";

export type Option = {
  value: string;
  label: string;
};

export type Question = {
  id: string;
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: Option[];
  help?: string | null;
};

const SMOKING_OPTIONS_DE: Option[] = [
  { value: "never", label: "Nie" },
  { value: "former", label: "Frueher" },
  { value: "current", label: "Aktuell" },
];

const SMOKING_OPTIONS_EN: Option[] = [
  { value: "never", label: "Never" },
  { value: "former", label: "Former" },
  { value: "current", label: "Current" },
];

// Stored form schema snapshot. Edit this file if field structure changes.
export const MEDICAL_QUESTIONNAIRE_SCHEMA: Record<Language, Question[]> = {
  de: [
    { id: "firstname", name: "firstname", label: "Vorname", type: "text", required: true },
    { id: "lastname", name: "lastname", label: "Nachname", type: "text", required: true },
    { id: "email", name: "email", label: "E-Mail", type: "text", required: true },
    { id: "phone", name: "phone", label: "Telefon", type: "text", required: false },
    {
      id: "date_of_birth",
      name: "date_of_birth",
      label: "Geburtsdatum",
      type: "text",
      required: false,
      help: "Format: YYYY-MM-DD",
    },
    {
      id: "medical_allergies",
      name: "medical_allergies",
      label: "Allergien",
      type: "textarea",
      required: false,
    },
    {
      id: "medical_medications",
      name: "medical_medications",
      label: "Medikamente",
      type: "textarea",
      required: false,
    },
    {
      id: "lifestyle_smoking_status",
      name: "lifestyle_smoking_status",
      label: "Raucherstatus",
      type: "select",
      required: false,
      options: SMOKING_OPTIONS_DE,
    },
    {
      id: "medical_notes",
      name: "medical_notes",
      label: "Zusaetzliche medizinische Hinweise",
      type: "textarea",
      required: false,
    },
  ],
  en: [
    { id: "firstname", name: "firstname", label: "First name", type: "text", required: true },
    { id: "lastname", name: "lastname", label: "Last name", type: "text", required: true },
    { id: "email", name: "email", label: "Email", type: "text", required: true },
    { id: "phone", name: "phone", label: "Phone", type: "text", required: false },
    {
      id: "date_of_birth",
      name: "date_of_birth",
      label: "Date of birth",
      type: "text",
      required: false,
      help: "Format: YYYY-MM-DD",
    },
    {
      id: "medical_allergies",
      name: "medical_allergies",
      label: "Allergies",
      type: "textarea",
      required: false,
    },
    {
      id: "medical_medications",
      name: "medical_medications",
      label: "Medications",
      type: "textarea",
      required: false,
    },
    {
      id: "lifestyle_smoking_status",
      name: "lifestyle_smoking_status",
      label: "Smoking status",
      type: "select",
      required: false,
      options: SMOKING_OPTIONS_EN,
    },
    {
      id: "medical_notes",
      name: "medical_notes",
      label: "Additional medical notes",
      type: "textarea",
      required: false,
    },
  ],
};
