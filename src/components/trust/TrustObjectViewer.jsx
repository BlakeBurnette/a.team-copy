import React from 'react';

const sectionStyle = {
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '12px',
  marginTop: '12px',
};

const headingStyle = { fontSize: '14px', fontWeight: 600, marginBottom: '8px' };
const rowStyle = { fontSize: '13px', marginBottom: '4px', color: '#374151' };

const fmtMoney = (cents, currency = 'USD') => {
  if (typeof cents !== 'number') return '';
  const n = cents / 100;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
};

function DetailRow({ label, value }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div style={rowStyle}>
      <span style={{ color: '#6b7280' }}>{label}: </span>
      <span style={{ fontWeight: 500 }}>{String(value)}</span>
    </div>
  );
}

export default function TrustObjectViewer({ trustObject }) {
  if (!trustObject) return null;

  const invoice = trustObject.invoice || {};
  const customer = trustObject.customer || {};
  const organization = trustObject.organization || {};
  const paymentSummary = trustObject.paymentSummary || trustObject.payment_summary || {};
  const serviceRecord = trustObject.serviceRecord ?? trustObject.service_record ?? null;
  const media = Array.isArray(trustObject.media) ? trustObject.media : [];
  const items = Array.isArray(trustObject.items)
    ? trustObject.items
    : Array.isArray(invoice.items)
    ? invoice.items
    : [];

  return (
    <div style={{ marginTop: '24px' }}>
      <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>Proof of Service</h3>

      <div style={sectionStyle}>
        <div style={headingStyle}>Invoice</div>
        <DetailRow label="ID" value={invoice.id} />
        <DetailRow label="Status" value={invoice.status} />
        <DetailRow label="Total" value={fmtMoney(invoice.total_cents, invoice.currency)} />
        <DetailRow label="Subtotal" value={fmtMoney(invoice.subtotal_cents, invoice.currency)} />
        <DetailRow label="Currency" value={invoice.currency} />
        <DetailRow label="Created" value={invoice.created_at} />
        <DetailRow label="Due" value={invoice.effective_due_date || invoice.due_date} />
        <DetailRow label="Period" value={invoice.period_start && invoice.period_end ? `${invoice.period_start} — ${invoice.period_end}` : ''} />
        <DetailRow label="Completed at" value={invoice.completed_at} />
        <DetailRow label="Recurrence" value={invoice.recurrence_label || invoice.recurrence_pattern} />
        {items.length > 0 && (
          <div style={{ marginTop: '8px' }}>
            <div style={{ ...rowStyle, fontWeight: 600, color: '#111827' }}>Items</div>
            <ul style={{ paddingLeft: '16px', marginTop: '4px' }}>
              {items.map((it, idx) => (
                <li key={it.id || idx} style={{ fontSize: '13px', marginBottom: '3px' }}>
                  <span style={{ fontWeight: 500 }}>{it.description || it.service_key || 'Item'}</span>{' '}
                  <span style={{ color: '#6b7280' }}>× {it.quantity}</span>{' '}
                  <span>• {fmtMoney(it.total_cents, invoice.currency || 'USD')}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div style={sectionStyle}>
        <div style={headingStyle}>Customer</div>
        <DetailRow label="ID" value={customer.id} />
        <DetailRow label="Name" value={customer.name} />
        <DetailRow label="Email" value={customer.email} />
        <DetailRow label="Phone" value={customer.phone || customer.phone_number} />
        <DetailRow
          label="Address"
          value={[
            customer.street,
            [customer.city, customer.state].filter(Boolean).join(', '),
            customer.zip,
          ]
            .filter(Boolean)
            .join(' • ')}
        />
      </div>

      <div style={sectionStyle}>
        <div style={headingStyle}>Organization</div>
        <DetailRow label="ID" value={organization.id} />
        <DetailRow label="Name" value={organization.name} />
        <DetailRow label="Email" value={organization.email} />
        <DetailRow label="Phone" value={organization.phone} />
        <DetailRow label="Website" value={organization.website_url} />
      </div>

      <div style={sectionStyle}>
        <div style={headingStyle}>Payment Summary</div>
        <DetailRow label="Status" value={paymentSummary.status} />
        <DetailRow label="Total" value={fmtMoney(paymentSummary.total_cents, paymentSummary.currency)} />
        <DetailRow label="Paid" value={fmtMoney(paymentSummary.paid_cents, paymentSummary.currency)} />
        <DetailRow label="Refunded" value={fmtMoney(paymentSummary.refunded_cents, paymentSummary.currency)} />
        <DetailRow label="Balance" value={fmtMoney(paymentSummary.balance_cents, paymentSummary.currency)} />
      </div>

      <div style={sectionStyle}>
        <div style={headingStyle}>Service Record</div>
        {serviceRecord ? (
          <>
            <DetailRow label="Service Record ID" value={serviceRecord.service_record_id} />
            <DetailRow label="Status" value={serviceRecord.status} />
            <DetailRow label="Scheduled" value={serviceRecord.scheduled_at} />
            <DetailRow label="Started" value={serviceRecord.started_at} />
            <DetailRow label="Completed" value={serviceRecord.completed_at} />
            <DetailRow label="Crew" value={Array.isArray(serviceRecord.crew_ids) ? serviceRecord.crew_ids.join(', ') : ''} />
            <DetailRow label="Notes" value={serviceRecord.notes} />
          </>
        ) : (
          <div style={rowStyle}>No service record.</div>
        )}
      </div>

      <div style={sectionStyle}>
        <div style={headingStyle}>Media &amp; Hashes</div>
        {media.length === 0 ? (
          <div style={rowStyle}>No media attached.</div>
        ) : (
          <ul style={{ paddingLeft: '16px' }}>
            {media.map((m, idx) => {
              const hashes = Array.isArray(m.hashes) ? m.hashes : Array.isArray(m.media_hashes) ? m.media_hashes : [];
              const href = m.public_url || m.url || null;
              return (
                <li key={m.id || idx} style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>
                    Media #{m.id || idx} ({m.content_type || 'unknown'})
                  </div>
                  <DetailRow label="Bytes" value={m.bytes} />
                  <DetailRow label="Storage key" value={m.storage_key || m.key} />
                  {href ? (
                    <div style={{ marginTop: '4px' }}>
                      <a href={href} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontSize: '13px' }}>
                        View file
                      </a>
                    </div>
                  ) : null}
                  {hashes.length > 0 && (
                    <div style={{ marginTop: '6px' }}>
                      <div style={{ ...rowStyle, fontWeight: 600, color: '#111827' }}>Hashes</div>
                      <ul style={{ paddingLeft: '16px', marginTop: '4px' }}>
                        {hashes.map((h, i) => (
                          <li key={`${h.algorithm}-${h.hash_hex}-${i}`} style={{ fontSize: '12px', color: '#374151' }}>
                            <span style={{ fontWeight: 500 }}>{h.algorithm}</span>: {h.hash_hex}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
