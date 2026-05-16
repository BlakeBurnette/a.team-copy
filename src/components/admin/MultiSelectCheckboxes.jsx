import React from 'react';

const MultiSelectCheckboxes = ({ options = [], value = [], onChange }) => {
  const setChecked = (opt, checked) => {
    if (checked) onChange?.([...(value || []), opt]);
    else onChange?.((value || []).filter((v) => v !== opt));
  };

  const selected = new Set(value || []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
      {options.map((opt) => (
        <label key={opt} className="flex items-center gap-2 border rounded px-2 py-2 bg-white">
          <input
            type="checkbox"
            checked={selected.has(opt)}
            onChange={(e) => setChecked(opt, e.target.checked)}
          />
          <span className="text-sm">{opt}</span>
        </label>
      ))}
    </div>
  );
};

export default MultiSelectCheckboxes;
