import React, { useEffect, useState } from 'react';
import { getTasks, createTask, updateTask, deleteTask } from '../../api/crm';
import { Search, Plus, Check, Clock, Calendar, Trash2, X, Filter, ArrowUpDown } from 'lucide-react';
import Toast from '../../components/crm/Toast';

const TASK_TYPES = ['todo', 'call', 'email', 'meeting'];
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];

const SORT_OPTIONS = [
  { value: 'due_at:asc', label: 'Due Date (earliest first)' },
  { value: 'due_at:desc', label: 'Due Date (latest first)' },
  { value: 'created_at:desc', label: 'Newest First' },
  { value: 'created_at:asc', label: 'Oldest First' },
  { value: 'priority:asc', label: 'Priority (urgent first)' },
  { value: 'priority:desc', label: 'Priority (low first)' },
];

export default function CrmTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // pending, completed, all
  const [sortBy, setSortBy] = useState('due_at:asc');
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '' });

  useEffect(() => {
    fetchTasks();
  }, [filter, sortBy]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const [sort, order] = sortBy.split(':');
      const params = { limit: 100, mine: true, sort, order };
      if (filter === 'pending') params.completed = false;
      if (filter === 'completed') params.completed = true;

      const { data } = await getTasks(params);
      if (data?.items) {
        setTasks(data.items);
      }
    } catch (err) {
      console.error('fetchTasks error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (formData) => {
    try {
      const { data } = await createTask(formData);
      if (data?.ok) {
        showToast('Task created');
        fetchTasks();
        setShowForm(false);
      }
    } catch (err) {
      showToast('Failed to create task');
    }
  };

  const handleToggleComplete = async (task) => {
    try {
      await updateTask(task.id, { completed: !task.completed_at });
      fetchTasks();
    } catch (err) {
      showToast('Failed to update task');
    }
  };

  const handleDelete = async (taskId) => {
    if (!confirm('Delete this task?')) return;
    try {
      await deleteTask(taskId);
      showToast('Task deleted');
      fetchTasks();
    } catch (err) {
      showToast('Failed to delete task');
    }
  };

  const handleReschedule = async (taskId, newDate) => {
    try {
      await updateTask(taskId, { due_at: new Date(newDate).toISOString() });
      showToast('Task rescheduled');
      fetchTasks();
    } catch (err) {
      showToast('Failed to reschedule task');
    }
  };

  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };

  const groupedTasks = groupTasksByDate(tasks);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> Add Task
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <FilterButton active={filter === 'pending'} onClick={() => setFilter('pending')}>
            Pending
          </FilterButton>
          <FilterButton active={filter === 'completed'} onClick={() => setFilter('completed')}>
            Completed
          </FilterButton>
          <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>
            All
          </FilterButton>
        </div>
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-gray-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tasks List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-500">
          No tasks found
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedTasks).map(([dateLabel, dateTasks]) => (
            <div key={dateLabel}>
              <h3 className="text-sm font-medium text-gray-500 mb-2">{dateLabel}</h3>
              <div className="bg-white rounded-xl shadow-sm border divide-y">
                {dateTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onToggle={() => handleToggleComplete(task)}
                    onEdit={() => setEditingTask(task)}
                    onDelete={() => handleDelete(task.id)}
                    onReschedule={handleReschedule}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showForm && (
        <TaskFormModal
          onClose={() => setShowForm(false)}
          onSubmit={handleCreate}
        />
      )}

      {/* Edit Modal */}
      {editingTask && (
        <TaskFormModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSubmit={async (data) => {
            try {
              await updateTask(editingTask.id, data);
              showToast('Task updated');
              fetchTasks();
              setEditingTask(null);
            } catch (err) {
              showToast('Failed to update task');
            }
          }}
        />
      )}

      <Toast show={toast.show} onClose={() => setToast({ show: false, message: '' })}>
        {toast.message}
      </Toast>
    </div>
  );
}

function FilterButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        active ? 'bg-amber-500 text-white' : 'bg-white border hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  );
}

