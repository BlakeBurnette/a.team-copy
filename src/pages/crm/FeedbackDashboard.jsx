import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getFeedbackDashboard } from '../../api/crm';
import {
  MessageSquare, Building2, Clock, DollarSign,
  AlertCircle, Users, Zap, ChevronRight, TrendingUp
} from 'lucide-react';

const CATEGORY_CONFIG = {
  pricing: { label: 'Pricing', icon: DollarSign, color: 'red' },
  timing: { label: 'Timing', icon: Clock, color: 'yellow' },
  features: { label: 'Features', icon: Zap, color: 'blue' },
  competition: { label: 'Competition', icon: Users, color: 'purple' },
  not_interested: { label: 'Not Interested', icon: AlertCircle, color: 'gray' },
  already_using: { label: 'Already Using', icon: Building2, color: 'green' },
  budget: { label: 'Budget', icon: DollarSign, color: 'orange' },
  other: { label: 'Other', icon: MessageSquare, color: 'gray' },
};

const colorClasses = {
  red: { bg: 'bg-red-50', text: 'text-red-600', badge: 'bg-red-100 text-red-700' },
  yellow: { bg: 'bg-yellow-50', text: 'text-yellow-600', badge: 'bg-yellow-100 text-yellow-700' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-600', badge: 'bg-blue-100 text-blue-700' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-600', badge: 'bg-purple-100 text-purple-700' },
  gray: { bg: 'bg-gray-50', text: 'text-gray-600', badge: 'bg-gray-100 text-gray-700' },
  green: { bg: 'bg-green-50', text: 'text-green-600', badge: 'bg-green-100 text-green-700' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-600', badge: 'bg-orange-100 text-orange-700' },
};

export default function FeedbackDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    loadDashboard();
  }, [days]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const { data: result } = await getFeedbackDashboard({ days });
      setData(result);
    } catch (err) {
      console.error('Failed to load feedback dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  const totalFeedback = data?.category_distribution?.reduce((sum, c) => sum + parseInt(c.count || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Feedback & Objections</h1>
          <p className="text-sm text-gray-500 mt-1">
            AI-powered insights from sales interactions
          </p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(parseInt(e.target.value))}
          className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <MessageSquare className="h-4 w-4" />
            Total Feedback
          </div>
          <div className="text-2xl font-bold text-gray-900">{totalFeedback}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <Building2 className="h-4 w-4" />
            Organizations
          </div>
          <div className="text-2xl font-bold text-gray-900">{data?.top_organizations?.length || 0}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <TrendingUp className="h-4 w-4" />
            Top Objection
          </div>
          <div className="text-lg font-bold text-gray-900">
            {data?.category_distribution?.[0]?.category
              ? CATEGORY_CONFIG[data.category_distribution[0].category]?.label
              : 'N/A'}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <Clock className="h-4 w-4" />
            Pending Analysis
          </div>
          <div className="text-2xl font-bold text-amber-600">{data?.pending_analysis_count || 0}</div>
        </div>
      </div>

      {/* Pending Analysis Alert */}
      {data?.pending_analysis_count > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
          <Clock className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <span className="text-amber-800">
            {data.pending_analysis_count} organization{data.pending_analysis_count > 1 ? 's have' : ' has'} new feedback pending AI analysis.
            Analysis runs every 30 minutes.
          </span>
        </div>
      )}

      {/* Category Distribution */}
      {data?.category_distribution?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Objection Categories</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {data.category_distribution.map((cat) => {
              const config = CATEGORY_CONFIG[cat.category] || CATEGORY_CONFIG.other;
              const colors = colorClasses[config.color] || colorClasses.gray;
              const Icon = config.icon;
              const percentage = totalFeedback > 0 ? Math.round((cat.count / totalFeedback) * 100) : 0;
              return (
                <div key={cat.category} className="p-4 border rounded-lg">
                  <div className={`inline-flex p-2 rounded-lg ${colors.bg} ${colors.text} mb-2`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{cat.count}</div>
                  <div className="text-sm text-gray-500">{config.label}</div>
                  <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${colors.bg.replace('50', '500')}`}
                      style={{ width: `${percentage}%`, backgroundColor: config.color === 'gray' ? '#9ca3af' : undefined }}
                    />
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{percentage}%</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Organizations */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Organizations with Most Feedback</h2>
          {data?.top_organizations?.length > 0 ? (
            <div className="space-y-3">
              {data.top_organizations.slice(0, 10).map((org) => (
                <Link
                  key={org.id}
                  to={`/app/crm/organizations?id=${org.id}`}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-gray-400" />
                    <div>
                      <div className="font-medium text-gray-900">{org.name}</div>
                      {org.analysis && (
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                            org.analysis.overall_sentiment === 'hot' ? 'bg-green-100 text-green-700' :
                            org.analysis.overall_sentiment === 'warm' ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {org.analysis.overall_sentiment || 'analyzing'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600">
                      {org.feedback_count} entries
                    </span>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              No feedback logged yet
            </div>
          )}
        </div>

        {/* Recent Feedback */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Recent Feedback</h2>
          {data?.recent_feedback?.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {data.recent_feedback.slice(0, 15).map((entry) => {
                const config = CATEGORY_CONFIG[entry.category] || CATEGORY_CONFIG.other;
                const colors = colorClasses[config.color] || colorClasses.gray;
                return (
                  <div key={entry.id} className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${colors.badge}`}>
                        {config.label}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(entry.occurred_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-900">{entry.notes || 'No notes'}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {entry.org_name && <span className="font-medium">{entry.org_name}</span>}
                      {entry.contact_name && entry.org_name && ' - '}
                      {entry.contact_name}
                      {entry.logged_by && <span className="text-gray-400"> by {entry.logged_by}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              No feedback logged yet
            </div>
          )}
        </div>
      </div>

      {/* Empty State */}
      {totalFeedback === 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Feedback Yet</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Start logging feedback during calls and emails on the Contacts page.
            The AI will analyze patterns and provide insights for each organization.
          </p>
        </div>
      )}
    </div>
  );
}
