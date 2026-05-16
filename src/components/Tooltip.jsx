import React from 'react';

const Tooltip = ({ text, children }) => (
  <div className="relative group inline-block">
    {children}
    <span className="absolute z-10 bottom-full mb-1 left-1/2 -translate-x-1/2 px-2 py-1 text-sm text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
      {text}
    </span>
  </div>
);

export default Tooltip;
