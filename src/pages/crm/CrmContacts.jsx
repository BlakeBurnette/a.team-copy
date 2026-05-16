import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getContacts, createContact, updateContact, deleteContact, getOrganizations, createOrganization, getActivities, createActivity } from '../../api/crm';
import { Search, Plus, Mail, Phone, Building2, Trash2, X, Clock, PhoneCall, MessageSquare, ChevronDown, ChevronUp, User, Globe } from 'lucide-react';
import Toast from '../../components/crm/Toast';

const CALL_OUTCOMES = [
  { value: 'connected', label: 'Connected / Spoke' },
  { value: 'voicemail', label: 'Left Voicemail' },
  { value: 'no_answer', label: 'No Answer' },
  { value: 'wrong_number', label: 'Wrong Number' },
  { value: 'follow_up', label: 'Follow-up Scheduled' },
];

const FEEDBACK_CATEGORIES = [
  { value: 'pricing', label: 'Pricing Concerns' },
  { value: 'timing', label: 'Timing / Not Ready' },
  { value: 'features', label: 'Missing Features' },
  { value: 'competition', label: 'Using Competition' },
  { value: 'not_interested', label: 'Not Interested' },
  { value: 'already_using', label: 'Already Using Similar' },
  { value: 'budget', label: 'Budget Constraints' },
  { value: 'other', label: 'Other' },
];

export default function CrmContacts() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '' });

  useEffect(() => {
    fetchContacts();
  }, []);

  // Handle deep link to specific contact
  useEffect(() => {
    const contactId = searchParams.get('id');
    if (contactId && contacts.length > 0) {
      const contact = contacts.find(c => c.id === parseInt(contactId));
      if (contact) {
        setEditingContact(contact);
        // Clear the URL param after opening
        setSearchParams({});
      }
    }
  }, [contacts, searchParams]);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const params = { limit: 100 };
      if (q) params.q = q;
      const { data } = await getContacts(params);
      if (data?.items) {
        setContacts(data.items);
      }
    } catch (err) {
      console.error('fetchContacts error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchContacts();
  };

  const handleCreate = async (formData) => {
    try {
      const { data } = await createContact(formData);
      if (data?.ok) {
        showToast('Contact created');
        fetchContacts();
        setShowForm(false);
      }
    } catch (err) {
      showToast('Failed to create contact');
    }
  };

  const handleUpdate = async (contactId, formData) => {
    try {
      const { data } = await updateContact(contactId, formData);
      if (data?.ok) {
        showToast('Contact updated');
        fetchContacts();
        setEditingContact(null);
      }
    } catch (err) {
      showToast('Failed to update contact');
    }
  };

  const handleDelete = async (contactId) => {
    if (!confirm('Delete this contact?')) return;
    try {
      await deleteContact(contactId);
      showToast('Contact deleted');
      fetchContacts();
    } catch (err) {
      showToast('Failed to delete contact');
    }
  };

  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> Add Contact
        </button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <input
            className="border rounded-lg px-9 py-2 w-full focus:outline-none focus:ring-2 focus:ring-amber-500"
            placeholder="Search contacts..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
        >
          Search
        </button>
      </form>

      {/* Contacts Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
        </div>
      ) : contacts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-500">
          No contacts found
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {contacts.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              onEdit={() => setEditingContact(contact)}
              onDelete={() => handleDelete(contact.id)}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showForm && (
        <ContactFormModal
          onClose={() => setShowForm(false)}
          onSubmit={handleCreate}
        />
      )}

      {/* Edit Modal */}
      {editingContact && (
        <ContactFormModal
          contact={editingContact}
          onClose={() => setEditingContact(null)}
          onSubmit={(data) => handleUpdate(editingContact.id, data)}
        />
      )}

      <Toast show={toast.show} onClose={() => setToast({ show: false, message: '' })}>
        {toast.message}
      </Toast>
    </div>
  );
}

