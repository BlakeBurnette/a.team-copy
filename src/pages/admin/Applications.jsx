// src/pages/admin/Applications.jsx
// Admin page for viewing and managing job applications
import React, { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import {
  FileText,
  Download,
  ExternalLink,
  ChevronDown,
  Filter,
  X,
  Loader2,
  RefreshCw,
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Calendar,
  Link as LinkIcon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchApplications,
  updateApplicationStatus,
  getResumeDownloadUrl,
} from '../../api/applications';

const STATUS_OPTIONS = [
  { value: 'new', label: 'New', color: 'bg-blue-100 text-blue-700' },
  { value: 'reviewed', label: 'Reviewed', color: 'bg-amber-100 text-amber-700' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-700' },
  { value: 'hired', label: 'Hired', color: 'bg-emerald-100 text-emerald-700' },
];

const JOB_TITLES = [
  'Senior Full-Stack Engineer',
  'Customer Success Manager',
  'Sales Development Representative (Remote)',
  'Account Executive (Outbound, Early Stage)',
];

export default function Applications({ embedded }) {
  const { user, roles } = useAuth();
  const isAdmin = roles?.includes('admin') || user?.role === 'admin';

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [jobFilter, setJobFilter] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Mobile resume modal
  const [resumeModal, setResumeModal] = useState(null);
  const [resumeLoading, setResumeLoading] = useState(false);

  // Status dropdown
  const [openStatusDropdown, setOpenStatusDropdown] = useState(null);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (jobFilter) params.job_title = jobFilter;

      const data = await fetchApplications(params);
      setApplications(data.applications || data || []);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, jobFilter]);

  useEffect(() => {
    if (isAdmin) {
      loadApplications();
    }
  }, [isAdmin, loadApplications]);

  const handleStatusChange = async (appId, newStatus) => {
    try {
      await updateApplicationStatus(appId, { status: newStatus });
      setApplications((prev) =>
        prev.map((app) =>
          app.id === appId ? { ...app, status: newStatus } : app
        )
      );
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to update status');
    }
    setOpenStatusDropdown(null);
  };

  const handleViewResume = async (app) => {
    setResumeLoading(true);
    setResumeModal(app);
    try {
      const data = await getResumeDownloadUrl(app.id);
      const url = data.url || data.download_url;
      if (url) {
        // On mobile, show in modal. On desktop, open new tab.
        if (window.innerWidth < 768) {
          setResumeModal({ ...app, resumeUrl: url });
        } else {
          window.open(url, '_blank');
          setResumeModal(null);
        }
      }
    } catch (err) {
      alert('Failed to get resume URL');
      setResumeModal(null);
    } finally {
      setResumeLoading(false);
    }
  };

  const openResumeInNewTab = (url) => {
    window.open(url, '_blank');
  };

  const getStatusBadge = (status) => {
    const opt = STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0];
    return opt;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (!isAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      {!embedded && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
            <p className="text-gray-600 text-sm mt-1">
              Manage job applications
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile filter button */}
            <button
              onClick={() => setFiltersOpen(true)}
              className="md:hidden flex items-center gap-2 px-4 py-2 border rounded-lg text-sm"
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>

            {/* Refresh */}
            <button
              onClick={loadApplications}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      )}

      {/* Desktop Filters */}
      <div className="hidden md:flex items-center gap-4 mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        <select
          value={jobFilter}
          onChange={(e) => setJobFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">All Positions</option>
          {JOB_TITLES.map((j) => (
            <option key={j} value={j}>{j}</option>
          ))}
        </select>

        {(statusFilter || jobFilter) && (
          <button
            onClick={() => { setStatusFilter(''); setJobFilter(''); }}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      )}

      {/* Empty State */}
      {!loading && applications.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No applications</h3>
          <p className="text-gray-500 text-sm">
            {statusFilter || jobFilter
              ? 'No applications match your filters.'
              : 'Applications will appear here when candidates apply.'}
          </p>
        </div>
      )}

      {/* Desktop Table */}
      {!loading && applications.length > 0 && (
        <div className="hidden md:block bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Location</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Position</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Applied</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Resume</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {applications.map((app) => {
                const badge = getStatusBadge(app.status);
                return (
                  <tr key={app.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{app.name}</td>
                    <td className="px-4 py-3 text-gray-600">
                      <a href={`mailto:${app.email}`} className="hover:text-amber-600">
                        {app.email}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <a href={`tel:${app.phone}`} className="hover:text-amber-600">
                        {app.phone}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{app.location}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate" title={app.job_title}>
                      {app.job_title}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(app.created_at)}</td>
                    <td className="px-4 py-3 relative">
                      <button
                        onClick={() => setOpenStatusDropdown(openStatusDropdown === app.id ? null : app.id)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}
                      >
                        {badge.label}
                        <ChevronDown className="w-3 h-3" />
                      </button>

                      {openStatusDropdown === app.id && (
                        <div className="absolute z-10 mt-1 bg-white border rounded-lg shadow-lg py-1 min-w-[120px]">
                          {STATUS_OPTIONS.map((s) => (
                            <button
                              key={s.value}
                              onClick={() => handleStatusChange(app.id, s.value)}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                                app.status === s.value ? 'bg-gray-100' : ''
                              }`}
                            >
                              {s.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleViewResume(app)}
                        className="text-amber-600 hover:text-amber-700 flex items-center gap-1"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile Cards */}
      {!loading && applications.length > 0 && (
        <div className="md:hidden space-y-4">
          {applications.map((app) => {
            const badge = getStatusBadge(app.status);
            return (
              <div key={app.id} className="bg-white rounded-xl border p-4 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{app.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{app.job_title}</p>
                  </div>
                  <button
                    onClick={() => setOpenStatusDropdown(openStatusDropdown === app.id ? null : app.id)}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}
                  >
                    {badge.label}
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>

                {/* Status dropdown for mobile */}
                {openStatusDropdown === app.id && (
                  <div className="bg-gray-50 rounded-lg p-2 flex flex-wrap gap-2">
                    {STATUS_OPTIONS.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => handleStatusChange(app.id, s.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                          app.status === s.value ? s.color : 'bg-white border'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Details */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <a href={`mailto:${app.email}`} className="hover:text-amber-600 truncate">
                      {app.email}
                    </a>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <a href={`tel:${app.phone}`} className="hover:text-amber-600">
                      {app.phone}
                    </a>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span>{app.location}</span>
                  </div>
                  {app.linkedin_url && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <LinkIcon className="w-4 h-4 text-gray-400" />
                      <a
                        href={app.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-amber-600 truncate"
                      >
                        LinkedIn
                      </a>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>{formatDate(app.created_at)}</span>
                  </div>
                </div>

                {/* Resume button */}
                <button
                  onClick={() => handleViewResume(app)}
                  className="w-full py-2.5 bg-amber-50 text-amber-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  View Resume
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Mobile Filters Drawer */}
      {filtersOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setFiltersOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Filters</h3>
              <button onClick={() => setFiltersOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2.5 border rounded-lg"
              >
                <option value="">All Statuses</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Position</label>
              <select
                value={jobFilter}
                onChange={(e) => setJobFilter(e.target.value)}
                className="w-full px-3 py-2.5 border rounded-lg"
              >
                <option value="">All Positions</option>
                {JOB_TITLES.map((j) => (
                  <option key={j} value={j}>{j}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => { setStatusFilter(''); setJobFilter(''); }}
                className="flex-1 py-2.5 border rounded-lg text-sm"
              >
                Clear
              </button>
              <button
                onClick={() => setFiltersOpen(false)}
                className="flex-1 py-2.5 bg-amber-500 text-white rounded-lg text-sm font-medium"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Resume Modal */}
      {resumeModal && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setResumeModal(null)} />
          <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Resume - {resumeModal.name}</h3>
              <button onClick={() => setResumeModal(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {resumeLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : resumeModal.resumeUrl ? (
              <div className="space-y-3">
                <button
                  onClick={() => openResumeInNewTab(resumeModal.resumeUrl)}
                  className="w-full py-3 bg-amber-500 text-white rounded-xl font-medium flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-5 h-5" />
                  Open Resume
                </button>
                <a
                  href={resumeModal.resumeUrl}
                  download
                  className="w-full py-3 border rounded-xl font-medium flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Download Resume
                </a>
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">Failed to load resume</p>
            )}
          </div>
        </div>
      )}

      {/* Click outside to close status dropdown */}
      {openStatusDropdown && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setOpenStatusDropdown(null)}
        />
      )}
    </div>
  );
}
