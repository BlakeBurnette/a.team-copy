import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Breadcrumbs() {
  const { pathname } = useLocation();

  // Simple: just show Home → App plus the last segment for context
  const segments = pathname.split('/').filter(Boolean);
  const last = segments[segments.length - 1];

  return (
    <nav className="text-sm text-neutral-500">
      <Link to="/app" className="hover:underline">Home</Link>
      {segments.length > 1 && (
        <>
          <span className="mx-2">/</span>
          <span className="capitalize">{last}</span>
        </>
      )}
    </nav>
  );
}
