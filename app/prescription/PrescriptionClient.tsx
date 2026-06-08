"use client";

import { Suspense } from "react";
import PrescriptionContent from "./PrescriptionContent";

function Fallback() {
  return (
    <main className="page">
      <div className="page-header">
        <h1 className="page-title">Rezept erstellen</h1>
        <p className="page-subtitle">Wird geladen…</p>
      </div>
    </main>
  );
}

export default function PrescriptionClient() {
  return (
    <Suspense fallback={<Fallback />}>
      <PrescriptionContent />
    </Suspense>
  );
}
