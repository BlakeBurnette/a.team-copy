import React from 'react';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PaymentStatusPill, { getPaymentStatusMeta } from '../components/PaymentStatusPill';
import PaymentResolutionBanner from '../components/PaymentResolutionBanner';
import { resolutionGuidance } from '../utils/paymentResolution';
import axios from 'axios';
import { fetchPaymentResolution } from '../api/paymentResolution';
import { MagicResolveInner } from '../pages/public/MagicResolve';

jest.mock('@stripe/react-stripe-js', () => ({
  useStripe: () => null,
  Elements: ({ children }) => <div>{children}</div>,
}));
jest.mock('@stripe/stripe-js', () => ({
  loadStripe: () => Promise.resolve({}),
}));

jest.mock('axios');

describe('PaymentStatusPill', () => {
  afterEach(cleanup);

  it('shows the expected labels for core statuses', () => {
    const { rerender } = render(<PaymentStatusPill resolutionStatus="requires_customer_action" />);
    expect(screen.getByTestId('payment-status-pill')).toHaveTextContent('Action needed');

    rerender(<PaymentStatusPill resolutionStatus="retry_scheduled" />);
    expect(screen.getByTestId('payment-status-pill')).toHaveTextContent('Retrying');

    rerender(<PaymentStatusPill resolutionStatus="succeeded" />);
    expect(screen.getByTestId('payment-status-pill')).toHaveTextContent('Paid');

    rerender(<PaymentStatusPill resolutionStatus="exhausted" />);
    expect(screen.getByTestId('payment-status-pill')).toHaveTextContent('Payment failed');
  });

  it('falls back to muted label for unknown status', () => {
    const meta = getPaymentStatusMeta('mystery_status');
    expect(meta.label).toBe('Payment pending');
  });
});

describe('PaymentResolutionBanner', () => {
  afterEach(cleanup);

  it('renders and links to magic resolve when token present', () => {
    render(
      <PaymentResolutionBanner
        resolutionStatus="requires_customer_action"
        resolutionCode=""
        token="abc123"
        serviceRecordId="sr1"
      />
    );
    const banner = screen.getByTestId('payment-resolution-banner');
    expect(banner).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /resolve payment/i });
    expect(link).toHaveAttribute('href', '/m/resolve/abc123');
  });

  it('renders portal route when no token', () => {
    render(
      <PaymentResolutionBanner
        resolutionStatus="retry_scheduled"
        resolutionCode=""
        serviceRecordId="42"
      />
    );
    const link = screen.getByRole('link', { name: /resolve payment/i });
    expect(link).toHaveAttribute('href', '/app/user/service-records/42/resolve-payment');
  });
});

describe('resolutionGuidance', () => {
  it('maps resolution codes to correct CTA text', () => {
    expect(resolutionGuidance({ status: 'requires_customer_action' }).actionLabel).toBe('Authenticate');
    expect(resolutionGuidance({ status: 'payment_method_required' }).actionLabel).toBe('Update payment method');
    expect(resolutionGuidance({ status: 'retry_scheduled' }).actionLabel).toBe('Retry now');
    expect(resolutionGuidance({ status: 'succeeded' }).actionLabel).toBeNull();
  });
});

describe('paymentResolution API unwrap', () => {
  beforeEach(() => {
    if (axios.get.mockReset) axios.get.mockReset();
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('unwraps resolution wrapper', async () => {
    axios.get.mockResolvedValue({ data: { resolution: { status: 'succeeded' }, stripe: { client_secret: 'cs' } } });
    const res = await fetchPaymentResolution('123');
    expect(res.resolution.status).toBe('succeeded');
    expect(res.stripe.client_secret).toBe('cs');
  });

  it('throws typed error for invalid_or_expired', async () => {
    axios.get.mockRejectedValue({ response: { status: 404, data: { code: 'invalid_or_expired' } } });
    await expect(fetchPaymentResolution('123')).rejects.toHaveProperty('type', 'invalid_or_expired');
  });
});

describe('MagicResolve invalid token handling', () => {
  beforeEach(() => {
    if (axios.get.mockReset) axios.get.mockReset();
  });

  it('renders expired message when token invalid', async () => {
    axios.get.mockRejectedValue({ response: { status: 404, data: { code: 'invalid_or_expired' } } });
    render(<MagicResolveInner token="tok" serviceRecordId="magic" />);
    await waitFor(() => {
      expect(screen.getByText(/Link expired/i)).toBeInTheDocument();
    });
  });
});
