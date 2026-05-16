// src/pages/OnboardCustomer.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import Dropdown from '../components/Dropdown';
import { useAuth } from '../context/AuthContext';

function cx(...xs){ return xs.filter(Boolean).join(' '); }

const Section = ({ title, children, actions, className = '' }) => (
  <div className={cx("bg-white border border-neutral-200 rounded-lg shadow-sm p-4", className)}>
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
      <h3 className="text-base font-semibold">{title}</h3>
      {actions ? (
        <div className="sm:ml-auto w-full sm:w-auto flex justify-center sm:justify-end">
          {actions}
        </div>
      ) : null}
    </div>
    <div className="mt-3 flex-1 flex flex-col">{children}</div>
  </div>
);

const fmt = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString();
};

const VIA = { qr: 'QR Code', email: 'Email', sms: 'SMS' };

export default function OnboardCustomer() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [toast, setToast] = useState('');

  const { user } = useAuth() || {};

  const [recent, setRecent] = useState([]);

  // Filters (for Recent Invites)
  const [filterVia, setFilterVia] = useState('all');
  const [search, setSearch] = useState('');
  const [dateOnly, setDateOnly] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false); // mobile drawer

  // QR creation (ephemeral)
  const [qrLink, setQrLink] = useState('');
  const [showQrInline, setShowQrInline] = useState(false);

  // Permanent link state
  const [permLink, setPermLink] = useState('');
  const [permCode, setPermCode] = useState('');
  const [orgName, setOrgName] = useState('Your Organization');
  const [embedHtml, setEmbedHtml] = useState('');

  // Export menu
  const [menuOpen, setMenuOpen] = useState(false);

  const [email, setEmail] = useState('');
  const [sms, setSms] = useState('');
  const [ttlHours, setTtlHours] = useState(72);

  const ORG_STORAGE_KEY = 'org:selected';
  const readStoredOrg = () => {
    try { return localStorage.getItem(ORG_STORAGE_KEY) || ''; } catch { return ''; }
  };

  const [orgId, setOrgId] = useState(() => readStoredOrg());
  const orgMissing = !orgId;

  useEffect(() => {
    const next = user?.organization_id || user?.org_id || '';
    if (next && next !== orgId) {
      setOrgId(String(next));
      try { localStorage.setItem(ORG_STORAGE_KEY, String(next)); } catch {}
    }
  }, [user, orgId]);

  const orgHeaders = useMemo(() => (orgId ? { 'X-Org-Id': orgId } : {}), [orgId]);
  const withCreds = useMemo(() => ({ headers: orgHeaders, withCredentials: true }), [orgHeaders]);
  const controlsDisabled = orgMissing || loading;

  const requireOrg = () => {
    if (!orgId) {
      setErr('Select an organization first.');
      return false;
    }
    return true;
  };

  const loadInvites = async () => {
    if (!requireOrg()) return;
    try {
      setErr('');
      const qs = orgId ? `?org_id=${encodeURIComponent(orgId)}` : '';
      const res = await axios.get(`/api/owner/invitations/recent${qs}`, withCreds);
      const payload = res.data ?? [];
      setRecent(Array.isArray(payload) ? payload : (payload.invites ?? []));
    } catch (e) {
      const code = e?.response?.status;
      if (code === 404) {
        // No org / no invites yet: treat as empty without surfacing error
        setRecent([]);
        setErr('');
      } else {
        console.error('loadInvites failed', e);
        setErr('Failed to load recent invites');
      }
    }
  };

  const loadPermanent = async () => {
    if (!requireOrg()) return;
    try {
      const qs = orgId ? `?org_id=${encodeURIComponent(orgId)}` : '';
      const res = await axios.get(`/api/owner/invitations/permanent${qs}`, withCreds);
      if (res.data?.ok) {
        setPermLink(res.data.link);
        setPermCode(res.data.code);
        setOrgName(res.data.org_name || 'Your Organization');
        setEmbedHtml(res.data.embed_html || '');
      }
    } catch (e) {
      const code = e?.response?.status;
      if (code === 404) {
        // No org / no permanent link yet; treat as empty without error
        setPermLink('');
        setPermCode('');
        setEmbedHtml('');
      } else {
        console.error('loadPermanent failed', e);
        setErr('Failed to load permanent link');
      }
    }
  };

  useEffect(() => {
    if (!orgId) {
      setErr('Select an organization first.');
      return;
    }
    loadInvites();
    loadPermanent();
    // eslint-disable-next-line
  }, [orgId]);

  const makeQr = async () => {
    if (!requireOrg()) return;
    try {
      setLoading(true); setErr(''); setToast('');
      const res = await axios.post(
        orgId ? `/api/owner/invitations/create?org_id=${encodeURIComponent(orgId)}` : '/api/owner/invitations/create',
        { via: 'qr', ttl_hours: Number(ttlHours) || 72 },
        withCreds
      );
      const link = res.data?.link || res.data?.ticket_url;
      if (!link) throw new Error('No invitation link returned');
      setQrLink(link);
      setShowQrInline(true);
      setToast('QR invite created');
      await loadInvites();
    } catch (e) {
      console.error('Create invite failed:', e?.response?.data || e);
      setErr('Failed to create invite');
    } finally {
      setLoading(false);
    }
  };

  const sendEmail = async () => {
    if (!requireOrg()) return;
    try {
      setLoading(true); setErr(''); setToast('');
      const res = await axios.post(
        orgId ? `/api/owner/invitations/email?org_id=${encodeURIComponent(orgId)}` : '/api/owner/invitations/email',
        { email, ttl_hours: Number(ttlHours) || 72 },
        withCreds
      );
      if (!res.data?.ok) throw new Error('Email send failed');
      setToast('Email invite sent');
      setEmail('');
      await loadInvites();
    } catch (e) {
      console.error('Email invite failed:', e?.response?.data || e);
      setErr(e?.response?.data?.error || 'Failed to send email invite');
    } finally {
      setLoading(false);
    }
  };

  const sendSms = async () => {
    if (!requireOrg()) return;
    try {
      setLoading(true); setErr(''); setToast('');
      const res = await axios.post(
        orgId ? `/api/owner/invitations/sms?org_id=${encodeURIComponent(orgId)}` : '/api/owner/invitations/sms',
        { phone: sms, ttl_hours: Number(ttlHours) || 72 },
        withCreds
      );
      if (!res.data?.ok) throw new Error('SMS send failed');
      setToast('SMS invite sent');
      setSms('');
      await loadInvites();
    } catch (e) {
      console.error('SMS invite failed:', e?.response?.data || e);
      setErr(e?.response?.data?.error || 'Failed to send SMS invite');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const base = Array.isArray(recent) ? recent : [];
    let rows = base.slice();
    if (filterVia !== 'all') rows = rows.filter(r => r.via === filterVia);
    if (dateOnly) rows = rows.filter(r => {
      const d = new Date(r.created_at);
      if (isNaN(d)) return false;
      const iso = d.toISOString().slice(0,10);
      return iso === dateOnly;
    });
    if (search.trim()) {
      const s = search.toLowerCase();
      rows = rows.filter(r =>
        (r.email || '').toLowerCase().includes(s) ||
        (r.phone || '').toLowerCase().includes(s) ||
        (r.code || '').toLowerCase().includes(s)
      );
    }
    return rows;
  }, [recent, filterVia, dateOnly, search]);

  /* ----------------------- Permanent Export helpers ----------------------- */

  const svgQrRef = useRef(null); // Renders a QR to grab SVG markup from

  const buildCombinedSvg = (size = 256) => {
    if (!permLink) return '';
    const el = svgQrRef.current?.querySelector('svg');
    const qrSvg = el ? el.outerHTML : new XMLSerializer().serializeToString(
      new window.DOMParser().parseFromString(
        `<svg xmlns="http://www.w3.org/2000/svg"></svg>`,
        'image/svg+xml'
      ).documentElement
    );

    const safeOrg = (orgName || '').replace(/[<>&]/g, s => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[s]));
    const totalH = size + 44; // room for text
    return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${totalH}" viewBox="0 0 ${size} ${totalH}">
  <g transform="translate(0,0)">${qrSvg}</g>
  <text x="${size/2}" y="${size + 28}" font-family="Inter, Arial, sans-serif" font-size="14" text-anchor="middle" fill="#0f172a">${safeOrg}</text>
