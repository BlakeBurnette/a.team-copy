import React, { useEffect, useMemo } from 'react';
import axios from 'axios';
import { CalendarSearch, RefreshCw, AlertTriangle } from 'lucide-react';
import { useUserProfile, useAuth } from '../../context/AuthContext.jsx';
import { startSSE } from '../../utils/sse';
import TrustBadge from '../../components/timecards/TrustBadge';
import { formatMinutes, formatDateTime } from './timecardUtils';
import useCrewDaySummary from './useCrewDaySummary';

const Metric = ({ label, value }) => (
  <div className="flex flex-col bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2">
    <span className="text-xs text-neutral-500">{label}</span>
    <span className="text-sm font-semibold text-neutral-900">{value}</span>
  </div>
);

const ReadOnlyJobCard = ({ job }) => {
  const customer = job.customer || {};
  const property = job.property || {};
  const service = job.service || {};
  return (
    <div className="border border-neutral-200 rounded-lg p-3 bg-white shadow-sm flex flex-col gap-2" data-testid="schedule-card">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-neutral-900">{service.name || job.service_name || 'Job'}</div>
          <div className="text-xs text-neutral-600">{customer.name || job.customer_name || 'Customer'}</div>
          {property.display_address || property.street ? (
            <div className="text-xs text-neutral-500">
              {property.display_address || [property.street, property.city, property.state].filter(Boolean).join(', ')}
            </div>
          ) : null}
        </div>
        <TrustBadge
          trust_status={job.trust_status}
          trust_hash={job.arrive_trust_hash || job.complete_trust_hash || job.trust_hash}
          anchored_at={job.anchored_at}
          trust_block_id={job.trust_block_id}
        />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-neutral-700">
        <div className="flex flex-col">
          <span className="text-neutral-500">Started</span>
          <span className="font-semibold">{formatDateTime(job.started_at)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-neutral-500">Completed</span>
          <span className="font-semibold">{formatDateTime(job.completed_at)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-neutral-500">Job minutes</span>
          <span className="font-semibold">{formatMinutes(job.job_minutes ?? job.clocked_minutes)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-neutral-500">Billed minutes</span>
          <span className="font-semibold">{formatMinutes(job.billed_minutes)}</span>
        </div>
      </div>
    </div>
  );
};

export default function OwnerDaySummary() {
  const { user, roles = [], permissions = [], refreshMe } = useAuth() || {};
  const { profile } = useUserProfile() || {};
  const orgId = profile?.organization_id || profile?.org_id || null;

  const {
    date,
    setDate,
    teamId,
    setTeamId,
    summaries,
    warnings,
    loading,
    error,
    refetch,
  } = useCrewDaySummary({ orgId });

  const [teams, setTeams] = React.useState([]);

  const fetchTeams = React.useCallback(async () => {
    try {
      const { data } = await axios.get('/api/owner/teams', {
        withCredentials: true,
      });
      const opts = Array.isArray(data) ? data : [];
      setTeams(opts);
    } catch {
      setTeams([]);
    }
  }, []);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  useEffect(() => {
    let stop;
    try {
      stop = startSSE({
        orgId,
        onEvent: ({ type }) => {
          if (type === 'schedule_completed' || type === 'schedule_updated') {
            refetch();
          }
        },
      });
    } catch (e) {
      console.warn('[OwnerDaySummary] SSE not started', e);
    }
    return () => { stop?.close?.(); };
  }, [refetch, orgId]);

  return (
    <div className="bg-white border border-neutral-200 rounded-xl shadow-sm p-4">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 px-3 md:px-0">
        <div>
          <h3 className="text-lg font-semibold text-neutral-900">Day Summary</h3>
          <p className="text-sm text-neutral-600">Pick a date to see per-team totals and read-only job cards.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-end gap-2">
          <label className="text-sm text-neutral-700 flex flex-col">
            <span className="text-xs text-neutral-500">Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
          </label>
          <label className="text-sm text-neutral-700 flex flex-col">
            <span className="text-xs text-neutral-500">Team</span>
            <select
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">All teams</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-lg bg-neutral-900 text-white text-sm whitespace-nowrap hover:bg-neutral-800"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {warnings && warnings.filter(Boolean).length > 0 && (summaries?.length || 0) > 0 ? (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm px-3 py-2 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold">Server warnings</div>
            {warnings
              .filter((w) => !['LEGACY_EVENT_SOURCE', 'LEGACY_JOB_FETCH_FAILED', 'NO_EVENT_SOURCE'].includes(String(w)))
              .map((w, idx) => {
                const label = typeof w === 'string'
                  ? w.replace(/_/g, ' ').toLowerCase().replace(/(^\w|\s\w)/g, (m) => m.toUpperCase())
                  : 'Warning from server';
                return <div key={idx}>{label}</div>;
              })}
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 border border-rose-200 bg-rose-50 rounded-lg p-4">
          <div className="text-base font-semibold text-rose-800">Couldn’t load day summary</div>
          <div className="text-sm text-rose-700 mt-1">
            We couldn’t load this day’s totals. Try again, or pick another date.
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-900 text-white text-sm hover:bg-neutral-800"
          >
            Retry
          </button>
        </div>
      ) : null}

      {loading ? <div className="mt-4 text-sm text-neutral-700">Loading day summary…</div> : null}
      {!loading && summaries.length === 0 && !error ? (
        <div className="mt-4 text-sm text-neutral-600">No summary for this date.</div>
      ) : null}

      <div className="mt-4 space-y-4">
        {summaries.map((team) => (
          <div key={team.team_id || team.team_name} className="border border-neutral-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <CalendarSearch className="w-5 h-5 text-neutral-700" />
                <div>
                  <div className="text-base font-semibold text-neutral-900">{team.team_name || 'Team'}</div>
                  <div className="text-xs text-neutral-500">{date}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Metric label="Jobs completed" value={team.jobs_completed ?? team.job_count ?? '—'} />
                <Metric label="Job site time" value={formatMinutes(team.job_site_minutes ?? team.job_minutes)} />
                <Metric label="Clocked time" value={formatMinutes(team.clocked_minutes)} />
                <Metric label="Billed time" value={formatMinutes(team.billed_minutes ?? team.job_minutes)} />
                <Metric label="Variance" value={formatMinutes(team.variance_minutes)} />
              </div>
            </div>

            {Array.isArray(team.jobs) && team.jobs.length > 0 ? (
              <div className="mt-4 space-y-3">
                {team.jobs.map((job) => (
                  <ReadOnlyJobCard key={job.job_id || job.occurrence_id || job.id} job={job} />
                ))}
              </div>
            ) : (
              <div className="mt-3 text-sm text-neutral-600">No jobs recorded for this team on this date.</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
