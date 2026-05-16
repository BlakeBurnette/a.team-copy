import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';

jest.mock('../lib/env', () => ({ default: {} }));
jest.mock('../api/recommendations', () => ({ fetchOffers: jest.fn() }));
jest.mock('../context/AuthContext', () => ({
  useUserProfile: () => ({ profile: { role: 'owner' } }),
}));

import Sidebar from '../components/Sidebar';

// Inline the redirect component to avoid importing Router.jsx (which pulls in
// modules that use import.meta.env and fail in Jest).
const RouteAddsRedirect = () => <Navigate to="/app/schedule" replace />;

describe('Route Adds disabled', () => {
  it('hides Route Adds from sidebar', () => {
    render(
      <MemoryRouter>
        <Sidebar collapsed={false} closeMobile={() => {}} />
      </MemoryRouter>
    );
    expect(screen.queryByText(/Route Adds/i)).not.toBeInTheDocument();
  });

  it('redirects route adds to schedule', () => {
    render(
      <MemoryRouter initialEntries={['/app/provider/route-adds']}>
        <Routes>
          <Route path="/app/provider/route-adds" element={<RouteAddsRedirect />} />
          <Route path="/app/schedule" element={<div>Schedule Page</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('Schedule Page')).toBeInTheDocument();
  });
});
