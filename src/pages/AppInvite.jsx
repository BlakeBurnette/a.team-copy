// src/pages/AppInvite.jsx
import React from 'react';
import { useParams, Navigate } from 'react-router-dom';

export default function AppInvite() {
  const { token } = useParams();

  // If there's no token, send them back to the app home
  if (!token) return <Navigate to="/app" replace />;

  // Deep-link to the public invite flow (keeps a single implementation)
  return <Navigate to={`/signup/${encodeURIComponent(token)}`} replace />;
}
