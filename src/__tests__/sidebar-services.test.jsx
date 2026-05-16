import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../lib/env', () => ({ default: {} }));
jest.mock('../api/recommendations', () => ({ fetchOffers: jest.fn() }));
jest.mock('../context/AuthContext', () => ({
  useUserProfile: () => ({ profile: { role: 'owner' } }),
}));

import Sidebar from '../components/Sidebar';

describe('Sidebar Services in PayHive group', () => {
  it('shows Services inside the PayHive group when expanded', () => {
    render(
      <MemoryRouter initialEntries={['/app/services']}>
        <Sidebar collapsed={false} closeMobile={() => {}} />
      </MemoryRouter>
    );

    // PayHive group auto-expands because /app/services is active
    expect(screen.getByText('PayHive')).toBeInTheDocument();
    expect(screen.getByText('Services')).toBeInTheDocument();
  });

  it('shows Services when PayHive group is manually expanded', () => {
    render(
      <MemoryRouter initialEntries={['/app']}>
        <Sidebar collapsed={false} closeMobile={() => {}} />
      </MemoryRouter>
    );

    const payhiveButton = screen.getByText('PayHive');
    expect(payhiveButton).toBeInTheDocument();

    // Click to expand
    fireEvent.click(payhiveButton);
    expect(screen.getByText('Services')).toBeInTheDocument();
  });
});
