// src/components/HeaderSubslot.jsx
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Renders children into the sticky header's "header-subslot" region.
 * Usage: <HeaderSubslot> ... </HeaderSubslot>
 */
export default function HeaderSubslot({ children }) {
  const [el, setEl] = useState(null);
  useEffect(() => {
    setEl(document.getElementById('header-subslot'));
  }, []);
  if (!el) return null;
  return createPortal(children, el);
}