function ContactCard({ contact, onEdit, onDelete }) {
  const displayName = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || 'Unnamed';
  return (
    <div className="bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div
          className="flex-1 cursor-pointer"
          onClick={onEdit}
        >
          <h3 className="font-semibold text-gray-900">{displayName}</h3>
          {contact.job_title && <p className="text-sm text-gray-500">{contact.job_title}</p>}
        </div>
        <button
          onClick={onDelete}
          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2 text-sm">
        {contact.email && (
          <a
            href={`mailto:${contact.email}`}
            className="flex items-center gap-2 text-blue-600 hover:underline"
          >
            <Mail className="h-4 w-4 text-gray-400" />
            {contact.email}
          </a>
        )}
        {contact.phone && (
          <a
            href={`tel:${contact.phone}`}
            className="flex items-center gap-2 text-blue-600 hover:underline"
          >
            <Phone className="h-4 w-4 text-gray-400" />
            {contact.phone}
          </a>
        )}
        {contact.organization_name && (
          <div className="flex items-center gap-2 text-gray-600">
            <Building2 className="h-4 w-4 text-gray-400" />
            {contact.organization_name}
          </div>
        )}
      </div>
    </div>
  );
}

function ContactFormModal({ contact, onClose, onSubmit }) {
  const contactName = contact ? [contact.first_name, contact.last_name].filter(Boolean).join(' ') : '';
  const [formData, setFormData] = useState({
    name: contactName,
    email: contact?.email || '',
    phone: contact?.phone || '',
    title: contact?.job_title || '',
    notes: contact?.notes || '',
    organization_id: contact?.organization_id || '',
  });
  const [organizations, setOrganizations] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [activityType, setActivityType] = useState('call');
  const [activityData, setActivityData] = useState({ subject: '', body: '', call_outcome: '', feedback_category: '', feedback_notes: '' });
  const [validationError, setValidationError] = useState('');
  const [showNewCompanyForm, setShowNewCompanyForm] = useState(false);
  const [newCompanyData, setNewCompanyData] = useState({ name: '', phone: '', website: '', industry: '' });
  const [creatingCompany, setCreatingCompany] = useState(false);

  useEffect(() => {
    fetchOrganizations();
    if (contact?.id) {
      fetchActivities();
    }
  }, [contact?.id]);

  const fetchOrganizations = async () => {
    try {
      const { data } = await getOrganizations({ limit: 200 });
      if (data?.items) {
        setOrganizations(data.items);
      }
    } catch (err) {
      console.error('fetchOrganizations error:', err);
    }
  };

  const handleCreateCompany = async () => {
    if (!newCompanyData.name.trim()) return;
    setCreatingCompany(true);
    try {
      const { data } = await createOrganization({
        name: newCompanyData.name,
        phone: newCompanyData.phone || null,
        website: newCompanyData.website || null,
        industry: newCompanyData.industry || null,
        stage: 'prospect',
      });
      if (data?.ok && data?.id) {
        // Add to local organizations list and select it
        const newOrg = { id: data.id, name: newCompanyData.name };
        setOrganizations(prev => [...prev, newOrg]);
        setFormData({ ...formData, organization_id: data.id });
        setShowNewCompanyForm(false);
        setNewCompanyData({ name: '', phone: '', website: '', industry: '' });
      }
    } catch (err) {
      console.error('Error creating company:', err);
    } finally {
      setCreatingCompany(false);
    }
  };

  const handleCompanySelectChange = (e) => {
    const value = e.target.value;
    if (value === '__new__') {
      setShowNewCompanyForm(true);
      setFormData({ ...formData, organization_id: '' });
    } else {
      setShowNewCompanyForm(false);
      setFormData({ ...formData, organization_id: value });
    }
  };

  const fetchActivities = async () => {
    if (!contact?.id) return;
    setLoadingActivities(true);
    try {
      const { data } = await getActivities({ contact_id: contact.id, limit: 50 });
      if (data?.items) {
        setActivities(data.items);
      }
    } catch (err) {
      console.error('fetchActivities error:', err);
    } finally {
      setLoadingActivities(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Validate: need at least name or email
    const hasName = formData.name && formData.name.trim();
    const hasEmail = formData.email && formData.email.trim();
    if (!hasName && !hasEmail) {
      setValidationError('Please enter at least a name or email address');
      return;
    }
    setValidationError('');
    // Split name into first_name and last_name for API
    const nameParts = (formData.name || '').trim().split(' ');
    const first_name = nameParts[0] || '';
    const last_name = nameParts.slice(1).join(' ') || '';
    onSubmit({
      ...formData,
      first_name,
      last_name,
      job_title: formData.title,
      organization_id: formData.organization_id || null,
    });
  };

  const handleLogActivity = async () => {
    if (!contact?.id) return;
    try {
      const payload = {
        contact_id: contact.id,
        type: activityType,
        subject: activityData.subject || `${activityType === 'call' ? 'Phone Call' : activityType === 'email' ? 'Email' : 'Note'}`,
        body: activityData.body,
      };
      if (activityType === 'call' && activityData.call_outcome) {
        payload.subtype = activityData.call_outcome;
      }
      // Add feedback if provided
      if (activityData.feedback_category) {
        payload.feedback = {
          category: activityData.feedback_category,
          notes: activityData.feedback_notes || null
        };
      }
      await createActivity(payload);
      setShowActivityForm(false);
      setActivityData({ subject: '', body: '', call_outcome: '', feedback_category: '', feedback_notes: '' });
      fetchActivities();
    } catch (err) {
      console.error('Error logging activity:', err);
    }
  };

  const getActivityIcon = (type, subtype) => {
    if (type === 'call') return <PhoneCall className="h-4 w-4" />;
    if (type === 'email') return <Mail className="h-4 w-4" />;
    return <MessageSquare className="h-4 w-4" />;
  };

  const getOutcomeLabel = (subtype) => {
    const outcome = CALL_OUTCOMES.find(o => o.value === subtype);
    return outcome?.label || subtype;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            {contact ? 'Edit Contact' : 'New Contact'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className={contact ? "grid grid-cols-1 md:grid-cols-2 gap-6" : ""}>
          {/* Contact Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {validationError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {validationError}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="e.g. CEO, Manager"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
              <select
                value={showNewCompanyForm ? '__new__' : formData.organization_id}
                onChange={handleCompanySelectChange}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">Select a company...</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
                <option value="__new__">+ New Company</option>
              </select>

              {/* New Company Accordion Form */}
              {showNewCompanyForm && (
                <div className="mt-3 p-4 bg-gray-50 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Building2 className="h-4 w-4" /> New Company
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewCompanyForm(false);
                        setNewCompanyData({ name: '', phone: '', website: '', industry: '' });
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Company Name *</label>
                    <input
                      type="text"
                      value={newCompanyData.name}
                      onChange={(e) => setNewCompanyData({ ...newCompanyData, name: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="Acme Inc."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={newCompanyData.phone}
                        onChange={(e) => setNewCompanyData({ ...newCompanyData, phone: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="(555) 123-4567"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Industry</label>
                      <input
                        type="text"
                        value={newCompanyData.industry}
                        onChange={(e) => setNewCompanyData({ ...newCompanyData, industry: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="Landscaping"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Website</label>
                    <div className="relative">
                      <Globe className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="url"
                        value={newCompanyData.website}
                        onChange={(e) => setNewCompanyData({ ...newCompanyData, website: e.target.value })}
                        className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="https://example.com"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleCreateCompany}
                      disabled={!newCompanyData.name.trim() || creatingCompany}
                      className="px-3 py-1.5 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      {creatingCompany ? (
                        <>
                          <span className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full"></span>
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus className="h-3 w-3" /> Create Company
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
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
                {contact ? 'Save' : 'Create'}
              </button>
            </div>
          </form>

          {/* Activity Log (only shown when editing) */}
          {contact && (
            <div className="border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900 flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Activity Log
                </h3>
                <button
                  type="button"
                  onClick={() => setShowActivityForm(!showActivityForm)}
                  className="text-sm text-amber-600 hover:text-amber-700 flex items-center gap-1"
                >
                  <Plus className="h-4 w-4" /> Log Activity
                </button>
              </div>

              {/* Activity Form */}
              {showActivityForm && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg space-y-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setActivityType('call')}
                      className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 ${
                        activityType === 'call' ? 'bg-amber-500 text-white' : 'bg-white border text-gray-600'
                      }`}
                    >
                      <PhoneCall className="h-3 w-3" /> Call
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivityType('email')}
                      className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 ${
                        activityType === 'email' ? 'bg-amber-500 text-white' : 'bg-white border text-gray-600'
                      }`}
                    >
                      <Mail className="h-3 w-3" /> Email
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivityType('note')}
                      className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 ${
                        activityType === 'note' ? 'bg-amber-500 text-white' : 'bg-white border text-gray-600'
                      }`}
                    >
                      <MessageSquare className="h-3 w-3" /> Note
                    </button>
                  </div>
                  {activityType === 'call' && (
                    <select
                      value={activityData.call_outcome}
                      onChange={(e) => setActivityData({ ...activityData, call_outcome: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="">Select call outcome...</option>
                      {CALL_OUTCOMES.map((outcome) => (
                        <option key={outcome.value} value={outcome.value}>{outcome.label}</option>
                      ))}
                    </select>
                  )}
                  <textarea
                    value={activityData.body}
                    onChange={(e) => setActivityData({ ...activityData, body: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    rows={2}
                    placeholder="Add notes about this activity..."
                  />
                  {/* Feedback/Objection Section */}
                  <div className="border-t pt-3 mt-1">
                    <label className="block text-xs font-medium text-gray-500 mb-2">
                      Objection / Feedback (Optional)
                    </label>
                    <select
                      value={activityData.feedback_category}
                      onChange={(e) => setActivityData({ ...activityData, feedback_category: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="">No objection/feedback</option>
                      {FEEDBACK_CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                    {activityData.feedback_category && (
                      <textarea
                        value={activityData.feedback_notes}
                        onChange={(e) => setActivityData({ ...activityData, feedback_notes: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2 text-sm mt-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        rows={2}
                        placeholder="What did they say? (e.g., 'Too expensive compared to Square')"
                      />
                    )}
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowActivityForm(false)}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleLogActivity}
                      className="px-3 py-1.5 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}

              {/* Activity List */}
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {loadingActivities ? (
                  <div className="text-sm text-gray-500 text-center py-4">Loading activities...</div>
                ) : activities.length === 0 ? (
                  <div className="text-sm text-gray-500 text-center py-4">No activities yet</div>
                ) : (
                  activities.map((activity) => (
                    <div key={activity.id} className="p-2 border rounded-lg text-sm">
                      <div className="flex items-start gap-2">
                        <div className={`mt-0.5 ${
                          activity.type === 'call' ? 'text-green-600' :
                          activity.type === 'email' ? 'text-blue-600' : 'text-gray-600'
                        }`}>
                          {getActivityIcon(activity.type, activity.subtype)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium capitalize">{activity.type}</span>
                            {activity.subtype && (
                              <span className="text-xs px-1.5 py-0.5 bg-gray-100 rounded-full">
                                {getOutcomeLabel(activity.subtype)}
                              </span>
                            )}
                            {activity.metadata?.feedback?.category && (
                              <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                                {FEEDBACK_CATEGORIES.find(c => c.value === activity.metadata.feedback.category)?.label || activity.metadata.feedback.category}
                              </span>
                            )}
                          </div>
                          {activity.body && (
                            <p className="text-gray-600 mt-1 line-clamp-2">{activity.body}</p>
                          )}
                          <div className="text-xs text-gray-400 mt-1">
                            {activity.author_name} - {new Date(activity.occurred_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
