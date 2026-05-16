import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import OwnerDaySummary from '../pages/timecards/OwnerDaySummary';
import axios from 'axios';

jest.mock('axios');
jest.mock('../../utils/sse', () => ({
  startSSE: () => ({ close: () => {} }),
}));
jest.mock('../../context/AuthContext', () => ({
  useUserProfile: () => ({ profile: { organization_id: 1 } }),
}));
jest.mock('../../context/AuthContext', () => ({
  useUserProfile: () => ({ profile: { organization_id: 1 } }),
  useAuth: () => ({ roles: ['owner'], permissions: [], refreshMe: jest.fn() }),
}));

describe('OwnerDaySummary error handling', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows friendly error message on 500 and not the raw key', async () => {
    axios.get
      .mockResolvedValueOnce({ data: [] }) // teams
      .mockRejectedValueOnce({
        response: {
          status: 500,
          data: { error: 'failed_to_load_day_summary' },
          headers: { 'x-request-id': 'req-123' },
        },
      });

    render(<OwnerDaySummary />);

    await waitFor(() => expect(screen.getByText(/Couldn’t load day summary/i)).toBeInTheDocument());
    expect(screen.getByText(/We couldn’t load this day’s totals/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
    expect(screen.queryByText(/failed_to_load_day_summary/i)).not.toBeInTheDocument();
  });
});
