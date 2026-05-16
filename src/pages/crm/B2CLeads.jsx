import { useState, useEffect, useRef } from 'react';
import {
  Search, Loader2, CloudLightning, Home, Phone, Mail,
  MapPin, ArrowUpDown, Download, ChevronDown, ChevronUp,
  Zap, UserSearch, ArrowRight, CheckCircle2, Clock,
  AlertCircle, X,
} from 'lucide-react';
import {
  b2cSmartSearch, getB2CJob, getB2CJobStatus, getB2CJobLeads,
  importB2CLead, importAllB2CLeads, skipTraceB2CLead, getB2CQuota,
} from '../../api/crm';
import Toast from '../../components/crm/Toast';

export default function B2CLeads({ embedded }) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [job, setJob] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState('lead_score');
  const [sortDir, setSortDir] = useState('desc');
  const [selectedLead, setSelectedLead] = useState(null);
  const [importingId, setImportingId] = useState(null);
  const [tracingId, setTracingId] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '' });
  const [quota, setQuota] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => {
    fetchQuota();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const fetchQuota = async () => {
    try {
      const { data } = await getB2CQuota();
      setQuota(data);
    } catch {}
  };

  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim() || searching) return;
    setSearching(true);
    setLeads([]);
    setJob(null);
    setSelectedLead(null);
    try {
      const { data } = await b2cSmartSearch(query.trim());
      if (data?.job_id) {
        setJob({ id: data.job_id, status: data.status, stats: data.stats });
        if (data.status === 'completed') {
          await fetchLeads(data.job_id);
        } else {
          pollJobStatus(data.job_id);
        }
      }
    } catch (err) {
      console.error('Smart search error:', err);
      showToast('Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const pollJobStatus = (jobId) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await getB2CJobStatus(jobId);
        setJob(prev => ({ ...prev, status: data.status, stats: data.stats }));
        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(pollRef.current);
          pollRef.current = null;
          if (data.status === 'completed') {
            await fetchLeads(jobId);
          } else {
            showToast('Job failed: ' + (data.error || 'Unknown error'));
          }
        }
      } catch {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }, 2000);
  };

  const fetchLeads = async (jobId) => {
    setLoading(true);
    try {
      const { data } = await getB2CJobLeads(jobId, { limit: 100, min_score: 0 });
      setLeads(data?.leads || []);
    } catch (err) {
      console.error('Fetch leads error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (lead) => {
    if (!job?.id) return;
    setImportingId(lead.id);
    try {
      await importB2CLead(job.id, lead.id);
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: 'imported', imported: true } : l));
      showToast(`${lead.owner_name} imported to CRM`);
    } catch (err) {
      showToast('Import failed');
    } finally {
      setImportingId(null);
    }
  };

  const handleImportAll = async () => {
    if (!job?.id) return;
    try {
      const { data } = await importAllB2CLeads(job.id);
      showToast(`${data?.imported || 0} leads imported to CRM`);
      await fetchLeads(job.id);
    } catch {
      showToast('Bulk import failed');
    }
  };

  const handleSkipTrace = async (lead) => {
    setTracingId(lead.id);
    try {
      await skipTraceB2CLead(lead.id);
      await fetchLeads(job.id);
      showToast(`Contact info found for ${lead.owner_name}`);
    } catch {
      showToast('Skip trace failed');
    } finally {
      setTracingId(null);
    }
  };

  const sorted = [...leads].sort((a, b) => {
    const aVal = a[sortBy] ?? 0;
    const bVal = b[sortBy] ?? 0;
    return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
  });

  const toggleSort = (field) => {
    if (sortBy === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortBy(field); setSortDir('desc'); }
  };

  const stats = job?.stats || {};
  const importableCount = leads.filter(l => !l.imported && l.status !== 'imported').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      {!embedded && (
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">B2C Leads</h1>
          <p className="text-sm text-gray-500 mt-1">Find homeowners near storm damage with aging roofs</p>
        </div>
        {quota && (
          <div className="text-xs text-gray-500">
            Today: {quota.jobs_today || 0} jobs, {quota.leads_today || 0} leads
          </div>
        )}
      </div>
      )}

      {/* Search */}
      <form onSubmit={handleSearch} className="bg-white rounded-xl shadow-sm border p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Describe the homeowners you want to find
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              className="border rounded-lg px-9 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
              placeholder='e.g. "Find homeowners in San Antonio with roofs older than 20 years near recent hail damage"'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
          <button
            type="submit"
            disabled={searching || !query.trim()}
            className="px-5 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors flex items-center gap-2 text-sm font-medium"
          >
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            Search
          </button>
        </div>
      </form>

      {/* Job Status */}
      {job && job.status !== 'completed' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
          <div>
            <div className="font-medium text-amber-800">Processing your search...</div>
            <div className="text-sm text-amber-600">
              {stats.properties_matched ? `${stats.properties_matched} properties matched` : 'Scanning storm data and property records'}
              {stats.scored ? ` | ${stats.scored} scored` : ''}
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      {job?.status === 'completed' && leads.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Properties Matched" value={stats.properties_matched || 0} color="bg-blue-100 text-blue-700" />
          <Stat label="Qualified Leads" value={stats.above_threshold || leads.length} color="bg-green-100 text-green-700" />
          <Stat label="Avg Score" value={Math.round(leads.reduce((s, l) => s + (l.lead_score || 0), 0) / leads.length)} color="bg-amber-100 text-amber-700" />
          <Stat label="Imported" value={leads.filter(l => l.imported || l.status === 'imported').length} color="bg-purple-100 text-purple-700" />
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      ) : leads.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {/* Toolbar */}
          <div className="px-4 py-3 border-b flex items-center justify-between bg-gray-50">
            <span className="text-sm text-gray-600">{leads.length} leads found</span>
            <div className="flex items-center gap-2">
              {importableCount > 0 && (
                <button
                  onClick={handleImportAll}
                  className="px-3 py-1.5 text-xs bg-amber-500 text-white rounded-lg hover:bg-amber-600 flex items-center gap-1"
                >
                  <Download className="h-3 w-3" /> Import All ({importableCount})
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <Th>Homeowner</Th>
                  <Th>Property</Th>
                  <SortTh field="lead_score" label="Score" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                  <SortTh field="storm_exposure_score" label="Storm" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                  <SortTh field="roof_age_estimate" label="Roof Age" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                  <Th>Contact</Th>
                  <Th>Status</Th>
                  <Th />
                </tr>
              </thead>
              <tbody className="divide-y">
                {sorted.map((lead) => (
                  <tr
                    key={lead.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedLead(lead)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{lead.owner_name}</div>
                      {lead.service_match && (
                        <span className="text-xs text-gray-500">{lead.service_match.replace(/_/g, ' ')}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-700">{lead.property_address}</div>
                      <div className="text-xs text-gray-500">{lead.property_city}, {lead.property_state} {lead.property_zip}</div>
                    </td>
                    <td className="px-4 py-3">
                      <ScoreBadge score={lead.lead_score} />
                    </td>
                    <td className="px-4 py-3">
                      {lead.storm_exposure_score > 0 ? (
                        <div className="flex items-center gap-1">
                          <CloudLightning className="h-3.5 w-3.5 text-amber-500" />
                          <span className="text-gray-700">{Math.round(lead.storm_exposure_score * 100)}%</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-700">{lead.roof_age_estimate ? `${lead.roof_age_estimate}yr` : '-'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {lead.phone && <Phone className="h-3.5 w-3.5 text-green-500" />}
                        {lead.email && <Mail className="h-3.5 w-3.5 text-blue-500" />}
                        {!lead.phone && !lead.email && <span className="text-gray-400 text-xs">None</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={lead.status} imported={lead.imported} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {!lead.imported && lead.status !== 'imported' && (
                          <button
                            onClick={() => handleImport(lead)}
                            disabled={importingId === lead.id}
                            className="px-2 py-1 text-xs bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-50"
                          >
                            {importingId === lead.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Import'}
                          </button>
                        )}
                        {!lead.phone && !lead.skip_traced && (
                          <button
                            onClick={() => handleSkipTrace(lead)}
                            disabled={tracingId === lead.id}
                            className="px-2 py-1 text-xs border rounded hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1"
                          >
                            {tracingId === lead.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserSearch className="h-3 w-3" />}
                            Trace
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : job?.status === 'completed' ? (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-500">
          No leads found matching your criteria. Try broadening your search area or adjusting filters.
        </div>
      ) : null}

      {/* Lead Detail Panel */}
      {selectedLead && (
        <LeadDetail
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onImport={handleImport}
          onSkipTrace={handleSkipTrace}
          importing={importingId === selectedLead.id}
          tracing={tracingId === selectedLead.id}
        />
      )}

      <Toast show={toast.show} onClose={() => setToast({ show: false, message: '' })}>
        {toast.message}
      </Toast>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div className="bg-white rounded-lg border p-3 text-center">
      <div className="text-xl font-bold text-gray-900">{value}</div>
      <div className={`text-xs mt-1 px-2 py-0.5 rounded-full inline-block ${color}`}>{label}</div>
    </div>
  );
}

function Th({ children }) {
  return <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">{children}</th>;
}

function SortTh({ field, label, sortBy, sortDir, onSort }) {
  const active = sortBy === field;
  return (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer hover:text-gray-900 select-none"
      onClick={() => onSort(field)}
    >
      <span className="flex items-center gap-1">
        {label}
        {active ? (sortDir === 'desc' ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
      </span>
    </th>
  );
}

function ScoreBadge({ score }) {
  const s = Math.round(score || 0);
  const color = s >= 80 ? 'bg-green-100 text-green-700' : s >= 60 ? 'bg-amber-100 text-amber-700' : s >= 40 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600';
  return <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${color}`}>{s}</span>;
}

function StatusBadge({ status, imported }) {
  if (imported || status === 'imported') return <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700">Imported</span>;
  if (status === 'contacted') return <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">Contacted</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">New</span>;
}

function LeadDetail({ lead, onClose, onImport, onSkipTrace, importing, tracing }) {
  const breakdown = lead.score_breakdown || {};

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white shadow-xl flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{lead.owner_name}</h2>
            <div className="text-sm text-gray-500 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {lead.property_address}, {lead.property_city}
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Score */}
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">{Math.round(lead.lead_score || 0)}</div>
              <div className="text-xs text-gray-500">Lead Score</div>
            </div>
            <StatusBadge status={lead.status} imported={lead.imported} />
          </div>

          {/* Score Breakdown */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Score Breakdown</h3>
            <div className="space-y-2">
              <ScoreBar label="Storm Exposure" value={breakdown.storm_exposure} weight="30%" />
              <ScoreBar label="Roof Age" value={breakdown.roof_age} weight="25%" />
              <ScoreBar label="Property Value" value={breakdown.property_value} weight="15%" />
              <ScoreBar label="Competition" value={breakdown.competitor_activity} weight="15%" />
              <ScoreBar label="Contact Info" value={breakdown.contact_available} weight="15%" />
            </div>
          </div>

          {/* Property Details */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Property</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Detail label="Year Built" value={lead.year_built} />
              <Detail label="Roof Age" value={lead.roof_age_estimate ? `${lead.roof_age_estimate} years` : '-'} />
              <Detail label="Assessed Value" value={lead.assessed_value ? `$${lead.assessed_value.toLocaleString()}` : '-'} />
              <Detail label="Roof Type" value={lead.roof_type || '-'} />
              <Detail label="Service Match" value={lead.service_match?.replace(/_/g, ' ') || '-'} />
              <Detail label="Days Since Storm" value={lead.days_since_last_storm ?? '-'} />
            </div>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Contact</h3>
            <div className="space-y-1.5 text-sm">
              {lead.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-green-500" />
                  <a href={`tel:${lead.phone}`} className="text-blue-600 hover:underline">{lead.phone}</a>
                </div>
              )}
              {lead.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-blue-500" />
                  <a href={`mailto:${lead.email}`} className="text-blue-600 hover:underline">{lead.email}</a>
                </div>
              )}
              {lead.mailing_address && (
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-700">{lead.mailing_address}</span>
                </div>
              )}
              {!lead.phone && !lead.email && (
                <div className="text-gray-400 text-sm">No contact info available</div>
              )}
            </div>
          </div>

          {/* Rationale */}
          {lead.scoring_rationale && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-1">Analysis</h3>
              <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{lead.scoring_rationale}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {!lead.imported && lead.status !== 'imported' && (
              <button
                onClick={() => onImport(lead)}
                disabled={importing}
                className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 flex items-center justify-center gap-2 text-sm font-medium"
              >
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Import to CRM
              </button>
            )}
            {lead.imported && (
              <div className="flex-1 px-4 py-2 bg-purple-50 text-purple-700 rounded-lg flex items-center justify-center gap-2 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4" /> Imported
              </div>
            )}
            {!lead.phone && !lead.skip_traced && (
              <button
                onClick={() => onSkipTrace(lead)}
                disabled={tracing}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2 text-sm"
              >
                {tracing ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserSearch className="h-4 w-4" />}
                Skip Trace
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ScoreBar({ label, value, weight }) {
  const pct = Math.round((value || 0) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="w-28 text-xs text-gray-600 flex-shrink-0">{label} <span className="text-gray-400">({weight})</span></div>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-amber-400 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-600 w-8 text-right">{pct}%</span>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-medium text-gray-900 capitalize">{value}</div>
    </div>
  );
}
