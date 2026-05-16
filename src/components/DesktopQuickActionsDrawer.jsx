import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Bolt } from 'lucide-react';
import { quickActions } from '../config/quickActions';
import { ensureAppPath } from '../utils/paths';

const Row = ({ label, onClick }) => (
  <button
    onClick={onClick}
    className="w-full text-left bg-white border border-neutral-200 rounded px-4 py-3 mb-2 hover:bg-neutral-50 active:bg-neutral-100"
  >
    {label}
  </button>
);

const DesktopQuickActionsDrawer = ({ isOpen, onClose }) => {
  const [entering, setEntering] = useState(false);
  const navigate = useNavigate();

  const goTo = (path) => {
    onClose?.();
    navigate(ensureAppPath(path));
  };

  // Animate in/out
  useEffect(() => {
    if (isOpen) {
      const id = requestAnimationFrame(() => setEntering(true));
      return () => cancelAnimationFrame(id);
    }
    setEntering(false);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay (desktop only) */}
      <div
        onClick={onClose}
        className={`hidden md:block fixed inset-0 z-[60] bg-black/20 transition-opacity duration-200 ${
          entering ? 'opacity-100' : 'opacity-0'
        }`}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Quick Actions"
        className={`
          hidden md:block fixed z-[61] top-0 right-0 h-screen w-[420px] max-w-[90vw]
          bg-white shadow-2xl border-l border-neutral-200
          transition-transform duration-300
          ${entering ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2 font-semibold">
            <Bolt className="h-5 w-5" />
            Quick Actions
          </div>
          <button
            onClick={onClose}
            aria-label="Close quick actions"
            className="p-2 rounded hover:bg-neutral-100 active:bg-neutral-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto h-[calc(100vh-56px)]">
          {quickActions.map(({ label, path }) => (
            <Row key={path} label={label} onClick={() => goTo(path)} />
          ))}
        </div>
      </aside>
    </>
  );
};

export default DesktopQuickActionsDrawer;
