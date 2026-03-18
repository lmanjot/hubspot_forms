"use client";

import { Suspense } from "react";
import MedicalQuestionnaireContent from "./MedicalQuestionnaireContent";

function Fallback() {
  return (
    <main className="page">
      <div className="page-header">
        <h1 className="page-title">Medical Questionnaire</h1>
        <p className="page-subtitle">Loading…</p>
      </div>
    </main>
  );
}

export default function MedicalQuestionnairePage() {
  return (
    <Suspense fallback={<Fallback />}>
      <MedicalQuestionnaireContent />
    </Suspense>
  );
}
