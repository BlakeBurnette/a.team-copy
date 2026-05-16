import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getLeads, getTasks } from '../../api/crm';
import { Target, Users, Building2, CheckSquare, TrendingUp, Clock, CalendarCheck } from 'lucide-react';

export default function CrmDashboard() {
  const [stats, setStats] = useState({
    leads: { total: 0, open: 0, won: 0 },
    tasks: { pending: 0, overdue: 0, today: 0 },
  });
  const [recentLeads, setRecentLeads] = useState([]);
  const [upcomingTasks, setUpcomingTasks] = useState([]);
  const [todaysTasks, setTodaysTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [leadsRes, tasksRes] = await Promise.all([
        getLeads({ limit: 5, mine: true }),
        getTasks({ limit: 5, mine: true }),
      ]);

      if (leadsRes.data?.items) {
        setRecentLeads(leadsRes.data.items);
        const items = leadsRes.data.items;
        setStats((prev) => ({
          ...prev,
          leads: {
            total: leadsRes.data.total || items.length,
            open: items.filter((l) => l.status === 'open').length,
            won: items.filter((l) => l.status === 'won').length,
          },
        }));
      }

      if (tasksRes.data?.items) {
        setUpcomingTasks(tasksRes.data.items);
        const items = tasksRes.data.items;
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Filter tasks due today
        const dueToday = items.filter((t) => {
          if (t.completed_at || !t.due_at) return false;
          const dueDate = new Date(t.due_at);
          return dueDate >= today && dueDate < tomorrow;
        });
        setTodaysTasks(dueToday);

        setStats((prev) => ({
          ...prev,
          tasks: {
            pending: items.filter((t) => !t.completed_at).length,
            overdue: items.filter((t) => !t.completed_at && t.due_at && new Date(t.due_at) < now).length,
            today: dueToday.length,
          },
        }));
      }
    } catch (err) {
      console.error('Dashboard load error:', err);
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          icon={Target}
          label="Open Leads"
          value={stats.leads.open}
          color="yellow"
          to="/app/crm/pipeline"
        />
        <StatCard
          icon={TrendingUp}
          label="Won Deals"
          value={stats.leads.won}
          color="green"
          to="/app/crm/pipeline?status=won"
        />
        <StatCard
          icon={CalendarCheck}
          label="Due Today"
          value={stats.tasks.today}
          color="purple"
          to="/app/crm/tasks"
        />
        <StatCard
          icon={CheckSquare}
          label="Pending Tasks"
          value={stats.tasks.pending}
          color="blue"
          to="/app/crm/tasks"
        />
        <StatCard
          icon={Clock}
          label="Overdue"
          value={stats.tasks.overdue}
          color="red"
          to="/app/crm/tasks?overdue=1"
        />
      </div>

      {/* Today's Tasks - Full Width when tasks exist */}
      {todaysTasks.length > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl shadow-sm border border-purple-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-purple-600" />
              <h2 className="font-semibold text-gray-900">Today's Tasks</h2>
              <span className="bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full">
                {todaysTasks.length}
              </span>
            </div>
            <Link to="/app/crm/tasks" className="text-sm text-purple-600 hover:text-purple-700">
              View all tasks
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {todaysTasks.map((task) => (
              <div key={task.id} className="bg-white rounded-lg p-3 border border-purple-100 shadow-sm">
                <div className="font-medium text-gray-900 truncate">{task.title}</div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-purple-600">
                    {task.due_at ? new Date(task.due_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'All day'}
                  </span>
                  <PriorityBadge priority={task.priority} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Leads */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Recent Leads</h2>
            <Link to="/app/crm/pipeline" className="text-sm text-amber-600 hover:text-amber-700">
              View all
            </Link>
          </div>
          {recentLeads.length === 0 ? (
            <p className="text-gray-500 text-sm">No leads yet</p>
          ) : (
            <div className="space-y-3">
              {recentLeads.map((lead) => (
                <div key={lead.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <div className="font-medium text-gray-900">{lead.name || lead.email}</div>
                    <div className="text-sm text-gray-500">{lead.company || 'No company'}</div>
                  </div>
                  <StageBadge stage={lead.stage} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Tasks */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Upcoming Tasks</h2>
            <Link to="/app/crm/tasks" className="text-sm text-amber-600 hover:text-amber-700">
              View all
            </Link>
          </div>
          {upcomingTasks.length === 0 ? (
            <p className="text-gray-500 text-sm">No pending tasks</p>
          ) : (
            <div className="space-y-3">
              {upcomingTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <div className="font-medium text-gray-900">{task.title}</div>
                    <div className="text-sm text-gray-500">
                      {task.due_at ? formatDate(task.due_at) : 'No due date'}
                    </div>
                  </div>
                  <PriorityBadge priority={task.priority} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/app/crm/pipeline"
            className="px-4 py-2 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors"
          >
            View Pipeline
          </Link>
          <Link
            to="/app/crm/scraper"
            className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
          >
            Find New Leads
          </Link>
          <Link
            to="/app/crm/contacts"
            className="px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
          >
            Manage Contacts
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, to }) {
  const colors = {
    yellow: 'bg-amber-50 text-amber-600',
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <Link to={to} className="bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colors[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-bold text-gray-900">{value}</div>
          <div className="text-sm text-gray-500">{label}</div>
        </div>
      </div>
    </Link>
  );
}

function StageBadge({ stage }) {
  const colors = {
    new: 'bg-gray-100 text-gray-700',
    contacted: 'bg-blue-100 text-blue-700',
    qualified: 'bg-purple-100 text-purple-700',
    proposal: 'bg-yellow-100 text-yellow-700',
    negotiation: 'bg-orange-100 text-orange-700',
    closed: 'bg-green-100 text-green-700',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[stage] || colors.new}`}>
      {stage}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const colors = {
    low: 'bg-gray-100 text-gray-600',
    normal: 'bg-blue-100 text-blue-600',
    high: 'bg-orange-100 text-orange-600',
    urgent: 'bg-red-100 text-red-600',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[priority] || colors.normal}`}>
      {priority}
    </span>
  );
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.ceil((date - now) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Overdue';
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  return date.toLocaleDateString();
}
