import React, { useMemo } from 'react';
import Tabs from './Tabs';

/**
 * Responsive tab-to-accordion wrapper.
 * Desktop (md+): renders Tabs component.
 * Mobile: renders a single-open, collapsible accordion.
 *
 * @param {Array<{key:string,label:string,render:()=>React.ReactNode}>} sections
 * @param {string} value - active key (may be empty)
 * @param {(key:string)=>void} onChange - updater for active key
 */
export default function ResponsiveTabs({ sections = [], value, onChange }) {
  const fallbackKey = sections[0]?.key || '';
  const desktopActiveKey = value || fallbackKey;
  const mobileActiveKey = value === '' ? '' : (value || fallbackKey);
  const activeLabel = useMemo(() => {
    const key = mobileActiveKey || fallbackKey;
    return sections.find((s) => s.key === key)?.label || sections[0]?.label || '';
  }, [sections, mobileActiveKey, fallbackKey]);

  const handleTabChange = (label) => {
    const match = sections.find((s) => s.label === label);
    if (match) onChange(match.key);
  };

  const toggleAccordion = (key, isOpen) => {
    onChange(isOpen ? '' : key);
  };

  return (
    <div className="space-y-3">
      {/* Desktop tabs */}
      <div className="hidden md:block">
        <Tabs
          tabs={sections.map((s) => s.label)}
          value={activeLabel}
          onChange={handleTabChange}
        />
      </div>

      {/* Mobile accordion */}
      <div className="block md:hidden space-y-2">
        {sections.map((section) => {
          const isOpen = mobileActiveKey === section.key;
          return (
            <div key={section.key} className="border rounded-lg">
              <button
                type="button"
                onClick={() => toggleAccordion(section.key, isOpen)}
                className="w-full flex items-center justify-between px-3 py-2 text-left"
                aria-expanded={isOpen}
              >
                <span className="text-sm font-semibold text-neutral-800">{section.label}</span>
                <span className="text-neutral-500">{isOpen ? '−' : '+'}</span>
              </button>
              {isOpen ? (
                <div className="border-t px-3 py-2">
                  {section.render()}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Desktop content */}
      <div className="hidden md:block">
        {sections.map((section) => (
          <div key={section.key}>
            {desktopActiveKey === section.key ? section.render() : null}
          </div>
        ))}
      </div>
    </div>
  );
}
