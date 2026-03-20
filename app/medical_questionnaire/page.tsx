import type { Metadata } from "next";
import MedicalQuestionnaireClient from "./MedicalQuestionnaireClient";

type Props = {
  searchParams: { lang?: string };
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { lang } = searchParams;
  const title =
    lang === "de"
      ? "Māra – Medizinischer Fragebogen"
      : "Māra – Medical Questionnaire";
  return { title };
}

export default function MedicalQuestionnairePage() {
  return <MedicalQuestionnaireClient />;
}
