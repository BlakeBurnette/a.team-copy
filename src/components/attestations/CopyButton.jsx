import React, { useState } from 'react';

export default function CopyButton({ text, label = 'Copy', ariaLabel }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="ml-2 text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50"
      aria-label={ariaLabel || label}
    >
      {copied ? 'Copied' : label}
    </button>
  );
}
