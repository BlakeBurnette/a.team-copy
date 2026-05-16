import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { quickActions } from '../config/quickActions';

const ActionButton = ({ label, onClick }) => (
  <button
    onClick={onClick}
    className="w-full text-center bg-white rounded border border-neutral-200 py-3 text-sm font-medium hover:bg-neutral-50 active:bg-neutral-100"
  >
    {label}
  </button>
);

// Ensure all quick actions go to /app/* even if config paths are app-local like "/customers"
const normalizeAppPath = (p) => {
  if (!p) return '/app';
  if (p.startsWith('/app/')) return p;
  if (p === '/app' || p === '/app/') return '/app';
  if (p.startsWith('/')) return `/app${p}`;
  return `/app/${p}`;
};

const MobileQuickActionsModal = ({ isOpen, onClose }) => {
  const [entering, setEntering] = useState(false);
  const navigate = useNavigate();

  const goTo = (path) => {
    onClose?.();
    navigate(normalizeAppPath(path));
  };

  useEffect(() => {
    if (isOpen) {
      const id = requestAnimationFrame(() => setEntering(true));
      return () => cancelAnimationFrame(id);
    }
    setEntering(false);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    // Fullscreen container uses flex to center horizontally and stick to bottom
    <div className="fixed inset-0 z-[60] md:hidden flex items-end justify-center">
      {/* Overlay (click to close) */}
      <div
        className={`absolute inset-0 bg-black transition-opacity duration-200 ${
          entering ? 'opacity-60' : 'opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Bottom sheet (centered) */}
      <div
        role="dialog"
        aria-modal="true"
        className={`relative z-10 bg-white rounded-2xl shadow-xl overflow-hidden transition-all duration-300 ${
          entering ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
        }`}
        style={{
          width: 'calc(100% - 1.5rem - env(safe-area-inset-left) - env(safe-area-inset-right))',
          maxWidth: '500px',
          maxHeight: 'calc(80vh - env(safe-area-inset-bottom))',
          marginBottom: 'calc(1.25rem + env(safe-area-inset-bottom))',
        }}
      >
        {/* Close icon row (non-scrolling) */}
        <div className="flex justify-end px-2 pt-2">
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded hover:bg-neutral-100 active:bg-neutral-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable content area */}
        <div
          className="px-3 pb-4 overflow-y-auto"
          style={{
            maxHeight: 'calc(80vh - 3.5rem - env(safe-area-inset-bottom))',
            paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))',
          }}
        >
          <div className="space-y-2">
            {quickActions.map(({ label, path }) => (
              <ActionButton key={label} label={label} onClick={() => goTo(path)} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileQuickActionsModal;
