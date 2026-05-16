import React, { useState } from 'react';
import {
  Loader2, CheckCircle2, ExternalLink, Send, Link2, Globe,
  Plus, Trash2, Wand2, Phone, Building2, Clock, RefreshCw,
  Eye, CreditCard, MapPin, Users, Briefcase
} from 'lucide-react';
import { createPreviewSession, generateSite, sendPreviewSms, sendPaymentSms } from '../../api/crm';

const INDUSTRIES = [
  { value: 'landscaping', label: 'Landscaping' },
  { value: 'roofing', label: 'Roofing' },
  { value: 'pressure_washing', label: 'Pressure Washing' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'pest_control', label: 'Pest Control' },
  { value: 'painting', label: 'Painting' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'general_contractor', label: 'General Contractor' },
  { value: 'other', label: 'Other' },
];

const TEMPLATES = [
  { id: 'clean-modern', name: 'Clean & Modern' },
  { id: 'bold-trustworthy', name: 'Bold & Trustworthy' },
  { id: 'friendly-local', name: 'Friendly & Local' },
];

const TARGET_AUDIENCES = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'both', label: 'Both' },
];

const validatePhone = (phone) => {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 11;
};

const validateEmail = (email) => {
  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// Input component for consistency
const FormInput = ({ label, required, helper, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label} {required && <span className="text-gray-400">*</span>}
    </label>
    {children}
    {helper && <p className="text-xs text-gray-400 mt-1">{helper}</p>}
  </div>
);

// Section card component
const SectionCard = ({ icon: Icon, title, children }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-5">
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-5 h-5 text-amber-500" />
      <h3 className="font-semibold text-gray-900">{title}</h3>
    </div>
    {children}
  </div>
);

// Action button component
const ActionButton = ({ number, icon: Icon, label, onClick, disabled, loading, variant = 'amber', completed }) => {
  const variants = {
    amber: 'from-amber-400 to-orange-400',
    purple: 'from-violet-400 to-purple-500',
    coral: 'from-orange-400 to-red-400',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`w-full p-4 rounded-xl text-white font-medium text-sm flex items-center gap-3 transition-all
        ${disabled && !completed ? 'opacity-40 cursor-not-allowed' : 'hover:shadow-lg hover:scale-[1.02]'}
        ${completed ? 'bg-green-500' : `bg-gradient-to-r ${variants[variant]}`}
      `}
    >
      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : completed ? (
          <CheckCircle2 className="w-4 h-4" />
        ) : (
          <Icon className="w-4 h-4" />
        )}
      </div>
      <span className="text-left">
        {number}. {label}
      </span>
    </button>
  );
};

