import type { Metadata } from "next";
import PrescriptionClient from "./PrescriptionClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Māra – Rezept erstellen",
};

export default function PrescriptionPage() {
  return <PrescriptionClient />;
}
