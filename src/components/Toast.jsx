import React, { useEffect } from 'react';

const Toast = ({ show, onClose, children, duration = 3000 }) => {
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [show, duration, onClose]);

  if (!show) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-md shadow-md z-50">
      {children}
    </div>
  );
};

export default Toast;