export default function EmbeddedSiteBuilder({ onComplete, onBack }) {
  const [loading, setLoading] = useState(null); // null, 'preview', 'generate', 'sms', 'payment'
  const [error, setError] = useState(null);
  const [session, setSession] = useState(null);
  const [createdSite, setCreatedSite] = useState(null);
  const [smsSent, setSmsSent] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('clean-modern');

  const [form, setForm] = useState({
    smsPhone: '',
    businessPhone: '',
    email: '',
    businessName: '',
    industry: 'landscaping',
    tagline: '',
    description: '',
    ownerName: '',
    targetAudience: 'both',
    city: '',
    state: '',
    serviceArea: '',
    services: ['', '', ''],
  });

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleServiceChange = (index, value) => {
    setForm(prev => {
      const services = [...prev.services];
      services[index] = value;
      return { ...prev, services };
    });
  };

  const addService = () => {
    setForm(prev => ({
      ...prev,
      services: [...prev.services, ''],
    }));
  };

  const removeService = (index) => {
    if (form.services.length <= 1) return;
    setForm(prev => ({
      ...prev,
      services: prev.services.filter((_, i) => i !== index),
    }));
  };

  const resetForm = () => {
    setForm({
      smsPhone: '',
      businessPhone: '',
      email: '',
      businessName: '',
      industry: 'landscaping',
      tagline: '',
      description: '',
      ownerName: '',
      targetAudience: 'both',
      city: '',
      state: '',
      serviceArea: '',
      services: ['', '', ''],
    });
    setSession(null);
    setCreatedSite(null);
    setSmsSent(false);
    setError(null);
  };

  const fillTestData = () => {
    setForm({
      smsPhone: '9195551234',
      businessPhone: '',
      email: 'test@example.com',
      businessName: 'Test Landscaping LLC',
      industry: 'landscaping',
      tagline: 'Your Lawn, Our Passion',
      description: 'Family-owned landscaping company serving the Triangle area for over 15 years.',
      ownerName: 'John Smith',
      targetAudience: 'residential',
      city: 'Raleigh',
      state: 'NC',
      serviceArea: 'Raleigh, Cary, Durham, Chapel Hill',
      services: ['Lawn Mowing', 'Landscaping Design', 'Tree Trimming'],
    });
    setError(null);
  };

  // Step 1: Create preview session
  const handleCreatePreview = async () => {
    if (!form.businessName || !form.city || !form.state) {
      setError('Business name, city, and state are required');
      return;
    }
    if (!validatePhone(form.smsPhone)) {
      setError('Valid SMS phone number is required');
      return;
    }
    if (!validateEmail(form.email)) {
      setError('Valid email is required');
      return;
    }

    setLoading('preview');
    setError(null);

    try {
      const servicesList = form.services
        .filter(s => s.trim())
        .map(s => ({ name: s }));

      const phone = form.businessPhone || form.smsPhone;

      const res = await createPreviewSession({
        phone: phone,
        business_name: form.businessName,
        city: form.city,
        state: form.state,
        industry: form.industry,
        services: servicesList,
        email: form.email,
        owner_name: form.ownerName || undefined,
        tagline: form.tagline || undefined,
        business_description: form.description || undefined,
        target_audience: form.targetAudience || undefined,
        service_area: form.serviceArea || undefined,
      });

      if (res.data.ok) {
        setSession({
          ...res.data,
          preview_url: res.data.preview_url,
          smsPhone: form.smsPhone,
        });
      } else {
        setError(res.data.error || 'Failed to create preview');
      }
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to create preview');
    } finally {
      setLoading(null);
    }
  };

  // Step 2: Generate site with AI
  const handleGenerateSite = async () => {
    setLoading('generate');
    setError(null);

    try {
      const phone = form.businessPhone || form.smsPhone;
      const res = await generateSite(phone, selectedTemplate);

      if (res.data.ok) {
        setCreatedSite(res.data.site);
      } else {
        setError(res.data.error || 'Failed to generate site');
      }
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to generate site');
    } finally {
      setLoading(null);
    }
  };

  // Step 3: Send preview SMS
  const handleSendSms = async () => {
    setLoading('sms');
    try {
      await sendPreviewSms(form.smsPhone);
      setSmsSent(true);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to send SMS');
    } finally {
      setLoading(null);
    }
  };

  // Step 4: Send payment link
  const handleSendPaymentLink = async () => {
    if (!form.smsPhone) return;
    setLoading('payment');
    try {
      await sendPaymentSms(form.smsPhone);
      if (onComplete) onComplete();
    } catch (err) {
      console.error('Failed to send payment SMS:', err);
      alert(err.response?.data?.error || 'Failed to send payment link');
    } finally {
      setLoading(null);
    }
  };

  const isFormValid = form.businessName && form.city && form.state &&
                      validatePhone(form.smsPhone) && validateEmail(form.email);

  const getStatus = () => {
    if (createdSite) return { text: 'Site Generated', color: 'text-green-600' };
    if (session) return { text: 'Preview Ready', color: 'text-amber-600' };
    return { text: 'New', color: 'text-gray-500' };
  };

  const status = getStatus();

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-white px-6 py-4 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Site Builder</h2>
            <p className="text-sm text-gray-500">Build websites for prospects on the phone</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fillTestData}
              className="px-3 py-1.5 text-sm font-medium text-amber-600 border border-amber-300 rounded-lg hover:bg-amber-50 transition-colors"
            >
              Test Fill
            </button>
            <button
              onClick={resetForm}
              className="px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="w-4 h-4" />
              New Site
            </button>
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="bg-white px-6 py-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400" />
          <span className={`text-sm font-medium ${status.color}`}>{status.text}</span>
          {createdSite?.previewUrl && (
            <a
              href={createdSite.previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1"
            >
              View Site <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Main content */}
      <div className="p-6">
        <div className="flex gap-6">
          {/* Form sections */}
          <div className="flex-1 space-y-4">
            {/* Contact Information */}
            <SectionCard icon={Phone} title="Contact Information">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormInput label="SMS Phone (where to text customer)" required>
                    <input
                      type="tel"
                      value={form.smsPhone}
                      onChange={(e) => handleChange('smsPhone', e.target.value)}
                      placeholder="(555) 123-4567"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </FormInput>
                  <FormInput label="Business Phone (for website)" helper="Leave blank to use SMS phone">
                    <input
                      type="tel"
                      value={form.businessPhone}
                      onChange={(e) => handleChange('businessPhone', e.target.value)}
                      placeholder="(555) 123-4567"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </FormInput>
                </div>
                <FormInput label="Customer Email" required helper="Required for site login invite">
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="owner@business.com"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </FormInput>
              </div>
            </SectionCard>

            {/* Business Information */}
            <SectionCard icon={Building2} title="Business Information">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormInput label="Business Name" required>
                    <input
                      type="text"
                      value={form.businessName}
                      onChange={(e) => handleChange('businessName', e.target.value)}
                      placeholder="ABC Landscaping"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </FormInput>
                  <FormInput label="Industry" required>
                    <select
                      value={form.industry}
                      onChange={(e) => handleChange('industry', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    >
                      {INDUSTRIES.map(ind => (
                        <option key={ind.value} value={ind.value}>{ind.label}</option>
                      ))}
                    </select>
                  </FormInput>
                </div>

                <FormInput label="Tagline / Slogan" helper="Short catchy phrase for the website hero">
                  <input
                    type="text"
                    value={form.tagline}
                    onChange={(e) => handleChange('tagline', e.target.value)}
                    placeholder="Your Lawn, Our Passion"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </FormInput>

                <FormInput label="Business Description">
                  <textarea
                    value={form.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Tell us about the business in 2-3 sentences. What makes them special?"
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                  />
                </FormInput>

                <div className="grid grid-cols-2 gap-4">
                  <FormInput label="Owner Name">
                    <input
                      type="text"
                      value={form.ownerName}
                      onChange={(e) => handleChange('ownerName', e.target.value)}
                      placeholder="John Smith"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </FormInput>
                  <FormInput label="Target Audience">
                    <select
                      value={form.targetAudience}
                      onChange={(e) => handleChange('targetAudience', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    >
                      {TARGET_AUDIENCES.map(aud => (
                        <option key={aud.value} value={aud.value}>{aud.label}</option>
                      ))}
                    </select>
                  </FormInput>
                </div>
              </div>
            </SectionCard>

            {/* Location */}
            <SectionCard icon={MapPin} title="Location">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormInput label="City" required>
                    <input
                      type="text"
                      value={form.city}
                      onChange={(e) => handleChange('city', e.target.value)}
                      placeholder="Charlotte"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </FormInput>
                  <FormInput label="State" required>
                    <input
                      type="text"
                      value={form.state}
                      onChange={(e) => handleChange('state', e.target.value)}
                      placeholder="NC"
                      maxLength={2}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent uppercase"
                    />
                  </FormInput>
                </div>
                <FormInput label="Service Areas" helper="Cities or areas they serve, comma separated">
                  <input
                    type="text"
                    value={form.serviceArea}
                    onChange={(e) => handleChange('serviceArea', e.target.value)}
                    placeholder="Charlotte, Matthews, Mint Hill, Huntersville"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </FormInput>
              </div>
            </SectionCard>

            {/* Services */}
            <SectionCard icon={Briefcase} title="Services Offered">
              <div className="space-y-3">
                {form.services.map((service, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={service}
                      onChange={(e) => handleServiceChange(i, e.target.value)}
                      placeholder={`Service ${i + 1}`}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                    {form.services.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeService(i)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addService}
                  className="text-sm text-amber-600 hover:text-amber-700 flex items-center gap-1 font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add Service
                </button>
              </div>
            </SectionCard>

            {/* Template Selection */}
            <SectionCard icon={Globe} title="Template Style">
              <div className="grid grid-cols-3 gap-3">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTemplate(t.id)}
                    className={`p-3 rounded-lg text-sm text-center transition-all border-2 ${
                      selectedTemplate === t.id
                        ? 'bg-amber-50 text-amber-700 border-amber-500 font-semibold'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-amber-300'
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </SectionCard>
          </div>

          {/* Actions panel */}
          <div className="w-72 flex-shrink-0">
            <div className="bg-white border border-gray-200 rounded-xl p-5 sticky top-4">
              <h3 className="font-semibold text-gray-900 mb-4">Actions</h3>
              <div className="space-y-3">
                <ActionButton
                  number={1}
                  icon={Link2}
                  label="Create Template Preview Link"
                  onClick={handleCreatePreview}
                  disabled={!isFormValid}
                  loading={loading === 'preview'}
                  completed={!!session}
                  variant="amber"
                />
                <ActionButton
                  number={2}
                  icon={Globe}
                  label="Generate Site with AI"
                  onClick={handleGenerateSite}
                  disabled={!session}
                  loading={loading === 'generate'}
                  completed={!!createdSite}
                  variant="purple"
                />
                <ActionButton
                  number={3}
                  icon={Eye}
                  label="Send Preview Link"
                  onClick={handleSendSms}
                  disabled={!createdSite}
                  loading={loading === 'sms'}
                  completed={smsSent}
                  variant="coral"
                />
                <ActionButton
                  number={4}
                  icon={CreditCard}
                  label="Send Payment Link ($59.99/mo)"
                  onClick={handleSendPaymentLink}
                  disabled={!createdSite}
                  loading={loading === 'payment'}
                  variant="coral"
                />
              </div>

              {/* Generated site info */}
              {createdSite?.previewUrl && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-2">Generated Site URL:</p>
                  <a
                    href={createdSite.previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-amber-600 hover:text-amber-700 break-all flex items-start gap-1"
                  >
                    <span className="flex-1">{createdSite.previewUrl}</span>
                    <ExternalLink className="w-3 h-3 flex-shrink-0 mt-1" />
                  </a>
                </div>
              )}

              {/* Back button for script flow */}
              {onBack && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <button
                    onClick={onBack}
                    className="w-full px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Back to Script
                  </button>
                </div>
              )}

              {/* Continue button for script flow */}
              {onComplete && createdSite && (
                <div className="mt-3">
                  <button
                    onClick={onComplete}
                    className="w-full px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Continue to Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