</svg>`.trim();
  };

  const downloadBlob = (data, mime, filename) => {
    const blob = new Blob([data], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    a.remove(); URL.revokeObjectURL(url);
  };

  const downloadSvg = () => {
    const svg = buildCombinedSvg(256);
    if (!svg) return;
    const fname = `Signup-QR-${(orgName || 'Org').replace(/[^\w.-]+/g,'_')}.svg`;
    downloadBlob(svg, 'image/svg+xml;charset=utf-8', fname);
    setMenuOpen(false);
  };

  const svgToPngDataUrl = async (svgString, size = 256) => {
    const svgUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size + 44;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = svgUrl;
    });
  };

  const downloadPdf = async () => {
    try {
      const svg = buildCombinedSvg(256);
      const png = await svgToPngDataUrl(svg, 256);

      let jsPDF = null;
      try { ({ jsPDF } = await import('jspdf')); } catch { /* fallback */ }

      if (jsPDF) {
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
        const pageW = pdf.internal.pageSize.getWidth();
        const margin = 48;
        const imgW = Math.min(320, pageW - margin*2);
        const imgH = imgW * ((256+44)/256);
        pdf.setFont('helvetica','bold'); pdf.setFontSize(18);
        pdf.text(orgName || 'Your Organization', pageW/2, margin, { align: 'center' });
        pdf.addImage(png, 'PNG', (pageW - imgW)/2, margin + 16, imgW, imgH, undefined, 'FAST');
        pdf.setFont('helvetica','normal'); pdf.setFontSize(10);
        pdf.text(permLink, pageW/2, margin + 16 + imgH + 18, { align:'center', maxWidth: pageW - margin*2 });
        const fname = `Signup-QR-${(orgName || 'Org').replace(/[^\w.-]+/g,'_')}.pdf`;
        pdf.save(fname);
      } else {
        const html = `
