import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useCrmAuth';
import { getMonthlyScraperStatus, getMonthlyScraperLeads, runMonthlyScraper } from '../../api/crm';
import {
  Database,
  Play,
  Loader2,
  MapPin,
  Phone,
  ExternalLink,
  Download,
  RefreshCw,
  Calendar,
  TrendingUp,
  Building2,
  Star,
  Search,
  Filter,
  ChevronDown,
  AlertTriangle,
} from 'lucide-react';
import Toast from '../../components/crm/Toast';

const STATES = [
  { code: 'ALL', name: 'All States' },
  { code: 'CO', name: 'Colorado' },
  { code: 'DE', name: 'Delaware' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'ME', name: 'Maine' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'VT', name: 'Vermont' },
  { code: 'WY', name: 'Wyoming' },
];

const SOURCES = [
  { value: 'all', label: 'All Sources' },
  { value: 'google_places', label: 'Google Places' },
  { value: 'yelp', label: 'Yelp' },
];

export default function NightlyLeads({ embedded }) {
  const { isInternalAdmin } = useAuth();
  const [status, setStatus] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '' });

  // Filters
  const [stateFilter, setStateFilter] = useState('ALL');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [industryFilter, setIndustryFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [importedFilter, setImportedFilter] = useState('all'); // all, imported, not_imported

  useEffect(() => {
    if (isInternalAdmin) {
      fetchStatus();
      fetchLeads();
    }
  }, [isInternalAdmin]);

  const fetchStatus = async () => {
    try {
      const { data } = await getMonthlyScraperStatus();
      setStatus(data);
    } catch (err) {
      console.error('Failed to fetch status:', err);
      showToast('Failed to load scraper status');
    }
  };

  const fetchLeads = async () => {
    setLeadsLoading(true);
    try {
      const { data } = await getMonthlyScraperLeads();
      setLeads(data?.leads || []);
    } catch (err) {
      console.error('Failed to fetch leads:', err);
      showToast('Failed to load leads');
    } finally {
      setLeadsLoading(false);
      setLoading(false);
    }
  };

  const handleRunScraper = async () => {
    if (running) return;
    setRunning(true);
    try {
      await runMonthlyScraper();
      showToast('Scraper started successfully');
      // Refresh status after a delay
      setTimeout(() => {
        fetchStatus();
        fetchLeads();
      }, 5000);
    } catch (err) {
      console.error('Failed to run scraper:', err);
      showToast(err.response?.data?.detail || 'Failed to start scraper');
    } finally {
      setRunning(false);
    }
  };

  const handleExport = () => {
    const filtered = getFilteredLeads();
    const csv = convertToCSV(filtered);
    downloadCSV(csv, `nightly-leads-${new Date().toISOString().split('T')[0]}.csv`);
    showToast(`Exported ${filtered.length} leads`);
  };

  const convertToCSV = (data) => {
    if (data.length === 0) return '';
    const headers = ['Business Name', 'Phone', 'Website', 'Address', 'City', 'State', 'Industry', 'Rating', 'Reviews', 'Source'];
    const rows = data.map(lead => [
      lead.business_name || '',
      lead.phone || '',
      lead.website || '',
      lead.address || '',
      lead.city || '',
      lead.state_code || '',
      lead.industry || '',
      lead.rating || '',
      lead.review_count || '',
      lead.source || '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    return [headers.join(','), ...rows].join('\n');
  };

  const downloadCSV = (csv, filename) => {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };

  const getFilteredLeads = () => {
    return leads.filter(lead => {
      if (stateFilter !== 'ALL' && lead.state_code !== stateFilter) return false;
      if (sourceFilter !== 'all' && lead.source !== sourceFilter) return false;
      if (industryFilter && !lead.industry?.toLowerCase().includes(industryFilter.toLowerCase())) return false;
      if (importedFilter === 'imported' && !lead.imported) return false;
      if (importedFilter === 'not_imported' && lead.imported) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches =
          lead.business_name?.toLowerCase().includes(q) ||
          lead.phone?.includes(q) ||
          lead.city?.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  };

  // Get unique industries for filter
  const industries = [...new Set(leads.map(l => l.industry).filter(Boolean))].sort();

  if (!isInternalAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
          <p className="text-gray-500 mt-2">This page is only available to platform administrators.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  const filteredLeads = getFilteredLeads();
  const googleUsage = status?.api_usage?.find(u => u.source === 'google_places');
  const yelpUsage = status?.api_usage?.find(u => u.source === 'yelp');

  return (
    <div className="space-y-6">
      {/* Header */}
      {!embedded && (
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nightly Scraper Leads</h1>
            <p className="text-gray-500 mt-1">Monthly automated lead scraping from Google Places & Yelp</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { fetchStatus(); fetchLeads(); }}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button
              onClick={handleRunScraper}
              disabled={running}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
            >
              {running ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Run Scraper
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Leads */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-gray-500">Total Leads</div>
            <Database className="h-5 w-5 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900">
            {leads.length.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {leads.filter(l => l.imported).length.toLocaleString()} imported
          </div>
        </div>

        {/* Google Places Quota */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-gray-500">Google Places</div>
            <TrendingUp className="h-5 w-5 text-blue-500" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-gray-900">
              {googleUsage?.remaining?.toLocaleString() || '10,000'}
            </div>
            <div className="text-xs text-gray-500">remaining of 10K</div>
          </div>
          <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500"
              style={{ width: `${((googleUsage?.calls_used || 0) / 10000) * 100}%` }}
            />
          </div>
        </div>

        {/* Yelp Quota */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-gray-500">Yelp API</div>
            <TrendingUp className="h-5 w-5 text-red-500" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-gray-900">
              {yelpUsage?.remaining?.toLocaleString() || '5,000'}
            </div>
            <div className="text-xs text-gray-500">remaining of 5K</div>
          </div>
          <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-500"
              style={{ width: `${((yelpUsage?.calls_used || 0) / 5000) * 100}%` }}
            />
          </div>
        </div>

        {/* Next Run */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-gray-500">Scheduled Run</div>
            <Calendar className="h-5 w-5 text-green-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900">5th</div>
          <div className="text-xs text-gray-500">of each month</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search business, phone, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 border rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* State Filter */}
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            {STATES.map(s => (
              <option key={s.code} value={s.code}>{s.name}</option>
            ))}
          </select>

          {/* Source Filter */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            {SOURCES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          {/* Industry Filter */}
          <select
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value)}
            className="px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">All Industries</option>
            {industries.map(i => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>

          {/* Imported Filter */}
          <select
            value={importedFilter}
            onChange={(e) => setImportedFilter(e.target.value)}
            className="px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">All Status</option>
            <option value="not_imported">Not Imported</option>
            <option value="imported">Imported</option>
          </select>

          <div className="flex-1" />

          {/* Export */}
          <button
            onClick={handleExport}
            className="px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50 flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>

        <div className="mt-3 text-sm text-gray-500">
          Showing {filteredLeads.length.toLocaleString()} of {leads.length.toLocaleString()} leads
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        {leadsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No leads found matching your filters
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Business</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Industry</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLeads.slice(0, 100).map((lead, idx) => (
                  <tr key={lead.id || idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="font-medium text-gray-900 truncate max-w-xs">
                            {lead.business_name || 'Unknown'}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-500">
                            {lead.phone && (
                              <a href={`tel:${lead.phone}`} className="flex items-center gap-1 hover:text-amber-600">
                                <Phone className="h-3 w-3" />
                                {lead.phone}
                              </a>
                            )}
                            {lead.website && (
                              <a href={lead.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-amber-600">
                                <ExternalLink className="h-3 w-3" />
                                Website
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <MapPin className="h-3 w-3 text-gray-400" />
                        {lead.city}, {lead.state_code}
                      </div>
                      {lead.address && (
                        <div className="text-xs text-gray-400 truncate max-w-xs">{lead.address}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {lead.industry || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {lead.rating ? (
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                          <span className="text-sm font-medium">{lead.rating}</span>
                          <span className="text-xs text-gray-400">({lead.review_count || 0})</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        lead.source === 'google_places'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {lead.source === 'google_places' ? 'Google' : 'Yelp'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {lead.imported ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          Imported
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          Available
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredLeads.length > 100 && (
              <div className="px-4 py-3 bg-gray-50 text-center text-sm text-gray-500">
                Showing first 100 of {filteredLeads.length.toLocaleString()} leads. Use filters or export to see all.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recent Runs */}
      {status?.recent_runs?.length > 0 && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50">
            <h3 className="font-medium text-gray-900">Recent Scraper Runs</h3>
          </div>
          <div className="divide-y">
            {status.recent_runs.slice(0, 10).map((run, idx) => (
              <div key={idx} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    run.source === 'google_places'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {run.source === 'google_places' ? 'Google' : 'Yelp'}
                  </span>
                  <span className="text-sm text-gray-900">{run.state}</span>
                  <span className="text-sm text-gray-500">{run.industry}</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-600">{run.leads_saved} leads</span>
                  <span className="text-gray-400">{run.api_calls} API calls</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    run.status === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {run.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Toast show={toast.show} onClose={() => setToast({ show: false, message: '' })}>
        {toast.message}
      </Toast>
    </div>
  );
}
