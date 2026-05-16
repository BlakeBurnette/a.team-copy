import React, { useMemo } from 'react';

const cleanZip = (s) => s.replace(/\D/g, '').slice(0, 5);

const ZipcodeListInput = ({ value = [], onChange }) => {
  const zips = Array.isArray(value) ? value : [];
  const rows = useMemo(() => [...zips, ''], [zips]); // N+1 input

  const updateAt = (idx, nextVal) => {
    const cleaned = cleanZip(nextVal);
    const out = [...zips];
    if (idx === zips.length) {
      // editing the N+1 row
      if (cleaned) out.push(cleaned);
    } else {
      out[idx] = cleaned;
    }
    onChange?.(out.filter(Boolean));
  };

  const removeAt = (idx) => {
    onChange?.(zips.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2">
      {rows.map((v, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            inputMode="numeric"
            className="border rounded px-2 py-2 w-32"
            placeholder="ZIP"
            value={i === zips.length ? '' : v}
            onChange={(e) => updateAt(i, e.target.value)}
          />
          {i < zips.length && (
            <button
              type="button"
              className="text-sm px-2 py-1 border rounded hover:bg-neutral-50"
              onClick={() => removeAt(i)}
            >
              Remove
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

export default ZipcodeListInput;
