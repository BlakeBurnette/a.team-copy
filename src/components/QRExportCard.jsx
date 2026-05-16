// src/components/QRExportCard.jsx
import React, { useMemo, useRef } from 'react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import jsPDF from 'jspdf';

// Utility: safe file name
const safe = (s) => String(s || 'flyer').replace(/[^a-z0-9-_]+/gi, '-').toLowerCase();

export default function QRExportCard({ org, slug, className = '' }) {
  const qrCanvasRef = useRef(null);
  const qrSvgRef = useRef(null);

  // Public landing URL (permanent link)
  const url = useMemo(() => {
    const base = window.location.origin.replace(/\/$/, '');
    return `${base}/signup/org/${slug}`;
  }, [slug]);

  const orgName = org?.name || 'Our Organization';
  const contactLines = [
    org?.website ? org.website : null,
    org?.email ? org.email : null,
    org?.phone_number ? org.phone_number : null,
    [org?.street, org?.city, org?.state, org?.zip].filter(Boolean).join(', '),
  ].filter(Boolean);

  /* ------------------------------ Download SVG ------------------------------ */
  const downloadSvg = () => {
    const svgEl = qrSvgRef.current?.querySelector('svg');
    if (!svgEl) return;

    // Clone so we can safely add styling attributes
    const clone = svgEl.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    // Wrap in margin + white bg for printers
    const pad = 24;
    const size = Number(clone.getAttribute('width') || 256);
    const outer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    outer.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    outer.setAttribute('width', size + pad * 2);
    outer.setAttribute('height', size + pad * 2);
    outer.setAttribute('viewBox', `0 0 ${size + pad * 2} ${size + pad * 2}`);

    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('x', '0');
    bg.setAttribute('y', '0');
    bg.setAttribute('width', size + pad * 2);
    bg.setAttribute('height', size + pad * 2);
    bg.setAttribute('fill', '#ffffff');

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', `translate(${pad},${pad})`);
    g.appendChild(clone);

    outer.appendChild(bg);
    outer.appendChild(g);

    const svgString = new XMLSerializer().serializeToString(outer);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const urlBlob = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = urlBlob;
    a.download = `${safe(orgName)}-qr.svg`;
    a.click();
    URL.revokeObjectURL(urlBlob);
  };

  /* ------------------------------ Download PDF ------------------------------ */
  const downloadPdf = () => {
    // Use the Canvas variant for easy embedding in jsPDF
    const canvas = qrCanvasRef.current;
    if (!canvas) return;

    const imgData = canvas.toDataURL('image/png'); // crisp enough for Letter
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });

    const margin = 48;       // 0.67in
    const pageW = doc.internal.pageSize.getWidth();
    let y = margin;

    // Brand header (simple, on-brand neutral)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text(orgName, margin, y);
    y += 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    if (contactLines.length) {
      y += 18;
      contactLines.forEach(line => {
        doc.text(String(line), margin, y);
        y += 16;
      });
    } else {
      y += 22;
    }

    // Divider
    y += 8;
    doc.setDrawColor(230);
    doc.line(margin, y, pageW - margin, y);
    y += 24;

    // Headline
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Scan to request service', margin, y);
    y += 14;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(90);
    const blurb =
      'Point your phone camera at the QR to open our request form. Choose services, set your service days, and enable autopay—fast and secure.';
    const blurbLines = doc.splitTextToSize(blurb, pageW - margin * 2);
    y += 10;
    doc.text(blurbLines, margin, y);
    y += blurbLines.length * 14 + 12;

    // QR centered
    const qrSize = 256;
    const x = (pageW - qrSize) / 2;
    doc.addImage(imgData, 'PNG', x, y, qrSize, qrSize);
    y += qrSize + 14;

    // URL (so it’s clickable in the PDF)
    doc.setTextColor(0, 102, 204);
    doc.textWithLink(url, margin, y, { url });

    // Footer
    y += 32;
    doc.setTextColor(150);
    doc.setFontSize(9);
    doc.text('Powered by PayHive', margin, y);

    doc.save(`${safe(orgName)}-flyer.pdf`);
  };

  return (
    <div className={`bg-white rounded-lg shadow border border-neutral-200 ${className}`}>
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <h3 className="text-base font-semibold">Share / Export</h3>
        <span className="text-xs text-neutral-500">{url.replace(/^https?:\/\//, '')}</span>
      </div>

      <div className="p-4">
        {/* Responsive: QR on top for mobile, details below */}
        <div className="grid sm:grid-cols-[auto,1fr] gap-4 items-start">
          {/* SVG version for crisp download */}
          <div ref={qrSvgRef} className="flex items-center justify-center">
            <QRCodeSVG value={url} size={192} includeMargin />
          </div>

          {/* Details + Actions */}
          <div className="space-y-3">
            <div>
              <div className="text-sm text-neutral-500">Organization</div>
              <div className="text-lg font-semibold">{orgName}</div>
              {!!contactLines.length && (
                <ul className="mt-1 text-sm text-neutral-700">
                  {contactLines.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={downloadSvg}
                className="px-3 py-2 rounded border border-neutral-300 hover:bg-neutral-50"
              >
                Download SVG
              </button>
              <button
                type="button"
                onClick={downloadPdf}
                className="px-3 py-2 rounded bg-zinc-600 text-white hover:bg-zinc-700"
              >
                Download PDF Flyer
              </button>
              <a
                href={`/org/${slug}/info`}
                className="px-3 py-2 rounded border border-neutral-300 hover:bg-neutral-50"
                target="_blank"
                rel="noreferrer"
              >
                Open Info Page
              </a>
            </div>

            <p className="text-xs text-neutral-500">
              Tip: Print the flyer and post it in a visible spot. Customers can scan the code to request service instantly.
            </p>
          </div>
        </div>
      </div>

      {/* Hidden Canvas variant for PDF embedding (not visible) */}
      <div className="sr-only" aria-hidden="true">
        <QRCodeCanvas value={url} size={256} includeMargin ref={qrCanvasRef} />
      </div>
    </div>
  );
}
