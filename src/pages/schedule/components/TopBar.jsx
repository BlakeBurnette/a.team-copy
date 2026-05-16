import React from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

export default function TopBar({ title, rangeFrom, rangeTo, onPrev, onNext }) {
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-xl font-semibold flex items-center gap-2">
        <CalendarIcon className="w-5 h-5" />
        {title}
      </h1>
      <div className="flex items-center gap-2">
        <div className="inline-flex rounded-lg border bg-white overflow-hidden">
          <button type="button" className="px-3 py-1.5" onClick={onPrev}>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="px-3 py-1.5 text-sm border-l border-r">
            {format(rangeFrom, 'MMM d')} — {format(rangeTo, 'MMM d')}
          </div>
          <button type="button" className="px-3 py-1.5" onClick={onNext}>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
