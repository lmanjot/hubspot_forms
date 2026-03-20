import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Māra",
  description: "Custom HubSpot forms (e.g. medical questionnaire)",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