<!doctype html><html><head><meta charset="utf-8" />
<title>${orgName} — Signup QR</title>
<style>
body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Inter,Arial;color:#0f172a;margin:40px;}
.wrap{text-align:center}h1{font-size:20px;margin:0 0 12px}.link{font-size:12px;color:#334155;word-break:break-all}
@media print{.print-hint{display:none}}
</style></head><body><div class="wrap"><h1>${orgName || ''}</h1>${svg}
<div class="link" style="margin-top:12px;">${permLink}</div><p class="print-hint">Use Print → Save as PDF.</p></div></body></html>`;
        const w = window.open('', '_blank');
        w.document.open(); w.document.write(html); w.document.close();
      }
    } finally {
      setMenuOpen(false);
    }
  };

  const openPrintable = () => {
    const svg = buildCombinedSvg(256);
    const html = `
<!doctype html><html><head><meta charset="utf-8" />
<title>${orgName} — Signup QR</title>
<style>
body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Inter,Arial;color:#0f172a;margin:40px;}
.wrap{text-align:center}h1{font-size:20px;margin:0 0 12px}.link{font-size:12px;color:#334155;word-break:break-all}
</style></head><body><div class="wrap"><h1>${orgName || ''}</h1>${svg}<div class="link" style="margin-top:12px;">${permLink}</div></div></body></html>`;
    const w = window.open('', '_blank');
    w.document.open(); w.document.write(html); w.document.close();
    setMenuOpen(false);
  };

  const copy = async (txt, note='Copied!') => {
    try { await navigator.clipboard.writeText(txt); setToast(note); }
    catch { /* ignore */ }
  };

  const rotatePermanent = async () => {
    if (!requireOrg()) return;
    try {
      setLoading(true); setErr(''); setToast('');
      const res = await axios.post(
        orgId ? `/api/owner/invitations/permanent/rotate?org_id=${encodeURIComponent(orgId)}` : '/api/owner/invitations/permanent/rotate',
        {},
        withCreds
      );
      if (res.data?.ok) {
        setPermLink(res.data.link);
        setPermCode(res.data.code);
        setOrgName(res.data.org_name || orgName);
        setEmbedHtml(res.data.embed_html || '');
        setToast('Permanent link rotated');
      } else {
        setErr('Failed to rotate permanent link');
      }
    } catch (e) {
      console.error('rotatePermanent failed', e);
      setErr('Failed to rotate permanent link');
    } finally {
      setLoading(false);
    }
  };

  /* --------------------------------- UI --------------------------------- */

  const Filters = ({ inline=false }) => (
    <div className={cx(inline ? '' : 'p-4', 'space-y-3')}>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div>
          {!inline && <label className="block text-[11px] font-medium text-neutral-600 mb-1">Type</label>}
          <Dropdown
            value={filterVia}
            onChange={setFilterVia}
            options={[
              { value: 'all', label: 'All types' },
              { value: 'qr', label: 'QR Code' },
              { value: 'email', label: 'Email' },
              { value: 'sms', label: 'SMS' },
            ]}
          />
        </div>
        <div>
          {!inline && <label className="block text-[11px] font-medium text-neutral-600 mb-1">Date</label>}
          <input
            type="date"
            value={dateOnly}
            onChange={(e) => setDateOnly(e.target.value)}
            className="border rounded px-3 py-2 w-full h-11"
          />
        </div>
        <div className="sm:col-span-2">
          {!inline && <label className="block text-[11px] font-medium text-neutral-600 mb-1">Search</label>}
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search email, phone, or code…"
            className="border rounded px-3 py-2 w-full h-11"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={loadInvites} className="px-3 py-2 border rounded disabled:opacity-60" disabled={orgMissing}>Refresh</button>
        <button
          onClick={() => { setFilterVia('all'); setDateOnly(''); setSearch(''); }}
          className="px-3 py-2 border rounded"
        >
          Clear
        </button>
      </div>
    </div>
  );

  const MobileInviteCard = ({ r }) => {
    const link = `${window.location.origin}/signup/${r.code}`;
    const target = r.via === 'email' ? (r.email || '—') : r.via === 'sms' ? (r.phone || '—') : '—';
    return (
      <div className="rounded-lg border border-neutral-200 p-3 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-medium">{VIA[r.via] || r.via}</div>
          <div className="text-xs text-neutral-500">{fmt(r.created_at)}</div>
        </div>
        <div className="text-sm break-all">{target}</div>
        <div className="text-xs text-neutral-600">
          Expires: {fmt(r.expires_at)} · <span className="capitalize">{r.status}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {r.via === 'qr' ? (
            <button
              onClick={() => { setQrLink(link); setShowQrInline(true); }}
              className="px-3 py-2 border rounded text-sm"
            >
              Show QR
            </button>
          ) : (
            <a href={link} target="_blank" rel="noreferrer" className="px-3 py-2 border rounded text-sm">
              Open
            </a>
          )}
          <button onClick={() => copy(link, 'Invite link copied')} className="px-3 py-2 border rounded text-sm">
            Copy Link
          </button>
          <button
            onClick={() => copy(r.code, 'Code copied')}
            className="px-3 py-2 border rounded text-sm"
            title="Copy code"
          >
            Copy Code
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="mb-2">
        <h1 className="text-2xl font-bold">Onboard Customer</h1>
        <p className="text-sm text-neutral-600">Create invites by QR code, email, or SMS.</p>
      </div>

      {orgMissing && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Select an organization first. Use Account → Organization (or your org switcher) to choose one, then retry.
        </div>
      )}

      {err && <div className="text-red-600">{err}</div>}
      {toast && <div className="text-green-700">{toast}</div>}

      {/* ===== Top grid: Permanent link (full) + QR + Email side by side ===== */}
      <div className="grid gap-4 items-start lg:grid-cols-2 lg:grid-rows-2">
        {/* Permanent Sign-up Link */}
        <Section
          title="Permanent Sign-up Link & QR"
          className="lg:col-span-2"
          actions={
            <div className="relative w-full sm:w-auto max-w-xs">
              <button
                onClick={() => setMenuOpen(v => !v)}
                className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded bg-zinc-600 text-white w-full sm:w-auto disabled:opacity-60"
                aria-haspopup="menu" aria-expanded={menuOpen}
                disabled={orgMissing}
              >
                Export QR Code
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M5.23 7.21a.75.75 0 011.06.02L10 11.126l3.71-3.895a.75.75 0 111.08 1.04l-4.24 4.46a.75.75 0 01-1.08 0l-4.24-4.46a.75.75 0 01.02-1.06z"/></svg>
              </button>
              {menuOpen && (
                <div className="absolute left-0 right-0 sm:left-auto sm:right-0 mt-2 w-full sm:w-56 rounded-lg border bg-white shadow-lg z-10">
                  <button onClick={downloadSvg} className="w-full text-left px-3 py-2 hover:bg-neutral-50">Download SVG</button>
                  <button onClick={downloadPdf} className="w-full text-left px-3 py-2 hover:bg-neutral-50">Download PDF (with name)</button>
                  <button onClick={openPrintable} className="w-full text-left px-3 py-2 hover:bg-neutral-50">Open printable page</button>
                </div>
              )}
            </div>
          }
        >
          {!permLink ? (
            <div className="text-sm text-neutral-600">
              Couldn’t load your permanent link.{' '}
              <button onClick={loadPermanent} className="underline">Try again</button>
            </div>
          ) : (
            <>
              <div className="flex flex-col lg:flex-row items-start gap-4">
                <div className="shrink-0 rounded-lg border p-3 mx-auto lg:mx-0">
                  {/* Off-screen anchor QR for exporting */}
                  <div className="absolute -left-[9999px]" aria-hidden ref={svgQrRef}>
                    <QRCodeSVG value={permLink} size={180} includeMargin />
                  </div>
                  {/* Onscreen preview */}
                  <QRCodeSVG value={permLink} size={160} includeMargin />
                </div>

                <div className="flex-1 min-w-0 w-full">
                  <div className="text-sm text-neutral-700">
                    <div className="font-medium">{orgName}</div>
                    {/* 🔒 Truly truncated link that never overflows the container */}
                    <div
                      className="text-neutral-600 max-w-full overflow-hidden text-ellipsis whitespace-nowrap"
                      title={permLink}
                    >
                      {permLink}
                    </div>
                  </div>

                  {/* Copy / Embed / Rotate */}
                  <div className="grid grid-cols-1 sm:flex sm:flex-wrap gap-2 mt-3">
                    <button
                      onClick={() => copy(permLink, 'Link copied')}
                      className="px-3 py-2 border rounded h-11 w-full max-w-xs mx-auto sm:w-auto sm:max-w-none sm:mx-0 disabled:opacity-60"
                      disabled={orgMissing}
                    >
                      Copy Link
                    </button>
                    <button
                      onClick={() => copy(embedHtml || `<a href="${permLink}" target="_blank" rel="noopener">Sign up with ${orgName}</a>`, 'Embed HTML copied')}
                      className="px-3 py-2 border rounded h-11 w-full max-w-xs mx-auto sm:w-auto sm:max-w-none sm:mx-0 disabled:opacity-60"
                      disabled={orgMissing}
                      title='Copies: <a href="...">Sign up with Org</a>'
                    >
                      Copy &lt;a&gt; Embed
                    </button>
                    <button
                      onClick={rotatePermanent}
                      disabled={loading || orgMissing}
                      className="px-3 py-2 border rounded h-11 w-full max-w-xs mx-auto sm:w-auto sm:max-w-none sm:mx-0 disabled:opacity-60"
                      title="Invalidate old link and generate a new one"
                    >
                      Rotate Link
                    </button>
                  </div>

                  <p className="text-[11px] text-neutral-500 mt-2">
                    You can place the embed HTML on your own website to link customers back to this sign-up.
                  </p>
                </div>
              </div>
            </>
          )}
        </Section>

        {/* Ephemeral QR create */}
        <Section title="QR Code Invite (Expiring)" className="h-full flex flex-col">
          <div className="space-y-3">
            <label className="block text-sm font-medium mb-1">Invite TTL (hours)</label>
            <input
              type="number"
              min="1"
              value={ttlHours}
              onChange={(e) => setTtlHours(e.target.value)}
              className="border rounded px-3 py-2 w-full h-11"
            />
            <button
              onClick={makeQr}
              disabled={controlsDisabled}
              className="w-full px-4 py-2 rounded bg-zinc-600 text-white disabled:opacity-60 h-11 whitespace-nowrap"
            >
              {loading ? 'Creating…' : 'Generate QR Invite'}
            </button>
          </div>
        </Section>

        {/* Email invite (shares row with QR on large screens) */}
        <Section title="Send Email Invite" className="h-full flex flex-col">
          <div className="space-y-3">
            <label className="block text-sm font-medium mb-1">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="border rounded px-3 py-2 w-full h-11"
              autoComplete="email"
            />
            <button
              onClick={sendEmail}
              disabled={controlsDisabled || !email}
              className="w-full px-4 py-2 rounded bg-zinc-600 text-white disabled:opacity-60 h-11"
            >
              {loading ? 'Sending…' : 'Send Email'}
            </button>
          </div>
        </Section>
      </div>

      {/* ===== Mobile sticky bar for Recent Invites filters ===== */}
      <div className="md:hidden sticky top-[56px] z-30 -mx-4 px-4 py-2 bg-white/90 backdrop-blur border-b">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFiltersOpen(true)}
            className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm disabled:opacity-60"
            disabled={orgMissing}
            aria-haspopup="dialog" aria-expanded={filtersOpen}
          >
            Filters
          </button>
          <button
            onClick={loadInvites}
            className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm disabled:opacity-60"
            disabled={orgMissing}
          >
            Refresh
          </button>
          <div className="flex-1" />
          <button
            onClick={() => { setFilterVia('all'); setDateOnly(''); setSearch(''); }}
            className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Recent Invites */}
      <Section title="Recent Invites">
        <div className="hidden md:block bg-white border rounded-2xl shadow-sm p-4 mb-3">
          <Filters inline />
        </div>

        {filtersOpen && (
          <div className="md:hidden fixed inset-0 z-[100]">
            <div className="absolute inset-0 bg-black/40" onClick={()=>setFiltersOpen(false)} />
            <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold">Filters</div>
                <button className="p-2 -mr-2" aria-label="Close filters" onClick={()=>setFiltersOpen(false)}>
                  <svg className="h-5 w-5" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                </button>
              </div>
              <Filters />
              <div className="flex items-center gap-2 pt-2">
                <button
                  className="flex-1 rounded-lg border px-3 py-2"
                  onClick={()=>{ setFilterVia('all'); setDateOnly(''); setSearch(''); }}
                >
                  Clear
                </button>
                <button
                  className="flex-1 rounded-lg bg-zinc-600 text-white px-3 py-2"
                  onClick={()=>{ setFiltersOpen(false); }}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile: cards */}
        <div className="md:hidden space-y-3">
          {filtered.map((r) => (
            <MobileInviteCard key={r.code || r.id} r={r} />
          ))}
          {!filtered.length && (
            <div className="text-neutral-500 text-sm p-3 border rounded-lg">No invites yet.</div>
          )}
        </div>

        {/* Desktop: table */}
        <div className="hidden md:block overflow-auto">
          <table className="min-w-[700px] w-full border border-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className="text-left p-2 border-b">Created</th>
                <th className="text-left p-2 border-b">Type</th>
                <th className="text-left p-2 border-b">Target</th>
                <th className="text-left p-2 border-b">Status</th>
                <th className="text-left p-2 border-b">Expires</th>
                <th className="text-left p-2 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const link = `${window.location.origin}/signup/${r.code}`;
                const target = r.via === 'email' ? (r.email || '—') : r.via === 'sms' ? (r.phone || '—') : '—';
                return (
                  <tr key={r.code || r.id} className="border-b">
                    <td className="p-2">{fmt(r.created_at)}</td>
                    <td className="p-2">{VIA[r.via] || r.via}</td>
                    <td className="p-2 break-all">{target}</td>
                    <td className="p-2 capitalize">{r.status}</td>
                    <td className="p-2">{fmt(r.expires_at)}</td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        {r.via === 'qr' ? (
                          <button
                            onClick={() => { setQrLink(link); setShowQrInline(true); }}
                            className="text-zinc-600 underline"
                          >
                            Show QR
                          </button>
                        ) : (
                          <a href={link} target="_blank" rel="noreferrer" className="text-zinc-600 underline">Open</a>
                        )}
                        <button onClick={() => copy(link, 'Invite link copied')} className="text-zinc-600 underline">
                          Copy
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!filtered.length && (
                <tr><td className="p-3 text-neutral-500" colSpan={6}>No invites yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
