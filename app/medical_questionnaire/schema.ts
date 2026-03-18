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
  hidden: boolean;
  fieldType: HubSpotFieldType;
  options?: FormOption[];
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
    { name: "firstname", label: "Vorname", required: true, hidden: false, fieldType: "single_line_text" },
    { name: "lastname", label: "Nachname", required: true, hidden: false, fieldType: "single_line_text" },
    { name: "email", label: "E-Mail", required: true, hidden: false, fieldType: "email" },
    { name: "phone", label: "Telefonnummer", required: true, hidden: false, fieldType: "phone" },
    { name: "medical_weight", label: "Gewicht (kg)", required: false, hidden: false, fieldType: "number" },
    { name: "medical_height", label: "Höhe (cm)", required: false, hidden: false, fieldType: "number" },
    { name: "birthdate", label: "Geburtsdatum", required: true, hidden: false, fieldType: "datepicker" },
    {
      name: "contact_gender",
      label: "Geschlecht",
      required: true,
      hidden: false,
      fieldType: "dropdown",
      options: [
        { label: "Male", value: "male" },
        { label: "Weiblich", value: "female" },
      ],
    },
    { name: "address", label: "Adresszeile", required: true, hidden: false, fieldType: "single_line_text" },
    { name: "zip", label: "Postleitzahl", required: true, hidden: false, fieldType: "single_line_text" },
    { name: "city", label: "Stadt", required: true, hidden: false, fieldType: "single_line_text" },
    {
      name: "nationality",
      label: "Nationalität",
      required: true,
      hidden: false,
      fieldType: "dropdown",
      options: [
        { label: "Switzerland", value: "Switzerland" },
        { label: "Deutschland", value: "Germany" },
        { label: "Österreich", value: "Austria" },
        { label: "Frankreich", value: "France" },
        { label: "Andere", value: "Other" },
      ],
    },
    { name: "medical_treatment_yesno", label: "Befinden Sie sich derzeit in ärztlicher Behandlung?", required: true, hidden: false, fieldType: "radio", options: YES_NO_DE },
    { name: "medical_treatment_detail", label: "Wenn ja, welche Art von Behandlung, warum und in welcher Dosierung?", required: false, hidden: false, fieldType: "single_line_text" },
    { name: "medical_illness_yesno", label: "Leiden Sie an einer Krankheit? (z. B. Diabetes, Krebs)", required: true, hidden: false, fieldType: "radio", options: YES_NO_DE },
    { name: "medical_illness_detail", label: "Wenn ja, welche(r)?", required: false, hidden: false, fieldType: "single_line_text" },
    { name: "medical_heart_yesno", label: "Haben Sie ein Herzleiden oder eine Störung des Kreislaufsystems? (z. B. Angina pectoris, Herzinfarkt)", required: true, hidden: false, fieldType: "radio", options: YES_NO_DE },
    { name: "medical_heart_detail", label: "Wenn ja, welche(r)?", required: false, hidden: false, fieldType: "single_line_text" },
    { name: "medical_bloodpressure_yesno", label: "Hatten Sie jemals Probleme mit Ihrem Blutdruck?", required: true, hidden: false, fieldType: "radio", options: YES_NO_DE },
    { name: "medical_nosebleeds_yesno", label: "Leiden Sie häufig unter Nasenbluten, blauen Flecken (z. B. bei leichter Berührung) oder Blutgerinnungsstörungen?", required: true, hidden: false, fieldType: "radio", options: YES_NO_DE },
    { name: "medical_asthma_yesno", label: "Leiden Sie an Asthma?", required: true, hidden: false, fieldType: "radio", options: YES_NO_DE },
    { name: "medical_cholesterol_yesno", label: "Leiden Sie unter einem hohen Cholesterinspiegel?", required: true, hidden: false, fieldType: "radio", options: YES_NO_DE },
    { name: "medical_psycho_yesno", label: "Leiden Sie unter psychischen oder emotionalen Problemen?", required: true, hidden: false, fieldType: "radio", options: YES_NO_DE },
    { name: "medical_kidney_yesno", label: "Hatten Sie jemals Probleme mit Ihren Nieren?", required: true, hidden: false, fieldType: "radio", options: YES_NO_DE },
    { name: "medical_liver_yesno", label: "Hatten Sie jemals Probleme mit Ihrer Leber?", required: true, hidden: false, fieldType: "radio", options: YES_NO_DE },
    { name: "medical_infectious_yesno", label: "Haben Sie irgendwelche ansteckenden Krankheiten (z. B. Hepatitis B/C, HIV)?", required: true, hidden: false, fieldType: "radio", options: YES_NO_DE },
    { name: "medical_pregnant_yesno", label: "Sind Sie schwanger / Besteht die Möglichkeit, dass Sie schwanger sein könnten?", required: true, hidden: false, fieldType: "radio", options: YES_NO_DE },
    { name: "medical_breastfeed_yesno", label: "Stillen Sie zurzeit?", required: true, hidden: false, fieldType: "radio", options: YES_NO_DE },
    { name: "medical_alcohol_yesno", label: "Konsumieren Sie regelmässig Alkohol?", required: true, hidden: false, fieldType: "radio", options: YES_NO_DE },
    { name: "medical_smoke_yesno", label: "Rauchen Sie regelmässig?", required: true, hidden: false, fieldType: "radio", options: YES_NO_DE },
    { name: "medical_medication_yesno", label: "Nehmen Sie irgendwelche Medikamente ein (einschliesslich rezeptfreier Medikamente wie Aspirin)?", required: true, hidden: false, fieldType: "radio", options: YES_NO_DE },
    { name: "medical_medication_detail", label: "Wenn ja, welche Medikamente nehmen Sie ein und wie oft?", required: false, hidden: false, fieldType: "single_line_text" },
    { name: "medical_allergies_yesno", label: "Haben Sie irgendwelche Allergien oder Unverträglichkeiten? (z. B. Heuschnupfen, Asthma, Überempfindlichkeit gegen Penicillin, kollagenhaltige Produkte, Lidocain, Schmerzmittel, Anästhetika, Lebensmittel, Pflaster, Latex, Humanalbumin, Kochsalzlösung, Saccharose oder andere). Wenn Sie einen Allergieausweis haben, legen Sie ihn bitte vor.", required: true, hidden: false, fieldType: "radio", options: YES_NO_DE },
    { name: "medical_allergies_detail", label: "Wenn ja, gegen was sind Sie allergisch oder intolerant?", required: false, hidden: false, fieldType: "single_line_text" },
    { name: "medical_agreegtc_yesno", label: " Ich bin mit den Allgemeinen Geschäftsbedingungen einverstanden", required: false, hidden: true, fieldType: "radio", options: YES_NO_DE },
    { name: "medical_agreeprivacy_yesno", label: " Ich akzeptiere die Datenschutzbestimmungen", required: false, hidden: true, fieldType: "radio", options: YES_NO_DE },
  ],
  en: [
    { name: "firstname", label: "First Name", required: true, hidden: false, fieldType: "single_line_text" },
    { name: "lastname", label: "Last Name", required: true, hidden: false, fieldType: "single_line_text" },
    { name: "email", label: "Email", required: true, hidden: false, fieldType: "email" },
    { name: "phone", label: "Phone Number", required: true, hidden: false, fieldType: "phone" },
    { name: "medical_weight", label: "Weight (kg)", required: false, hidden: false, fieldType: "number" },
    { name: "medical_height", label: "Height (cm)", required: false, hidden: false, fieldType: "number" },
    { name: "birthdate", label: "Birthdate", required: true, hidden: false, fieldType: "datepicker" },
    {
      name: "contact_gender",
      label: "Gender",
      required: true,
      hidden: false,
      fieldType: "dropdown",
      options: [
        { label: "Male", value: "male" },
        { label: "Female", value: "female" },
      ],
    },
    { name: "address", label: "Street Address", required: true, hidden: false, fieldType: "single_line_text" },
    { name: "zip", label: "Postal Code", required: true, hidden: false, fieldType: "single_line_text" },
    { name: "city", label: "City", required: true, hidden: false, fieldType: "single_line_text" },
    {
      name: "nationality",
      label: "Nationality",
      required: true,
      hidden: false,
      fieldType: "dropdown",
      options: [
        { label: "Switzerland", value: "Switzerland" },
        { label: "Germany", value: "Germany" },
        { label: "Austria", value: "Austria" },
        { label: "France", value: "France" },
        { label: "Other", value: "Other" },
      ],
    },
    { name: "medical_treatment_yesno", label: "Are you currently receiving medical treatment?", required: true, hidden: false, fieldType: "radio", options: YES_NO_EN },
    { name: "medical_treatment_detail", label: "If yes, what type of treatment, why and what dosage?", required: false, hidden: false, fieldType: "single_line_text" },
    { name: "medical_illness_yesno", label: "Do you suffer from any illnesses? (e.g. diabetes, cancer)", required: true, hidden: false, fieldType: "radio", options: YES_NO_EN },
    { name: "medical_illness_detail", label: "If yes, which one(s)?", required: false, hidden: false, fieldType: "single_line_text" },
    { name: "medical_heart_yesno", label: "Do you have a heart condition or a disorder of the circulatory system? (e.g. angina pectoris, heart attack)", required: true, hidden: false, fieldType: "radio", options: YES_NO_EN },
    { name: "medical_heart_detail", label: "If yes, which one(s)?", required: false, hidden: false, fieldType: "single_line_text" },
    { name: "medical_bloodpressure_yesno", label: "Have you ever had problems with your blood pressure?", required: true, hidden: false, fieldType: "radio", options: YES_NO_EN },
    { name: "medical_nosebleeds_yesno", label: "Do you frequently suffer from nosebleeds, bruises (e.g. from a light touch), or blood clotting disorders?", required: true, hidden: false, fieldType: "radio", options: YES_NO_EN },
    { name: "medical_asthma_yesno", label: "Do you suffer from asthma?", required: true, hidden: false, fieldType: "radio", options: YES_NO_EN },
    { name: "medical_cholesterol_yesno", label: "Do you suffer from high cholesterol?", required: true, hidden: false, fieldType: "radio", options: YES_NO_EN },
    { name: "medical_psycho_yesno", label: "Do you suffer from psychological or emotional problems?", required: true, hidden: false, fieldType: "radio", options: YES_NO_EN },
    { name: "medical_kidney_yesno", label: "Have you ever had problems with your kidneys?", required: true, hidden: false, fieldType: "radio", options: YES_NO_EN },
    { name: "medical_liver_yesno", label: "Have you ever had problems with your liver?", required: true, hidden: false, fieldType: "radio", options: YES_NO_EN },
    { name: "medical_infectious_yesno", label: "Do you have any infectious diseases (e.g. hepatitis B/C, HIV)?", required: true, hidden: false, fieldType: "radio", options: YES_NO_EN },
    { name: "medical_pregnant_yesno", label: "Are you pregnant / Is there a possibility that you might be pregnant?", required: true, hidden: false, fieldType: "radio", options: YES_NO_EN },
    { name: "medical_breastfeed_yesno", label: "Are you currently breastfeeding?", required: true, hidden: false, fieldType: "radio", options: YES_NO_EN },
    { name: "medical_alcohol_yesno", label: "Do you regularly consume alcohol?", required: true, hidden: false, fieldType: "radio", options: YES_NO_EN },
    { name: "medical_smoke_yesno", label: "Do you smoke regularly?", required: true, hidden: false, fieldType: "radio", options: YES_NO_EN },
    { name: "medical_medication_yesno", label: "Do you take any medications (including over-the-counter medications such as aspirin)?", required: true, hidden: false, fieldType: "radio", options: YES_NO_EN },
    { name: "medical_medication_detail", label: "If yes, what medications do you take and how often?", required: false, hidden: false, fieldType: "single_line_text" },
    { name: "medical_allergies_yesno", label: "Do you have any allergies or intolerances? (e.g. hay fever, asthma, sensitivity to penicillin, collagen-containing products, lidocaine, painkillers, anesthetics, food, patches, latex, human albumin, saline solution, sucrose, or other). If you have an allergy ID card, please present it.", required: true, hidden: false, fieldType: "radio", options: YES_NO_EN },
    { name: "medical_allergies_detail", label: "If yes, what are you allergic or intolerant to?", required: false, hidden: false, fieldType: "single_line_text" },
    { name: "medical_agreegtc_yesno", label: " I agree with the general terms and conditions of business", required: false, hidden: false, fieldType: "radio", options: YES_NO_EN },
    { name: "medical_agreeprivacy_yesno", label: " I agree to the privacy policy", required: false, hidden: false, fieldType: "radio", options: YES_NO_EN },
  ],
};

export const ALL_MEDICAL_FIELD_NAMES = Array.from(
  new Set(
    Object.values(MEDICAL_QUESTIONNAIRE_SCHEMA)
      .flat()
      .map((q) => q.name)
  )
);

