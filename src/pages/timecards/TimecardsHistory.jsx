import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { AlertTriangle, Download, History, Loader2, RefreshCw } from 'lucide-react';
import TrustBadge from '../../components/timecards/TrustBadge';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import { useUserProfile, useAuth } from '../../context/AuthContext';
import { fetchGustoExportPreview, fetchGustoStatus, reexportGustoTimecard, getGustoExportDiff } from '../../api/gusto';
import { formatMinutes, formatDateTime, filterUsersForScope, shouldShowTeamTotals } from './timecardUtils';

const Pill = ({ children }) => (
  <span className="inline-flex items-center px-2 py-1 rounded-full bg-neutral-100 text-neutral-800 border border-neutral-200 text-xs font-semibold">
    {children}
  </span>
);

const GustoExportPanel = ({ run }) => {
  const runId = run?.id || run?.run_id;
  const { user, roles = [], permissions = [], refreshMe } = useAuth() || {};
  const { profile } = useUserProfile() || {};
  const isOwner = (profile?.role || '').toLowerCase() === 'owner';

  const [connected, setConnected] = useState(true);
  const [paused, setPaused] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [reexporting, setReexporting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [diffOpen, setDiffOpen] = useState(false);
  const [diffLoading, setDiffLoading] = useState(false);
  const [diffError, setDiffError] = useState('');
  const [diff, setDiff] = useState(null);

  useEffect(() => {
    setPreview(null);
    setPreviewError('');
    setConfirmOpen(false);
  }, [runId]);

  useEffect(() => {
    let mounted = true;
    if (!isOwner) return undefined;
    (async () => {
      try {
        const data = await fetchGustoStatus();
        if (!mounted) return;
        setConnected(Boolean(data?.connected) || String(data?.status || '').toLowerCase() === 'connected');
        setPaused(
          Boolean(
            data?.paused ||
              data?.exports_paused ||
              (data?.status || '').toLowerCase() === 'paused'
          )
        );
      } catch {
        if (mounted) {
          setConnected(false);
          setPaused(false);
        }
      }
    })();
    return () => { mounted = false; };
  }, [isOwner]);

  const loadPreview = useCallback(async () => {
    if (!isOwner) return;
    if (!runId) return;
    setPreviewLoading(true);
    setPreviewError('');
    try {
      const data = await fetchGustoExportPreview(runId);
      setPreview(data || {});
    } catch (e) {
      setPreview(null);
      setPreviewError(e?.response?.data?.error || e?.message || 'Failed to load export preview');
    } finally {
      setPreviewLoading(false);
    }
  }, [runId]);

  const handleReexport = useCallback(async () => {
    if (!isOwner) return;
    if (!runId) return;
    setReexporting(true);
    setPreviewError('');
    try {
      await reexportGustoTimecard(runId);
      await loadPreview();
      setConfirmOpen(false);
    } catch (e) {
      setPreviewError(e?.response?.data?.error || e?.message || 'Re-export failed');
    } finally {
      setReexporting(false);
    }
  }, [loadPreview, runId, isOwner]);

  const loadDiff = useCallback(async () => {
    if (!runId || !isOwner) return;
    setDiffOpen(true);
    setDiffLoading(true);
    setDiffError('');
    setDiff(null);
    try {
      const data = await getGustoExportDiff(runId);
      setDiff(data || {});
    } catch (e) {
      setDiffError(e?.response?.data?.error || e?.message || 'Failed to load export diff');
    } finally {
      setDiffLoading(false);
    }
  }, [runId, isOwner]);

  if (!isOwner) return null;
  if (!runId) return null;

  const warnings = Array.isArray(preview?.warnings) ? preview.warnings : [];
  const blockingWarnings = (Array.isArray(preview?.blocking_errors) ? preview.blocking_errors : []).concat(
    warnings.filter((w) => w?.severity === 'error' || w?.blocking)
  );
  const hasBlocking = preview?.can_export === false || blockingWarnings.length > 0;
  const mappingMissing =
    preview?.mapping_missing ||
    preview?.has_mapping === false ||
    preview?.mapping_status === 'missing' ||
    (Array.isArray(preview?.missing_mappings) && preview.missing_mappings.length > 0);

  const lines = Array.isArray(preview?.lines)
    ? preview.lines
    : Array.isArray(preview?.rows)
    ? preview.rows
    : Array.isArray(preview?.entries)
    ? preview.entries
    : [];

  const status = preview?.status || preview?.export_status || 'unknown';
  const lastVersion = preview?.last_export_version || preview?.last_version || preview?.export_version;
  const nextVersion = preview?.next_export_version || preview?.next_version;
  const matchesLast = preview?.matches_last_export ?? preview?.matches_previous ?? null;
  const eligibleAt = preview?.eligible_at || preview?.export_eligible_at;
  const eligibleDate = eligibleAt ? new Date(eligibleAt) : null;
  const eligibleFuture = eligibleDate && eligibleDate.getTime() > Date.now();
  const notEligible = preview && (preview?.eligible === false || eligibleFuture);
  const disconnected = Array.isArray(preview?.action_flags) && preview.action_flags.includes('DISCONNECTED');
  const disableReexport =
    !preview ||
    !connected ||
    mappingMissing ||
    hasBlocking ||
    previewLoading ||
    reexporting ||
    paused ||
    notEligible ||
    disconnected;

  return (
    <div className="border border-neutral-200 rounded-lg p-3 bg-neutral-50 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <div className="text-sm font-semibold text-neutral-900">Gusto Export</div>
          <div className="text-xs text-neutral-600">Preview and re-export this timecard.</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadPreview}
            disabled={previewLoading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-300 text-sm font-semibold text-neutral-800 bg-white hover:bg-neutral-50 disabled:opacity-60"
          >
            {previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Load Export Preview
          </button>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={disableReexport}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800 disabled:opacity-60"
          >
            Re-export to Gusto
          </button>
          <button
            type="button"
            onClick={loadDiff}
            disabled={diffLoading || previewLoading || !preview}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-300 text-sm font-semibold text-neutral-800 bg-white hover:bg-neutral-50 disabled:opacity-60"
          >
            {diffLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            View changes since last export
          </button>
        </div>
      </div>

      {!connected ? (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          Connect Gusto to enable exports.
        </div>
      ) : null}
      {mappingMissing ? (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          Missing user mapping for this timecard. <a href="/app/admin/integrations/gusto" className="underline">Go to mappings</a>.
        </div>
      ) : null}
      {hasBlocking ? (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5" />
          <div>Resolve blocking issues before re-exporting.</div>
        </div>
      ) : null}
      {paused ? (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5" />
          <div>
            <div className="font-semibold">Exports paused</div>
            <a href="/app/admin/integrations/gusto" className="underline text-amber-800">Go to Gusto settings</a>
          </div>
        </div>
      ) : null}
      {disconnected ? (
        <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2 inline-flex items-center gap-2">
          <Badge color="red">DISCONNECTED</Badge>
          <span>Reconnect Gusto to export this timecard.</span>
        </div>
      ) : null}
      {previewError ? (
        <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
          {previewError}
        </div>
      ) : null}

      {preview ? (
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-sm">
            <span className="font-semibold text-neutral-800">Status</span>
            <Badge color={status === 'exported' ? 'green' : status === 'failed' ? 'red' : 'yellow'}>
              {status}
            </Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm text-neutral-800">
            <div>
              <div className="text-xs text-neutral-500">Last export version</div>
              <div className="font-semibold">{lastVersion ?? '—'}</div>
            </div>
            <div>
              <div className="text-xs text-neutral-500">Next export version</div>
              <div className="font-semibold">{nextVersion ?? '—'}</div>
            </div>
            <div>
              <div className="text-xs text-neutral-500">Eligible to export on</div>
              <div className="font-semibold">{eligibleDate ? eligibleDate.toLocaleString() : 'Unknown'}</div>
            </div>
            <div>
              <div className="text-xs text-neutral-500">Matches last export</div>
              <div className="font-semibold">
                {matchesLast == null ? 'Unknown' : matchesLast ? 'Yes' : 'No'}
              </div>
            </div>
          </div>
          {notEligible ? (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 inline-flex items-center gap-2">
              <Badge color="yellow">Not eligible yet</Badge>
              <span>Exports will be allowed after eligibility date.</span>
            </div>
          ) : null}

          {lines.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="text-left text-neutral-700 border-b">
                    <th className="py-2 pr-4 font-semibold">Date</th>
                    <th className="py-2 pr-4 font-semibold">Regular hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {lines.map((row, idx) => (
                    <tr key={idx}>
                      <td className="py-2 pr-4 text-neutral-800">{row.date || row.day || row.work_date || '—'}</td>
                      <td className="py-2 pr-4 text-neutral-800">{row.regular_hours ?? row.hours ?? row.total_hours ?? '0'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {warnings.length > 0 ? (
            <div className="space-y-1">
              <div className="text-xs font-semibold text-neutral-800">Warnings</div>
              <ul className="list-disc list-inside text-xs text-neutral-700 space-y-0.5">
                {warnings.map((w, idx) => (
                  <li key={idx}>{typeof w === 'string' ? w : w?.message || 'Warning'}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <Modal open={diffOpen} onClose={() => setDiffOpen(false)}>
            <div className="space-y-3">
              <div className="text-lg font-semibold text-neutral-900">Changes since last export</div>
              {diffLoading ? (
                <div className="text-sm text-neutral-700 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                </div>
              ) : diffError ? (
                <div className="text-sm text-rose-700">{diffError}</div>
              ) : diff ? (
                <div className="space-y-2 text-sm text-neutral-800">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-neutral-500">Last export version</div>
                      <div className="font-semibold">{diff.last_version ?? '—'}</div>
                      <div className="text-xs text-neutral-500">
                        {diff.exported_at ? `Exported ${new Date(diff.exported_at).toLocaleString()}` : ''}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-neutral-500">Current preview fingerprint</div>
                      <div className="font-semibold">{diff.current_fingerprint || '—'}</div>
                      <div className="text-xs text-neutral-500">
                        {diff.eligible_at ? `Eligible ${new Date(diff.eligible_at).toLocaleString()}` : ''}
                      </div>
                    </div>
                  </div>
                  {Array.isArray(diff.lines) && diff.lines.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs">
                        <thead>
                          <tr className="text-left text-neutral-700 border-b">
                            <th className="py-2 pr-4 font-semibold">Date</th>
                            <th className="py-2 pr-4 font-semibold">Previous hours</th>
                            <th className="py-2 pr-4 font-semibold">New hours</th>
                            <th className="py-2 pr-4 font-semibold">Delta</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {diff.lines.map((row, idx) => (
                            <tr key={idx}>
                              <td className="py-2 pr-4">{row.date || row.day || '—'}</td>
                              <td className="py-2 pr-4">{row.previous_hours ?? row.prev_hours ?? '0'}</td>
                              <td className="py-2 pr-4">{row.new_hours ?? row.current_hours ?? '0'}</td>
                              <td className="py-2 pr-4">{row.delta ?? row.diff ?? '0'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-sm text-neutral-600">No prior export to compare.</div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-neutral-700">No prior export to compare.</div>
              )}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setDiffOpen(false)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-300 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
                >
                  Close
                </button>
              </div>
            </div>
          </Modal>
        </div>
      ) : null}

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <div className="space-y-3">
          <div className="text-lg font-semibold text-neutral-900">Re-export to Gusto?</div>
          <p className="text-sm text-neutral-700">
            This will void the previous export and create a new export version.
          </p>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-300 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleReexport}
              disabled={reexporting}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800 disabled:opacity-60"
            >
              {reexporting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Confirm re-export
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export function RunList({ runs, selectedId, onSelect }) {
  if (!runs.length) {
    return <div className="text-sm text-neutral-600">No runs yet.</div>;
  }
  return (
    <div className="flex flex-col gap-2">
      {runs.map((run) => (
        <button
          key={run.id || run.run_id}
          onClick={() => onSelect(run.id || run.run_id)}
          className={`text-left border rounded-lg px-3 py-2 ${selectedId === (run.id || run.run_id) ? 'border-neutral-800 bg-neutral-50' : 'border-neutral-200 hover:border-neutral-400'}`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="font-semibold text-neutral-900">
              {run.period_start} – {run.period_end}
            </div>
            <TrustBadge
              trust_status={run.trust_status}
              trust_hash={run.trust_hash}
              anchored_at={run.anchored_at}
              trust_block_id={run.trust_block_id}
            />
          </div>
          <div className="text-xs text-neutral-600 mt-1">
            {run.status || 'pending'} • Generated {formatDateTime(run.generated_at)}
          </div>
        </button>
      ))}
    </div>
  );
}

export function RunDetail({ run, scope, userId, onExport, exporting }) {
  const visibleUsers = useMemo(() => filterUsersForScope(run?.users, scope, userId), [run?.users, scope, userId]);
  const showTeams = shouldShowTeamTotals(scope) && Array.isArray(run?.teams) && run.teams.length > 0;

  if (!run) {
    return <div className="text-sm text-neutral-600">Select a run to view details.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-sm text-neutral-600">{run.period_start} – {run.period_end}</div>
          <div className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
            <span className="capitalize">{run.status || 'pending'}</span>
            <TrustBadge
              trust_status={run.trust_status}
              trust_hash={run.trust_hash}
              anchored_at={run.anchored_at}
              trust_block_id={run.trust_block_id}
            />
          </div>
          <div className="text-xs text-neutral-500">Generated {formatDateTime(run.generated_at)}</div>
        </div>
        <button
          type="button"
          onClick={() => onExport?.(run)}
          disabled={exporting}
          className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-neutral-900 text-white text-sm hover:bg-neutral-800 disabled:opacity-60"
        >
          <Download className="w-4 h-4" />
          {exporting ? 'Preparing…' : 'Export CSV'}
        </button>
      </div>

      <GustoExportPanel run={run} />

      {visibleUsers.length > 0 ? (
        <div className="space-y-3">
          <div className="text-sm font-semibold text-neutral-800">People</div>
          {visibleUsers.map((u) => (
            <div key={u.user_id || u.id} className="border border-neutral-200 rounded-lg p-3 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-semibold text-neutral-900">{u.name || u.user_name || 'Crew member'}</div>
                  <div className="text-xs text-neutral-500">{u.team_name || '—'}</div>
                </div>
                <Pill>{formatMinutes(u.clocked_minutes)} clocked</Pill>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-xs text-neutral-700">
                <div className="flex flex-col">
                  <span className="text-neutral-500">Job minutes</span>
                  <span className="font-semibold">{formatMinutes(u.job_minutes)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-neutral-500">Clocked</span>
                  <span className="font-semibold">{formatMinutes(u.clocked_minutes)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-neutral-500">Billed</span>
                  <span className="font-semibold">{formatMinutes(u.billed_minutes)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-neutral-500">Variance</span>
                  <span className="font-semibold">{formatMinutes(u.variance_minutes)}</span>
                </div>
              </div>
              {Array.isArray(u.jobs) && u.jobs.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {u.jobs.map((j) => (
                    <div key={j.job_id || j.occurrence_id || j.id} className="border border-dashed border-neutral-200 rounded-lg p-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold text-neutral-900 text-sm">{j.customer_name || j.service_name || 'Job'}</div>
                        <TrustBadge
                          trust_status={j.trust_status}
                          trust_hash={j.trust_hash || j.arrive_trust_hash || j.complete_trust_hash}
                          anchored_at={j.anchored_at}
                          trust_block_id={j.trust_block_id}
                        />
                      </div>
                      <div className="text-xs text-neutral-600">
                        {formatDateTime(j.started_at)} – {formatDateTime(j.completed_at)}
                      </div>
                      <div className="text-xs text-neutral-700 mt-1">
                        Job {formatMinutes(j.job_minutes ?? j.clocked_minutes)} • Billed {formatMinutes(j.billed_minutes)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-neutral-600">No user rows visible for this scope.</div>
      )}

      {showTeams ? (
        <div className="space-y-2">
          <div className="text-sm font-semibold text-neutral-800">Teams</div>
          {run.teams.map((t) => (
            <div key={t.team_id || t.team_name} className="border border-neutral-200 rounded-lg p-3 bg-neutral-50">
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold text-neutral-900">{t.team_name || 'Team'}</div>
                <Pill>{formatMinutes(t.clocked_minutes)} clocked</Pill>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-xs text-neutral-700">
                <div className="flex flex-col">
                  <span className="text-neutral-500">Job minutes</span>
                  <span className="font-semibold">{formatMinutes(t.job_minutes)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-neutral-500">Clocked</span>
                  <span className="font-semibold">{formatMinutes(t.clocked_minutes)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-neutral-500">Billed</span>
                  <span className="font-semibold">{formatMinutes(t.billed_minutes)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-neutral-500">Variance</span>
                  <span className="font-semibold">{formatMinutes(t.variance_minutes)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {Array.isArray(run.payments_history) && run.payments_history.length > 0 ? (
        <div className="space-y-2">
          <div className="text-sm font-semibold text-neutral-800">Payments history</div>
          <div className="grid gap-2">
            {run.payments_history.map((p, idx) => (
              <div key={p.id || idx} className="border border-neutral-200 rounded-lg p-2 text-xs text-neutral-700 bg-white">
                <div className="font-semibold text-neutral-900">{p.label || 'Payment'}</div>
                <div className="text-neutral-600">{p.status || '—'} • {formatDateTime(p.at || p.created_at)}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function TimecardsHistory({ scope = 'owner', userId }) {
  const [runs, setRuns] = useState([]);
  const [activeShift, setActiveShift] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedRun, setSelectedRun] = useState(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingRun, setLoadingRun] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [events, setEvents] = useState([]);
  const [eventsDate, setEventsDate] = useState('');
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState('');

  const authHeader = useCallback(async () => ({}), []);

  const fetchRuns = useCallback(async () => {
    setLoadingList(true);
    setError('');
    try {
      const headers = await authHeader();
      const params = {};
      const url = scope === 'self' ? '/api/crew/timecards' : '/api/timecards';
      const { data } = await axios.get(url, {
        headers,
        withCredentials: true,
        params,
      });
      const list = Array.isArray(data?.runs) ? data.runs : Array.isArray(data) ? data : [];
      setRuns(list);
      if (list.length && !selectedId) {
        setSelectedId(list[0].id || list[0].run_id);
      }
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to load timecard runs');
      setRuns([]);
    } finally {
      setLoadingList(false);
    }
  }, [authHeader, scope, selectedId]);

  const fetchActiveShift = useCallback(async () => {
    if (scope !== 'self') return;
    try {
      const headers = await authHeader();
      const { data } = await axios.get('/api/crew/shifts/current', {
        headers,
        withCredentials: true,
        validateStatus: () => true,
      });
      if (data && data.id && !data.ended_at) {
        setActiveShift({
          id: data.id,
          started_at: data.started_at,
          minutes: data.clocked_minutes ?? null,
        });
      } else {
        setActiveShift(null);
      }
    } catch {
      setActiveShift(null);
    }
  }, [authHeader, scope]);

  const fetchRun = useCallback(async (id) => {
    if (!id) return;
    setLoadingRun(true);
    setError('');
    try {
      const headers = await authHeader();
      const url = scope === 'self'
        ? `/api/crew/timecards/${encodeURIComponent(id)}`
        : `/api/timecards/${encodeURIComponent(id)}`;
      const { data } = await axios.get(url, {
        headers,
        withCredentials: true,
      });
      // Normalize entries -> users list
      const run = data?.run || data || {};
      const entries = Array.isArray(data?.entries) ? data.entries : (data?.entry ? [data.entry] : []);
      const users = entries.map((e) => ({
        user_id: e.user_id,
        name: e.user_name || e.name,
        team_name: e.team_name,
        clocked_minutes: e.clocked_minutes,
        billed_minutes: e.billed_minutes ?? e.job_minutes,
        job_minutes: e.job_minutes,
        variance_minutes: e.variance_minutes ?? (e.billed_minutes ?? e.job_minutes) - (e.job_minutes || 0),
        jobs: Array.isArray(e.jobs_json) ? e.jobs_json.map((j) => ({
          ...j,
          job_minutes: j.job_minutes ?? j.clocked_minutes,
          billed_minutes: j.billed_minutes ?? j.job_minutes ?? j.clocked_minutes,
          trust_hash: j.arrive_trust_hash || j.complete_trust_hash || j.trust_hash,
        })) : [],
      }));
      const normalizedRun = {
        ...run,
        users,
        teams: run.teams || [],
      };
      setSelectedRun(normalizedRun);
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to load timecard run');
      setSelectedRun(null);
    } finally {
      setLoadingRun(false);
    }
  }, [authHeader, scope]);

  const fetchEvents = useCallback(async () => {
    if (scope !== 'self') return;
    setEventsLoading(true);
    setEventsError('');
    try {
      const headers = await authHeader();
      const params = {};
      if (eventsDate) params.date = eventsDate;
      const { data } = await axios.get('/api/crew/timecards/events', {
        headers,
        withCredentials: true,
        params,
        validateStatus: () => true,
      });
      const list = Array.isArray(data?.events) ? data.events : Array.isArray(data) ? data : [];
      setEvents(list);
    } catch (e) {
      setEvents([]);
      setEventsError(e?.response?.data?.error || 'Failed to load events');
    } finally {
      setEventsLoading(false);
    }
  }, [authHeader, scope, eventsDate]);

  const handleExport = useCallback(async (run) => {
    if (!run?.id && !run?.run_id) return;
    setExporting(true);
    try {
      const id = run.id || run.run_id;
      const url = scope === 'self'
        ? `/api/crew/timecards/${encodeURIComponent(id)}/export`
        : `/api/timecards/${encodeURIComponent(id)}/export`;
      const headers = await authHeader();
      const res = await axios.get(url, {
        headers,
        withCredentials: true,
        params: { format: 'csv' },
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `timecard-${id}.csv`;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to export run');
    } finally {
      setExporting(false);
    }
  }, [authHeader]);

  useEffect(() => {
    fetchRuns();
    fetchActiveShift();
    fetchEvents();
  }, [fetchRuns, fetchActiveShift, fetchEvents]);

  useEffect(() => {
    fetchRun(selectedId);
  }, [fetchRun, selectedId]);

  const renderActiveShift = () => {
    if (!activeShift || runs.length > 0) return null;
    return (
      <div className="mt-3 border border-amber-200 bg-amber-50 rounded-lg p-3">
        <div className="text-sm font-semibold text-amber-900">Active shift</div>
        <div className="text-xs text-amber-800">
          Started {activeShift.started_at ? new Date(activeShift.started_at).toLocaleString() : 'recently'}
          {typeof activeShift.minutes === 'number' ? ` • ${activeShift.minutes} min` : ''}
        </div>
        <div className="text-xs text-amber-700 mt-1">
          Clock out to generate a timecard run. After clock-out, tap Refresh to see it here.
        </div>
      </div>
    );
  };

  const renderEvents = () => {
    if (scope !== 'self') return null;
    return (
      <div className="bg-white border border-neutral-200 rounded-xl shadow-sm p-4 mt-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-neutral-700" />
            <div>
              <div className="text-lg font-semibold text-neutral-900">Clock events</div>
              <div className="text-xs text-neutral-500">Individual clock-ins/outs. Filter by date.</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={eventsDate}
              onChange={(e) => setEventsDate(e.target.value)}
              className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={fetchEvents}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-neutral-900 text-white text-sm hover:bg-neutral-800"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
        {eventsError ? <div className="mt-3 text-sm text-rose-700">{eventsError}</div> : null}
        {eventsLoading ? <div className="mt-3 text-sm text-neutral-700">Loading events…</div> : null}
        {!eventsLoading && events.length === 0 ? (
          <div className="mt-3 text-sm text-neutral-600">No events for the selected date.</div>
        ) : null}
        <div className="mt-3 space-y-2">
          {events.map((ev, idx) => {
            const type = (ev.type || ev.event_type || ev.status || '').toLowerCase();
            const start = ev.started_at || ev.start || ev.at || ev.clocked_in_at;
            const end = ev.ended_at || ev.end || ev.clocked_out_at;
            const minutes =
              ev.minutes ??
              ev.duration_minutes ??
              ev.clocked_minutes ??
              (ev.duration_seconds != null ? Math.round(ev.duration_seconds / 60) : null);
            return (
              <div key={ev.id || idx} className="border border-neutral-200 rounded-lg p-3 bg-white">
                <div className="text-sm font-semibold text-neutral-900 capitalize">
                  {type || 'Event'}
                </div>
                <div className="text-xs text-neutral-600">
                  {start ? `Start: ${new Date(start).toLocaleString()}` : 'Start: —'}
                  {end ? ` • End: ${new Date(end).toLocaleString()}` : ''}
                  {minutes != null ? ` • ${minutes} min` : ''}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white border border-neutral-200 rounded-xl shadow-sm p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-neutral-700" />
          <div>
            <div className="text-lg font-semibold text-neutral-900">Timecards history</div>
            <div className="text-xs text-neutral-500">View runs, totals, and exports. Scoped to {scope === 'self' ? 'you' : 'the organization'}.</div>
          </div>
        </div>
        <button
          type="button"
          onClick={fetchRuns}
          className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-neutral-900 text-white text-sm hover:bg-neutral-800"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {error ? <div className="mt-3 text-sm text-rose-700">{error}</div> : null}
      {loadingList ? <div className="mt-3 text-sm text-neutral-700">Loading runs…</div> : null}
      {renderActiveShift()}

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <RunList runs={runs} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
        <div className="lg:col-span-2">
          {loadingRun ? (
            <div className="text-sm text-neutral-700">Loading run…</div>
          ) : (
            <RunDetail run={selectedRun} scope={scope} userId={userId} onExport={handleExport} exporting={exporting} />
          )}
        </div>
      </div>
      {renderEvents()}
    </div>
  );
}
