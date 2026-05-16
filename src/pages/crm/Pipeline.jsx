import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useCrmAuth';
import { getPipelineContacts, getContact, updateContact, getOrganizations, getOrganization, updateOrganization, createTask, completeTask, getTasks, getActivities, createActivity } from '../../api/crm';
import {
  Search, LayoutGrid, List, Plus, Phone, MapPin, X, Check, User, Mail,
  PhoneCall, MessageSquare, Calendar, FileText, Clock, Building2, Users, ToggleLeft
} from 'lucide-react';
import Toast from '../../components/crm/Toast';
import KanbanBoard from '../../components/crm/sales/KanbanBoard';

const STAGES = [
  { value: 'prospect', label: 'Prospect', color: 'bg-gray-100 text-gray-700' },
  { value: 'qualified', label: 'Qualified', color: 'bg-blue-100 text-blue-700' },
  { value: 'proposal', label: 'Proposal', color: 'bg-purple-100 text-purple-700' },
  { value: 'negotiation', label: 'Negotiation', color: 'bg-amber-100 text-amber-700' },
  { value: 'customer', label: 'Customer', color: 'bg-green-100 text-green-700' },
  { value: 'churned', label: 'Churned', color: 'bg-red-100 text-red-700' },
];

export default function Pipeline() {
  const { user } = useAuth();
  const [view, setView] = useState('kanban');
  const [q, setQ] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [selectedItem, setSelectedItem] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '' });

  // Get pipeline mode from settings (contacts, organizations, or both)
  const pipelineMode = localStorage.getItem('pipelineMode') || 'contacts';

  useEffect(() => {
    fetchItems();
  }, [pipelineMode]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = { limit: 200 };
      if (q) params.q = q;
      if (stageFilter) params.stage = stageFilter;

      let allItems = [];

      // Fetch contacts if mode includes them
      if (pipelineMode === 'contacts' || pipelineMode === 'both') {
        const { data } = await getPipelineContacts(params);
        if (data?.items) {
          const transformed = data.items.map(c => ({
            ...c,
            name: [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email || 'Unknown',
            _type: 'contact',
          }));
          allItems = [...allItems, ...transformed];
        }
      }

      // Fetch organizations if mode includes them
      if (pipelineMode === 'organizations' || pipelineMode === 'both') {
        const { data } = await getOrganizations(params);
        if (data?.items) {
          const transformed = data.items.map(o => ({
            ...o,
            _type: 'organization',
          }));
          allItems = [...allItems, ...transformed];
        }
      }

      setItems(allItems);
      setTotal(allItems.length);
    } catch (err) {
      console.error('fetchItems error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchItems();
  };

  const handleUpdate = async (itemId, patch, itemType) => {
    try {
      const updateFn = itemType === 'organization' ? updateOrganization : updateContact;
      const { data } = await updateFn(itemId, patch);
      if (data?.ok) {
        showToast(`${itemType === 'organization' ? 'Organization' : 'Contact'} updated`);
        setItems((prev) => prev.map((c) => (c.id === itemId && c._type === itemType ? { ...c, ...patch } : c)));
        if (selectedItem?.id === itemId) {
          setSelectedItem((prev) => ({ ...prev, ...patch }));
        }
      }
    } catch (err) {
      showToast('Update failed');
    }
  };

  const loadItemDetails = async (item) => {
    try {
      if (item._type === 'organization') {
        const { data } = await getOrganization(item.id);
        if (data?.organization) {
          setSelectedItem({ ...data.organization, _type: 'organization' });
        }
      } else {
        const { data } = await getContact(item.id);
        if (data?.contact) {
          const c = data.contact;
          setSelectedItem({
            ...c,
            name: [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email || 'Unknown',
            _type: 'contact',
          });
        }
      }
    } catch (err) {
      console.error('loadItemDetails error:', err);
    }
  };

  const openItemDetail = (item) => {
    setSelectedItem(item);
    loadItemDetails(item);
  };

  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };

  // Stats by stage
  const stageCounts = STAGES.reduce((acc, s) => {
    acc[s.value] = items.filter((c) => (c.stage || 'prospect') === s.value).length;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>
      </div>

      {/* View Toggle */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center border rounded-lg overflow-hidden bg-white">
          <ViewButton active={view === 'kanban'} onClick={() => setView('kanban')} icon={LayoutGrid} label="Kanban" />
          <ViewButton active={view === 'list'} onClick={() => setView('list')} icon={List} label="List" />
        </div>
      </div>

      {/* Filters */}
      <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <input
            className="border rounded-lg px-9 py-2 w-64 focus:outline-none focus:ring-2 focus:ring-amber-400"
            placeholder="Search..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
        <select
          className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
        >
          <option value="">All Stages</option>
          {STAGES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <button
          type="submit"
          className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
        >
          Filter
        </button>
      </form>

      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {STAGES.map((s) => (
          <Stat key={s.value} label={s.label} value={stageCounts[s.value] || 0} color={s.color} />
        ))}
      </div>

      {/* Kanban View */}
      {view === 'kanban' && (
        <KanbanBoard
          items={items}
          onUpdateStage={(itemId, newStage, itemType) => handleUpdate(itemId, { stage: newStage }, itemType)}
          onCardClick={openItemDetail}
          loading={loading}
        />
      )}

      {/* List View */}
      {view === 'list' && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <Th>Contact</Th>
                  <Th>Stage</Th>
                  <Th>Phone</Th>
                  <Th>Email</Th>
                  <Th>Location</Th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">Loading...</td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">No items found</td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <ItemRow
                      key={`${item._type}-${item.id}`}
                      item={item}
                      onUpdate={(patch) => handleUpdate(item.id, patch, item._type)}
                      onClick={() => openItemDetail(item)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Item Detail Panel */}
      {selectedItem && (
        <ItemDetailPanel
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onUpdate={handleUpdate}
          showToast={showToast}
        />
      )}

      <Toast show={toast.show} onClose={() => setToast({ show: false, message: '' })}>
        {toast.message}
      </Toast>
    </div>
  );
}

function ViewButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 flex items-center gap-1.5 text-sm transition-colors border-l first:border-l-0 ${
        active ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
      }`}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function Th({ children }) {
  return <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">{children}</th>;
}

function Stat({ label, value, color }) {
  return (
    <div className="bg-white rounded-lg border p-3 text-center">
      <div className="text-xl font-bold text-gray-900">{value}</div>
      <div className={`text-xs mt-1 px-2 py-0.5 rounded-full inline-block ${color}`}>{label}</div>
    </div>
  );
}

function ItemRow({ item, onUpdate, onClick }) {
  const stage = STAGES.find((s) => s.value === item.stage) || STAGES[0];
  const isOrg = item._type === 'organization';

  return (
    <tr className="border-b hover:bg-gray-50 transition-colors cursor-pointer" onClick={onClick}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isOrg ? 'bg-blue-100' : 'bg-amber-100'}`}>
            {isOrg ? <Building2 className="h-5 w-5 text-blue-600" /> : <User className="h-5 w-5 text-amber-600" />}
          </div>
          <div>
            <div className="font-medium text-gray-900">{item.name}</div>
            <div className="flex items-center gap-2">
              {item.job_title && <span className="text-xs text-gray-500">{item.job_title}</span>}
              {isOrg && item.industry && <span className="text-xs text-gray-500">{item.industry}</span>}
              <span className={`text-xs px-1.5 py-0.5 rounded ${isOrg ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                {isOrg ? 'Org' : 'Contact'}
              </span>
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${stage.color}`}>
          {stage.label}
        </span>
      </td>
      <td className="px-4 py-3 text-sm">
        {item.phone ? (
          <a href={`tel:${item.phone}`} className="flex items-center gap-1 text-blue-600 hover:underline" onClick={(e) => e.stopPropagation()}>
            <Phone className="h-3 w-3" />
            {item.phone}
          </a>
        ) : '—'}
      </td>
      <td className="px-4 py-3 text-sm">
        {item.email ? (
          <a href={`mailto:${item.email}`} className="flex items-center gap-1 text-blue-600 hover:underline" onClick={(e) => e.stopPropagation()}>
            <Mail className="h-3 w-3" />
            {item.email}
          </a>
        ) : item.website ? (
          <a href={item.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline" onClick={(e) => e.stopPropagation()}>
            Website
          </a>
        ) : '—'}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">
        {item.city || item.state ? (
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {[item.city, item.state].filter(Boolean).join(', ')}
          </span>
        ) : '—'}
      </td>
    </tr>
  );
}

const ACTIVITY_TYPES = [
  { value: 'call', label: 'Call', icon: PhoneCall },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'meeting', label: 'Meeting', icon: Calendar },
  { value: 'note', label: 'Note', icon: FileText },
];

const CALL_OUTCOMES = [
  { value: 'connected', label: 'Connected' },
  { value: 'voicemail', label: 'Left Voicemail' },
  { value: 'no_answer', label: 'No Answer' },
  { value: 'busy', label: 'Busy' },
  { value: 'wrong_number', label: 'Wrong Number' },
];

const SENTIMENTS = [
  { value: 'positive', label: 'Positive', color: 'bg-green-100 text-green-700' },
  { value: 'neutral', label: 'Neutral', color: 'bg-gray-100 text-gray-700' },
  { value: 'negative', label: 'Negative', color: 'bg-red-100 text-red-700' },
];

const FEEDBACK_TAGS = [
  'Interested', 'Not Interested', 'Pricing Concern', 'Needs Follow-up',
  'Decision Maker', 'Gatekeeper', 'Competitor Mentioned', 'Budget Issue',
  'Timeline Issue', 'Requested Info', 'Ready to Buy',
];

function ItemDetailPanel({ item, onClose, onUpdate, showToast }) {
  const [activeTab, setActiveTab] = useState('details');
  const [tasks, setTasks] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [activityForm, setActivityForm] = useState({
    type: 'call',
    outcome: '',
    sentiment: '',
    tags: [],
    notes: '',
  });

  const isOrg = item._type === 'organization';

  useEffect(() => {
    if (item?.id) {
      fetchTasks();
      fetchActivities();
    }
  }, [item?.id, item?._type]);

  const fetchTasks = async () => {
    setLoadingTasks(true);
    try {
      const params = isOrg ? { organization_id: item.id, completed: false } : { contact_id: item.id, completed: false };
      const { data } = await getTasks(params);
      setTasks(data?.items || []);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoadingTasks(false);
    }
  };

  const fetchActivities = async () => {
    setLoadingActivities(true);
    try {
      const params = isOrg ? { organization_id: item.id, limit: 50 } : { contact_id: item.id, limit: 50 };
      const { data } = await getActivities(params);
      setActivities(data?.items || []);
    } catch (err) {
      console.error('Failed to load activities:', err);
    } finally {
      setLoadingActivities(false);
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    try {
      const taskData = { title: newTaskTitle };
      if (isOrg) {
        taskData.organization_id = item.id;
      } else {
        taskData.contact_id = item.id;
      }
      if (newTaskDueDate) {
        taskData.due_at = new Date(newTaskDueDate).toISOString();
      }
      await createTask(taskData);
      setNewTaskTitle('');
      setNewTaskDueDate('');
      setShowDatePicker(false);
      fetchTasks();
      showToast('Task created');
    } catch (err) {
      showToast('Failed to create task');
    }
  };

  const handleCompleteTask = async (taskId) => {
    try {
      await completeTask(taskId);
      fetchTasks();
      showToast('Task completed');
    } catch (err) {
      showToast('Failed to complete task');
    }
  };

  const handleLogActivity = async (e) => {
    e.preventDefault();
    try {
      const activityData = {
        type: activityForm.type,
        body: activityForm.notes,
        feedback: {
          category: activityForm.outcome || activityForm.type,
          notes: activityForm.notes,
        },
        metadata: {
          outcome: activityForm.outcome,
          sentiment: activityForm.sentiment,
          tags: activityForm.tags,
        },
      };
      if (isOrg) {
        activityData.organization_id = item.id;
      } else {
        activityData.contact_id = item.id;
      }
      await createActivity(activityData);
      setActivityForm({ type: 'call', outcome: '', sentiment: '', tags: [], notes: '' });
      setShowActivityForm(false);
      fetchActivities();
      showToast('Activity logged');
    } catch (err) {
      showToast('Failed to log activity');
    }
  };

  const toggleTag = (tag) => {
    setActivityForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  const getActivityIcon = (type) => {
    const found = ACTIVITY_TYPES.find((t) => t.value === type);
    return found ? found.icon : FileText;
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isOrg ? 'bg-blue-100' : 'bg-amber-100'}`}>
              {isOrg ? <Building2 className="h-5 w-5 text-blue-600" /> : <User className="h-5 w-5 text-amber-600" />}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{item.name}</h2>
              <div className="flex items-center gap-2">
                {item.job_title && <p className="text-sm text-gray-500">{item.job_title}</p>}
                {isOrg && item.industry && <p className="text-sm text-gray-500">{item.industry}</p>}
                <span className={`text-xs px-1.5 py-0.5 rounded ${isOrg ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                  {isOrg ? 'Organization' : 'Contact'}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b flex gap-4">
          {['details', 'activity', 'tasks'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 text-sm font-medium border-b-2 -mb-px capitalize ${
                activeTab === tab
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Stage */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
                <select
                  value={item.stage || 'prospect'}
                  onChange={(e) => onUpdate(item.id, { stage: e.target.value }, item._type)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {STAGES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              {/* Info */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                  {isOrg ? 'Organization Info' : 'Contact Info'}
                </h3>
                {item.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <a href={`mailto:${item.email}`} className="text-blue-600 hover:underline">{item.email}</a>
                  </div>
                )}
                {item.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <a href={`tel:${item.phone}`} className="text-blue-600 hover:underline">{item.phone}</a>
                  </div>
                )}
                {isOrg && item.website && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <a href={item.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{item.website}</a>
                  </div>
                )}
                {(item.city || item.state) && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span>{[item.address, item.city, item.state, item.zip].filter(Boolean).join(', ')}</span>
                  </div>
                )}
              </div>

              {/* Notes */}
              {item.notes && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Notes</h3>
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{item.notes}</p>
                </div>
              )}

              {/* Metadata */}
              <div className="pt-4 border-t text-xs text-gray-500 space-y-1">
                <div>Created: {new Date(item.created_at).toLocaleString()}</div>
                {item.updated_at && <div>Updated: {new Date(item.updated_at).toLocaleString()}</div>}
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-4">
              {/* Log Activity Button */}
              {!showActivityForm ? (
                <button
                  onClick={() => setShowActivityForm(true)}
                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-amber-400 hover:text-amber-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Log Activity
                </button>
              ) : (
                <form onSubmit={handleLogActivity} className="bg-gray-50 rounded-lg p-4 space-y-4">
                  {/* Activity Type */}
                  <div className="flex gap-2">
                    {ACTIVITY_TYPES.map((type) => {
                      const Icon = type.icon;
                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setActivityForm((prev) => ({ ...prev, type: type.value }))}
                          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${
                            activityForm.type === type.value
                              ? 'bg-amber-500 text-white'
                              : 'bg-white border text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {type.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Outcome (for calls) */}
                  {activityForm.type === 'call' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Outcome</label>
                      <select
                        value={activityForm.outcome}
                        onChange={(e) => setActivityForm((prev) => ({ ...prev, outcome: e.target.value }))}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                      >
                        <option value="">Select outcome...</option>
                        {CALL_OUTCOMES.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Sentiment */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Sentiment</label>
                    <div className="flex gap-2">
                      {SENTIMENTS.map((s) => (
                        <button
                          key={s.value}
                          type="button"
                          onClick={() => setActivityForm((prev) => ({ ...prev, sentiment: s.value }))}
                          className={`flex-1 py-1.5 px-3 rounded-lg text-sm font-medium transition-colors ${
                            activityForm.sentiment === s.value
                              ? s.color + ' ring-2 ring-offset-1 ring-gray-400'
                              : 'bg-white border text-gray-600'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Tags</label>
                    <div className="flex flex-wrap gap-1.5">
                      {FEEDBACK_TAGS.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                            activityForm.tags.includes(tag)
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-white border text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                    <textarea
                      value={activityForm.notes}
                      onChange={(e) => setActivityForm((prev) => ({ ...prev, notes: e.target.value }))}
                      placeholder="What was discussed? Any key takeaways?"
                      rows={3}
                      className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowActivityForm(false)}
                      className="flex-1 py-2 border rounded-lg text-gray-600 hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
                    >
                      Log Activity
                    </button>
                  </div>
                </form>
              )}

              {/* Activity Timeline */}
              {loadingActivities ? (
                <div className="text-sm text-gray-500 text-center py-4">Loading activities...</div>
              ) : activities.length > 0 ? (
                <div className="space-y-3">
                  {activities.map((activity) => {
                    const Icon = getActivityIcon(activity.type);
                    const meta = activity.metadata || {};
                    return (
                      <div key={activity.id} className="flex gap-3 p-3 bg-white border rounded-lg">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Icon className="h-4 w-4 text-gray-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium capitalize">{activity.type}</span>
                            {meta.outcome && (
                              <span className="text-gray-500">- {meta.outcome.replace('_', ' ')}</span>
                            )}
                            {meta.sentiment && (
                              <span className={`px-1.5 py-0.5 rounded text-xs ${
                                SENTIMENTS.find((s) => s.value === meta.sentiment)?.color || ''
                              }`}>
                                {meta.sentiment}
                              </span>
                            )}
                          </div>
                          {activity.body && (
                            <p className="text-sm text-gray-600 mt-1">{activity.body}</p>
                          )}
                          {meta.tags?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {meta.tags.map((tag) => (
                                <span key={tag} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                            <Clock className="h-3 w-3" />
                            {new Date(activity.occurred_at || activity.created_at).toLocaleString()}
                            {activity.user_name && <span>by {activity.user_name}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-gray-400 text-center py-8">No activities logged yet</div>
              )}
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="space-y-4">
              <form onSubmit={handleAddTask} className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Add a task..."
                    className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDatePicker(!showDatePicker)}
                    className={`px-3 py-2 border rounded-lg hover:bg-gray-50 text-sm ${
                      newTaskDueDate ? 'text-amber-600 border-amber-300 bg-amber-50' : 'text-gray-500'
                    }`}
                    title="Set due date"
                  >
                    <Calendar className="h-4 w-4" />
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 text-sm"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                {showDatePicker && (
                  <div className="flex items-center gap-2 pl-1">
                    <input
                      type="date"
                      value={newTaskDueDate}
                      onChange={(e) => setNewTaskDueDate(e.target.value)}
                      className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    {newTaskDueDate && (
                      <button
                        type="button"
                        onClick={() => { setNewTaskDueDate(''); setShowDatePicker(false); }}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                )}
              </form>

              {loadingTasks ? (
                <div className="text-sm text-gray-500 text-center py-4">Loading tasks...</div>
              ) : tasks.length > 0 ? (
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <button
                        onClick={() => handleCompleteTask(task.id)}
                        className="p-1 hover:bg-green-100 rounded text-gray-400 hover:text-green-600"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <span className="text-sm flex-1">{task.title}</span>
                      {task.due_at && (
                        <span className="text-xs text-gray-400">
                          {new Date(task.due_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-400 text-center py-8">No pending tasks</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
