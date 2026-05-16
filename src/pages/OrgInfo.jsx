// src/pages/OrgInfo.jsx
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';

const API = (import.meta.env?.VITE_API_BASE ? import.meta.env.VITE_API_BASE.replace(/\/$/, '') : '');

export default function OrgInfo() {
  const { slug } = useParams();
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API}/api/public/org/${slug}`);
        if (!mounted) return;
        setOrg(res.data.organization || null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [slug]);

  const url = useMemo(() => {
    const base = window.location.origin.replace(/\/$/, '');
    return `${base}/signup/org/${slug}`;
  }, [slug]);

  if (loading) return <div className="p-6">Loading…</div>;
  if (!org) return <div className="p-6 text-red-600">Organization not found.</div>;

  const lines = [
    org.website, org.email, org.phone_number,
    [org.street, org.city, org.state, org.zip].filter(Boolean).join(', ')
  ].filter(Boolean);

  return (
    <div ref={printRef} className="min-h-screen bg-white">
      {/* Actions (hidden in print) */}
      <div className="p-4 border-b flex items-center justify-between print:hidden">
        <div className="text-lg font-semibold">{org.name}</div>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded bg-zinc-600 text-white hover:bg-zinc-700"
          >
            Print
          </button>
          <a
            href={url}
            className="px-4 py-2 rounded border border-neutral-300 hover:bg-neutral-50"
            target="_blank"
            rel="noreferrer"
          >
            Open Signup
          </a>
        </div>
      </div>

      {/* Hero */}
      <div className="max-w-3xl mx-auto p-6 sm:p-10">
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold">{org.name}</h1>
          {lines.length > 0 && (
            <div className="mt-2 text-neutral-700 text-sm">
              {lines.map((l, i) => <div key={i}>{l}</div>)}
            </div>
          )}
        </div>

        <div className="mt-8 grid sm:grid-cols-2 gap-8 items-center">
          <div className="flex justify-center">
            <QRCodeSVG value={url} size={256} includeMargin />
          </div>
          <div className="text-sm leading-6 text-neutral-700">
            <h2 className="text-lg font-semibold mb-2">Request Service in Seconds</h2>
            <p className="mb-3">
              Scan the QR to open our request form. Choose your services, select days you’re available,
              and set up autopay prior to the invoice due date.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Fast, self-service onboarding</li>
              <li>Clear pricing and scheduling</li>
              <li>Secure payments powered by <strong>PayHive</strong></li>
            </ul>
            <div className="mt-4">
              <a href={url} className="underline text-zinc-700" target="_blank" rel="noreferrer">
                {url}
              </a>
            </div>
          </div>
        </div>

        {/* Footer (prints nicely) */}
        <div className="mt-12 pt-6 border-t text-center text-xs text-neutral-500">
          © {new Date().getFullYear()} {org.name} · Powered by PayHive
        </div>
      </div>

      {/* Print styles */}
      <style>
        {`
        @media print {
          .print\\:hidden { display: none !important; }
          a[href]:after { content: ""; } /* cleaner print without URL afterlinks */
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        `}
      </style>
    </div>
  );
}