function TaskRow({ task, onToggle, onEdit, onDelete, onReschedule }) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const isOverdue = !task.completed_at && task.due_at && new Date(task.due_at) < new Date();

  const handleDateChange = (e) => {
    const newDate = e.target.value;
    if (newDate) {
      onReschedule(task.id, newDate);
    }
    setShowDatePicker(false);
  };

  return (
    <div className={`flex items-center gap-4 p-4 ${task.completed_at ? 'bg-gray-50' : ''}`}>
      <button
        onClick={onToggle}
        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
          task.completed_at
            ? 'bg-green-500 border-green-500 text-white'
            : 'border-gray-300 hover:border-amber-500'
        }`}
      >
        {task.completed_at && <Check className="h-4 w-4" />}
      </button>

      <div className="flex-1 min-w-0" onClick={onEdit}>
        <div className={`font-medium cursor-pointer ${task.completed_at ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
          {task.title}
        </div>
        <div className="flex items-center gap-3 mt-1 text-sm">
          {task.type && (
            <span className="text-gray-500 capitalize">{task.type}</span>
          )}
          {task.due_at && (
            <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500' : 'text-gray-500'}`}>
              <Calendar className="h-3 w-3" />
              {formatDueDate(task.due_at)}
            </span>
          )}
          {task.lead_name && (
            <span className="text-blue-600">{task.lead_name}</span>
          )}
        </div>
      </div>

      <PriorityBadge priority={task.priority} />

      {/* Reschedule button */}
      <div className="relative">
        <button
          onClick={() => setShowDatePicker(!showDatePicker)}
          className="p-2 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded"
          title="Reschedule"
        >
          <Calendar className="h-4 w-4" />
        </button>
        {showDatePicker && (
          <div className="absolute right-0 top-full mt-1 z-10 bg-white border rounded-lg shadow-lg p-2">
            <input
              type="date"
              defaultValue={task.due_at ? task.due_at.slice(0, 10) : ''}
              onChange={handleDateChange}
              className="border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              autoFocus
              onBlur={() => setTimeout(() => setShowDatePicker(false), 150)}
            />
          </div>
        )}
      </div>

      <button
        onClick={onDelete}
        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
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
      {priority || 'normal'}
    </span>
  );
}

function TaskFormModal({ task, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    title: task?.title || '',
    type: task?.type || 'todo',
    priority: task?.priority || 'normal',
    due_at: task?.due_at ? task.due_at.slice(0, 16) : '',
    notes: task?.notes || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            {task ? 'Edit Task' : 'New Task'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {TASK_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
            <div className="flex gap-2 mb-2">
              <QuickDateButton
                label="Today"
                onClick={() => {
                  const today = new Date();
                  today.setHours(17, 0, 0, 0);
                  setFormData({ ...formData, due_at: formatDateTimeLocal(today) });
                }}
                active={isToday(formData.due_at)}
              />
              <QuickDateButton
                label="Tomorrow"
                onClick={() => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  tomorrow.setHours(17, 0, 0, 0);
                  setFormData({ ...formData, due_at: formatDateTimeLocal(tomorrow) });
                }}
                active={isTomorrow(formData.due_at)}
              />
              <QuickDateButton
                label="Next Week"
                onClick={() => {
                  const nextWeek = new Date();
                  nextWeek.setDate(nextWeek.getDate() + 7);
                  nextWeek.setHours(17, 0, 0, 0);
                  setFormData({ ...formData, due_at: formatDateTimeLocal(nextWeek) });
                }}
                active={isNextWeek(formData.due_at)}
              />
            </div>
            <input
              type="datetime-local"
              value={formData.due_at}
              onChange={(e) => setFormData({ ...formData, due_at: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
            >
              {task ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function groupTasksByDate(tasks) {
  const groups = {
    Overdue: [],
    Today: [],
    Tomorrow: [],
    'This Week': [],
    Later: [],
    'No Date': [],
  };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  tasks.forEach((task) => {
    if (!task.due_at) {
      groups['No Date'].push(task);
      return;
    }

    const due = new Date(task.due_at);
    const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());

    if (!task.completed_at && dueDay < today) {
      groups.Overdue.push(task);
    } else if (dueDay.getTime() === today.getTime()) {
      groups.Today.push(task);
    } else if (dueDay.getTime() === tomorrow.getTime()) {
      groups.Tomorrow.push(task);
    } else if (dueDay < nextWeek) {
      groups['This Week'].push(task);
    } else {
      groups.Later.push(task);
    }
  });

  // Remove empty groups
  return Object.fromEntries(
    Object.entries(groups).filter(([_, tasks]) => tasks.length > 0)
  );
}

function formatDueDate(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((due - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Overdue';
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  return date.toLocaleDateString();
}

function formatDateTimeLocal(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function isToday(dateStr) {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const today = new Date();
  return date.getFullYear() === today.getFullYear() &&
         date.getMonth() === today.getMonth() &&
         date.getDate() === today.getDate();
}

function isTomorrow(dateStr) {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return date.getFullYear() === tomorrow.getFullYear() &&
         date.getMonth() === tomorrow.getMonth() &&
         date.getDate() === tomorrow.getDate();
}

function isNextWeek(dateStr) {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  return date.getFullYear() === nextWeek.getFullYear() &&
         date.getMonth() === nextWeek.getMonth() &&
         date.getDate() === nextWeek.getDate();
}

function QuickDateButton({ label, onClick, active }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
        active
          ? 'bg-amber-500 text-white border-amber-500'
          : 'bg-white text-gray-600 hover:bg-gray-50'
      }`}
    >
      {label}
    </button>
  );
}
