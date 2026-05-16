import React from 'react';
import { Calendar, Users, ChevronRight } from 'lucide-react';

export default function UpcomingServicesSection({ services = [] }) {
  if (!services.length) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider">
          Upcoming Services
        </h3>
        <p className="text-sm text-neutral-400">No upcoming services scheduled.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider">
        Upcoming Services
      </h3>
      <div className="space-y-2">
        {services.map((svc, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 rounded-lg bg-white border border-neutral-200 hover:border-amber-300 transition-colors"
          >
            <div className="flex-shrink-0 w-12 h-12 bg-amber-50 rounded-lg flex flex-col items-center justify-center">
              <span className="text-xs font-bold text-amber-600">
                {new Date(svc.date).toLocaleDateString('en-US', { month: 'short' })}
              </span>
              <span className="text-sm font-bold text-amber-800">
                {new Date(svc.date).getDate()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-neutral-900">{svc.service_type}</div>
              <div className="flex items-center gap-2 text-xs text-neutral-500 mt-0.5">
                {svc.crew_name && (
                  <>
                    <Users className="h-3 w-3" />
                    <span>{svc.crew_name}</span>
                  </>
                )}
                {svc.time_window && (
                  <>
                    <Calendar className="h-3 w-3 ml-1" />
                    <span>{svc.time_window}</span>
                  </>
                )}
              </div>
            </div>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              svc.status === 'confirmed' ? 'bg-green-100 text-green-700' :
              svc.status === 'pending' ? 'bg-amber-100 text-amber-700' :
              'bg-neutral-100 text-neutral-600'
            }`}>
              {svc.status}
            </span>
            <ChevronRight className="h-4 w-4 text-neutral-300" />
          </div>
        ))}
      </div>
    </div>
  );
}
