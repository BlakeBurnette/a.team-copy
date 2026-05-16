import React from 'react';

const Tabs = ({ tabs, value, onChange }) => (
  <div className="border-b overflow-x-auto md:overflow-visible">
    <div className="flex space-x-6 flex-nowrap md:flex-wrap min-w-max">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={
            value === tab
              ? 'px-1 py-2 text-gray-900 border-b-2 border-gray-900 font-semibold whitespace-nowrap'
              : 'px-1 py-2 text-gray-500 hover:text-gray-700 border-b-2 border-transparent whitespace-nowrap'
          }
        >
          {tab}
        </button>
      ))}
    </div>
  </div>
);

export default Tabs;
