import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import ScheduleCard from '../pages/schedule/components/ScheduleCard';
import { getPaymentPillProps } from '../pages/schedule/components/PaymentPills';

const baseOccurrence = {
  rule_id: 1,
  date: '2024-05-15',
  customer: { id: 3, name: 'Audit Customer', has_card_on_file: true },
  service: { label: 'Window Cleaning', estimated_minutes: 90 },
  property: { id: 9, normalized_address: '123 Main St' },
  payment_status: 'open',
  invoice_total_cents: 10000,
};

const renderScheduleCard = (overrides = {}) => {
  const occ = { ...baseOccurrence, ...overrides };
  return render(
    <MemoryRouter>
      <ScheduleCard
        occ={occ}
        mins={480}
        inv={{}}
        pending={false}
        canManage={false}
        orgBusinessHours={{}}
        hideQuickDropdown
      />
    </MemoryRouter>
  );
};

describe('Schedule payment pills', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    cleanup();
  });

  it('renders the unpaid pill for the base payload', () => {
    renderScheduleCard();
    const pill = screen.getByText('Unpaid');
    expect(pill).toBeInTheDocument();
    expect(pill.outerHTML).toMatchInlineSnapshot(
      `"<span class=\\"inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border bg-amber-50 text-amber-900 border-amber-200\\">Unpaid</span>"`
    );
  });

  it('keeps the pill stable when new payment summary fields are present', () => {
    renderScheduleCard({
      payment_summary: {
        status: 'open',
        invoice_total_cents: 10000,
        net_settled_cents: 5000,
        owed_cents: 2000,
        ledger_journal_id: 'ledger_jrn_123',
        trust_hash: 'abc123',
        block_height: 42,
        sealed_at: '2024-05-15T12:00:00Z',
      },
    });
    const pill = screen.getByText('Unpaid');
    expect(pill).toBeInTheDocument();
    expect(pill.outerHTML).toMatchInlineSnapshot(
      `"<span class=\\"inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border bg-amber-50 text-amber-900 border-amber-200\\">Unpaid</span>"`
    );
  });

  it('falls back safely for unknown payment_status while rendering the same pill', () => {
    renderScheduleCard({ payment_status: 'mystery_status' });
    const pill = screen.getByText('Unpaid');
    expect(pill).toBeInTheDocument();
    expect(getPaymentPillProps('mystery_status').label).toBe('Unpaid');
  });
});
