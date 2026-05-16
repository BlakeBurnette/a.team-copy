import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function NotFound() {
  const { pathname } = useLocation();
  return (
    <div className="max-w-xl mx-auto text-center py-16">
      <h2 className="text-2xl font-semibold mb-2">Page not found</h2>
      <p className="text-gray-600 mb-6">
        We couldn’t find <span className="font-mono">{pathname}</span>.
      </p>
      <div className="flex items-center justify-center gap-3">
        <Link
          to="/app"
          className="inline-flex items-center px-4 py-2 rounded-md bg-zinc-600 text-white hover:bg-blue-700"
        >
          Go to Dashboard
        </Link>
        <Link
          to="/app/customers"
          className="inline-flex items-center px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-50"
        >
          Customers
        </Link>
        <Link
          to="/app/settings"
          className="inline-flex items-center px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-50"
        >
          Settings
        </Link>
      </div>
    </div>
  );
}
