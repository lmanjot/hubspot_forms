'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';

function QRContent() {
  const searchParams = useSearchParams();
  const contactId = searchParams.get('contact_id');
  const [lang, setLang] = useState('de');

  if (!contactId) {
    return (
      <div style={styles.wrapper}>
        <p style={styles.error}>Missing contact_id parameter</p>
      </div>
    );
  }

  const formUrl = `https://forms.mara.care/medical_questionnaire?contact_id=${encodeURIComponent(contactId)}&lang=${lang}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(formUrl)}`;

  return (
    <div style={styles.wrapper}>
      <h1 style={styles.title}>Medical Form QR</h1>
      <p style={styles.subtitle}>
        Scan the QR code below to open the medical form on the patient&apos;s device.
      </p>
      <div style={styles.controls}>
        <span>Language:</span>
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          style={styles.select}
        >
          <option value="de">Deutsch</option>
          <option value="en">English</option>
        </select>
      </div>
      <div style={styles.qrWrap}>
        <img
          src={qrSrc}
          alt="Medical form QR"
          width={260}
          height={260}
          style={styles.qrImg}
        />
        <a
          href={formUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={styles.link}
        >
          {formUrl}
        </a>
      </div>
    </div>
  );
}

export default function MedicalFormQRPage() {
  return (
    <main style={styles.body}>
      <Suspense fallback={<div style={styles.wrapper}>Loading...</div>}>
        <QRContent />
      </Suspense>
    </main>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  body: {
    margin: 0,
    padding: 24,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
    background: '#f5f7fa',
    minHeight: '100vh',
    boxSizing: 'border-box',
  },
  wrapper: {
    maxWidth: 480,
    margin: '0 auto',
    background: '#ffffff',
    borderRadius: 12,
    boxShadow: '0 8px 24px rgba(15, 35, 52, 0.12)',
    padding: '32px 40px 40px',
    textAlign: 'center',
  },
  title: {
    margin: '0 0 8px',
    fontSize: 22,
    color: '#203246',
  },
  subtitle: {
    margin: '0 0 24px',
    color: '#5f6b7a',
    fontSize: 14,
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    margin: '0 auto 24px',
    justifyContent: 'center',
    fontSize: 14,
    color: '#203246',
  },
  select: {
    padding: '6px 12px',
    borderRadius: 8,
    border: '1px solid #d0d7e2',
    background: '#f9fafc',
    fontSize: 14,
    cursor: 'pointer',
  },
  qrWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
  },
  qrImg: {
    borderRadius: 12,
    background: '#ffffff',
    border: '1px solid #e5e7eb',
  },
  link: {
    display: 'block',
    fontSize: 12,
    color: '#1a73e8',
    wordBreak: 'break-all',
    textDecoration: 'none',
    maxWidth: '100%',
  },
  error: {
    color: '#dc2626',
    padding: 20,
  },
};
