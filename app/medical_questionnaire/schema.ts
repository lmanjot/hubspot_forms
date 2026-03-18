export type Language = "de" | "en";

export type HubSpotFieldType =
  | "single_line_text"
  | "email"
  | "phone"
  | "number"
  | "datepicker"
  | "dropdown"
  | "radio";

export type FormOption = {
  label: string;
  value: string;
};

export type QuestionDef = {
  name: string;
  label: string;
  required: boolean;
  fieldType: HubSpotFieldType;
  step: 1 | 2;
  options?: FormOption[];
  showWhen?: {
    field: string;
    value: string;
  };
};

const YES_NO_DE: FormOption[] = [
  { label: "Ja", value: "true" },
  { label: "Nein", value: "false" },
];

const YES_NO_EN: FormOption[] = [
  { label: "Yes", value: "true" },
  { label: "No", value: "false" },
];

export const MEDICAL_QUESTIONNAIRE_SCHEMA: Record<Language, QuestionDef[]> = {
  de: [
    { name: "firstname", label: "Vorname", required: true, fieldType: "single_line_text", step: 1 },
    { name: "lastname", label: "Nachname", required: true, fieldType: "single_line_text", step: 1 },
    { name: "email", label: "E-Mail", required: true, fieldType: "email", step: 1 },
    { name: "phone", label: "Telefonnummer", required: true, fieldType: "phone", step: 1 },
    { name: "medical_weight", label: "Gewicht (kg)", required: false, fieldType: "number", step: 1 },
    { name: "medical_height", label: "H\u00f6he (cm)", required: false, fieldType: "number", step: 1 },
    { name: "birthdate", label: "Geburtsdatum", required: true, fieldType: "datepicker", step: 1 },
    {
      name: "contact_gender",
      label: "Geschlecht",
      required: true,
      fieldType: "dropdown",
      step: 1,
      options: [
        { label: "Male", value: "male" },
        { label: "Weiblich", value: "female" },
      ],
    },
    { name: "address", label: "Adresszeile", required: true, fieldType: "single_line_text", step: 1 },
    { name: "zip", label: "Postleitzahl", required: true, fieldType: "single_line_text", step: 1 },
    { name: "city", label: "Stadt", required: true, fieldType: "single_line_text", step: 1 },
    {
      name: "nationality",
      label: "Nationalit\u00e4t",
      required: true,
      fieldType: "dropdown",
      step: 1,
      options: [
        { label: "Switzerland", value: "Switzerland" },
        { label: "Deutschland", value: "Germany" },
        { label: "\u00d6sterreich", value: "Austria" },
        { label: "Frankreich", value: "France" },
        { label: "Andere", value: "Other" },
      ],
    },
    { name: "medical_treatment_yesno", label: "Befinden Sie sich derzeit in \u00e4rztlicher Behandlung?", required: true, fieldType: "radio", step: 2, options: YES_NO_DE },
    { name: "medical_treatment_detail", label: "Wenn ja, welche Art von Behandlung, warum und in welcher Dosierung?", required: false, fieldType: "single_line_text", step: 2, showWhen: { field: "medical_treatment_yesno", value: "true" } },
    { name: "medical_illness_yesno", label: "Leiden Sie an einer Krankheit? (z. B. Diabetes, Krebs)", required: true, fieldType: "radio", step: 2, options: YES_NO_DE },
    { name: "medical_illness_detail", label: "Wenn ja, welche(r)?", required: false, fieldType: "single_line_text", step: 2, showWhen: { field: "medical_illness_yesno", value: "true" } },
    { name: "medical_heart_yesno", label: "Haben Sie ein Herzleiden oder eine St\u00f6rung des Kreislaufsystems? (z. B. Angina pectoris, Herzinfarkt)", required: true, fieldType: "radio", step: 2, options: YES_NO_DE },
    { name: "medical_heart_detail", label: "Wenn ja, welche(r)?", required: false, fieldType: "single_line_text", step: 2, showWhen: { field: "medical_heart_yesno", value: "true" } },
    { name: "medical_bloodpressure_yesno", label: "Hatten Sie jemals Probleme mit Ihrem Blutdruck?", required: true, fieldType: "radio", step: 2, options: YES_NO_DE },
    { name: "medical_nosebleeds_yesno", label: "Leiden Sie h\u00e4ufig unter Nasenbluten, blauen Flecken (z. B. bei leichter Ber\u00fchrung) oder Blutgerinnungsst\u00f6rungen?", required: true, fieldType: "radio", step: 2, options: YES_NO_DE },
    { name: "medical_asthma_yesno", label: "Leiden Sie an Asthma?", required: true, fieldType: "radio", step: 2, options: YES_NO_DE },
    { name: "medical_cholesterol_yesno", label: "Leiden Sie unter einem hohen Cholesterinspiegel?", required: true, fieldType: "radio", step: 2, options: YES_NO_DE },
    { name: "medical_psycho_yesno", label: "Leiden Sie unter psychischen oder emotionalen Problemen?", required: true, fieldType: "radio", step: 2, options: YES_NO_DE },
    { name: "medical_kidney_yesno", label: "Hatten Sie jemals Probleme mit Ihren Nieren?", required: true, fieldType: "radio", step: 2, options: YES_NO_DE },
    { name: "medical_liver_yesno", label: "Hatten Sie jemals Probleme mit Ihrer Leber?", required: true, fieldType: "radio", step: 2, options: YES_NO_DE },
    { name: "medical_infectious_yesno", label: "Haben Sie irgendwelche ansteckenden Krankheiten (z. B. Hepatitis B/C, HIV)?", required: true, fieldType: "radio", step: 2, options: YES_NO_DE },
    { name: "medical_pregnant_yesno", label: "Sind Sie schwanger / Besteht die M\u00f6glichkeit, dass Sie schwanger sein k\u00f6nnten?", required: true, fieldType: "radio", step: 2, options: YES_NO_DE },
    { name: "medical_breastfeed_yesno", label: "Stillen Sie zurzeit?", required: true, fieldType: "radio", step: 2, options: YES_NO_DE },
    { name: "medical_alcohol_yesno", label: "Konsumieren Sie regelm\u00e4ssig Alkohol?", required: true, fieldType: "radio", step: 2, options: YES_NO_DE },
    { name: "medical_smoke_yesno", label: "Rauchen Sie regelm\u00e4ssig?", required: true, fieldType: "radio", step: 2, options: YES_NO_DE },
    { name: "medical_medication_yesno", label: "Nehmen Sie irgendwelche Medikamente ein (einschliesslich rezeptfreier Medikamente wie Aspirin)?", required: true, fieldType: "radio", step: 2, options: YES_NO_DE },
    { name: "medical_medication_detail", label: "Wenn ja, welche Medikamente nehmen Sie ein und wie oft?", required: false, fieldType: "single_line_text", step: 2, showWhen: { field: "medical_medication_yesno", value: "true" } },
    { name: "medical_allergies_yesno", label: "Haben Sie irgendwelche Allergien oder Unvertr\u00e4glichkeiten? (z. B. Heuschnupfen, Asthma, \u00dcberempfindlichkeit gegen Penicillin, kollagenhaltige Produkte, Lidocain, Schmerzmittel, An\u00e4sthetika, Lebensmittel, Pflaster, Latex, Humanalbumin, Kochsalzl\u00f6sung, Saccharose oder andere). Wenn Sie einen Allergieausweis haben, legen Sie ihn bitte vor.", required: true, fieldType: "radio", step: 2, options: YES_NO_DE },
    { name: "medical_allergies_detail", label: "Wenn ja, gegen was sind Sie allergisch oder intolerant?", required: false, fieldType: "single_line_text", step: 2, showWhen: { field: "medical_allergies_yesno", value: "true" } },
  ],
  en: [
    { name: "firstname", label: "First Name", required: true, fieldType: "single_line_text", step: 1 },
    { name: "lastname", label: "Last Name", required: true, fieldType: "single_line_text", step: 1 },
    { name: "email", label: "Email", required: true, fieldType: "email", step: 1 },
    { name: "phone", label: "Phone Number", required: true, fieldType: "phone", step: 1 },
    { name: "medical_weight", label: "Weight (kg)", required: false, fieldType: "number", step: 1 },
    { name: "medical_height", label: "Height (cm)", required: false, fieldType: "number", step: 1 },
    { name: "birthdate", label: "Birthdate", required: true, fieldType: "datepicker", step: 1 },
    {
      name: "contact_gender",
      label: "Gender",
      required: true,
      fieldType: "dropdown",
      step: 1,
      options: [
        { label: "Male", value: "male" },
        { label: "Female", value: "female" },
      ],
    },
    { name: "address", label: "Street Address", required: true, fieldType: "single_line_text", step: 1 },
    { name: "zip", label: "Postal Code", required: true, fieldType: "single_line_text", step: 1 },
    { name: "city", label: "City", required: true, fieldType: "single_line_text", step: 1 },
    {
      name: "nationality",
      label: "Nationality",
      required: true,
      fieldType: "dropdown",
      step: 1,
      options: [
        { label: "Switzerland", value: "Switzerland" },
        { label: "Germany", value: "Germany" },
        { label: "Austria", value: "Austria" },
        { label: "France", value: "France" },
        { label: "Other", value: "Other" },
      ],
    },
    { name: "medical_treatment_yesno", label: "Are you currently receiving medical treatment?", required: true, fieldType: "radio", step: 2, options: YES_NO_EN },
    { name: "medical_treatment_detail", label: "If yes, what type of treatment, why and what dosage?", required: false, fieldType: "single_line_text", step: 2, showWhen: { field: "medical_treatment_yesno", value: "true" } },
    { name: "medical_illness_yesno", label: "Do you suffer from any illnesses? (e.g. diabetes, cancer)", required: true, fieldType: "radio", step: 2, options: YES_NO_EN },
    { name: "medical_illness_detail", label: "If yes, which one(s)?", required: false, fieldType: "single_line_text", step: 2, showWhen: { field: "medical_illness_yesno", value: "true" } },
    { name: "medical_heart_yesno", label: "Do you have a heart condition or a disorder of the circulatory system? (e.g. angina pectoris, heart attack)", required: true, fieldType: "radio", step: 2, options: YES_NO_EN },
    { name: "medical_heart_detail", label: "If yes, which one(s)?", required: false, fieldType: "single_line_text", step: 2, showWhen: { field: "medical_heart_yesno", value: "true" } },
    { name: "medical_bloodpressure_yesno", label: "Have you ever had problems with your blood pressure?", required: true, fieldType: "radio", step: 2, options: YES_NO_EN },
    { name: "medical_nosebleeds_yesno", label: "Do you frequently suffer from nosebleeds, bruises (e.g. from a light touch), or blood clotting disorders?", required: true, fieldType: "radio", step: 2, options: YES_NO_EN },
    { name: "medical_asthma_yesno", label: "Do you suffer from asthma?", required: true, fieldType: "radio", step: 2, options: YES_NO_EN },
    { name: "medical_cholesterol_yesno", label: "Do you suffer from high cholesterol?", required: true, fieldType: "radio", step: 2, options: YES_NO_EN },
    { name: "medical_psycho_yesno", label: "Do you suffer from psychological or emotional problems?", required: true, fieldType: "radio", step: 2, options: YES_NO_EN },
    { name: "medical_kidney_yesno", label: "Have you ever had problems with your kidneys?", required: true, fieldType: "radio", step: 2, options: YES_NO_EN },
    { name: "medical_liver_yesno", label: "Have you ever had problems with your liver?", required: true, fieldType: "radio", step: 2, options: YES_NO_EN },
    { name: "medical_infectious_yesno", label: "Do you have any infectious diseases (e.g. hepatitis B/C, HIV)?", required: true, fieldType: "radio", step: 2, options: YES_NO_EN },
    { name: "medical_pregnant_yesno", label: "Are you pregnant / Is there a possibility that you might be pregnant?", required: true, fieldType: "radio", step: 2, options: YES_NO_EN },
    { name: "medical_breastfeed_yesno", label: "Are you currently breastfeeding?", required: true, fieldType: "radio", step: 2, options: YES_NO_EN },
    { name: "medical_alcohol_yesno", label: "Do you regularly consume alcohol?", required: true, fieldType: "radio", step: 2, options: YES_NO_EN },
    { name: "medical_smoke_yesno", label: "Do you smoke regularly?", required: true, fieldType: "radio", step: 2, options: YES_NO_EN },
    { name: "medical_medication_yesno", label: "Do you take any medications (including over-the-counter medications such as aspirin)?", required: true, fieldType: "radio", step: 2, options: YES_NO_EN },
    { name: "medical_medication_detail", label: "If yes, what medications do you take and how often?", required: false, fieldType: "single_line_text", step: 2, showWhen: { field: "medical_medication_yesno", value: "true" } },
    { name: "medical_allergies_yesno", label: "Do you have any allergies or intolerances? (e.g. hay fever, asthma, sensitivity to penicillin, collagen-containing products, lidocaine, painkillers, anesthetics, food, patches, latex, human albumin, saline solution, sucrose, or other). If you have an allergy ID card, please present it.", required: true, fieldType: "radio", step: 2, options: YES_NO_EN },
    { name: "medical_allergies_detail", label: "If yes, what are you allergic or intolerant to?", required: false, fieldType: "single_line_text", step: 2, showWhen: { field: "medical_allergies_yesno", value: "true" } },
  ],
};

export const ALL_MEDICAL_FIELD_NAMES = Array.from(
  new Set(
    Object.values(MEDICAL_QUESTIONNAIRE_SCHEMA)
      .flat()
      .map((q) => q.name)
  )
);

