import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Properties from '../pages/Properties';

jest.mock('../context/AuthContext', () => ({
  useUserProfile: jest.fn(),
}));

jest.mock('../api/properties', () => ({
  fetchMyProperties: jest.fn().mockResolvedValue({ memberships: [] }),
  claimProperty: jest.fn(),
  verifyPropertyMembership: jest.fn(),
}));

const { useUserProfile } = require('../context/AuthContext');
const { fetchMyProperties } = require('../api/properties');

function renderWithRole(role) {
  useUserProfile.mockReturnValue({
    profile: { role },
    hasRole: (r) => r === role,
  });
  return render(<Properties />);
}

describe('Properties claim card visibility', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows claim card for user role only', async () => {
    renderWithRole('user');
    await waitFor(() => expect(fetchMyProperties).toHaveBeenCalled());
    expect(screen.getByText(/Claim property/i)).toBeInTheDocument();
  });

  ['owner', 'crew_leader', 'crew_member'].forEach((role) => {
    it(`hides claim card for ${role}`, async () => {
      renderWithRole(role);
      await waitFor(() => expect(fetchMyProperties).toHaveBeenCalled());
      expect(screen.queryByText(/Claim property/i)).not.toBeInTheDocument();
    });
  });
});
