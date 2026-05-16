// src/pages/JobApplication.jsx
// Public job application form
import React, { useState, useRef, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
} from 'lucide-react';
import { getResumeUploadUrl, submitApplication } from '../api/applications';

const ACCEPTED_TYPES = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'text/plain': '.txt',
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const RATE_LIMIT_COOLDOWN = 60000; // 60 seconds

export default function JobApplication() {
  const { jobTitle } = useParams();
  const decodedTitle = decodeURIComponent(jobTitle || '');

  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    linkedin_url: '',
    location: '',
  });

  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [fileError, setFileError] = useState('');
  const [cooldown, setCooldown] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(0);

  // Cooldown timer
  useEffect(() => {
    if (!cooldown) return;

    const interval = setInterval(() => {
      setCooldownTime((t) => {
        if (t <= 1) {
          setCooldown(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [cooldown]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const validateFile = (f) => {
    if (!f) return 'Please select a file';

    if (!ACCEPTED_TYPES[f.type]) {
      return 'File type not accepted. Please upload PDF, JPG, PNG, or TXT.';
    }

    if (f.size > MAX_FILE_SIZE) {
      return `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`;
    }

    return null;
  };

  const handleFileSelect = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;

    const err = validateFile(f);
    if (err) {
      setFileError(err);
      setFile(null);
      return;
    }

    setFileError('');
    setFile(f);
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (!f) return;

    const err = validateFile(f);
    if (err) {
      setFileError(err);
      setFile(null);
      return;
    }

    setFileError('');
    setFile(f);
  };

  const removeFile = () => {
    setFile(null);
    setFileError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateForm = () => {
    if (!form.name.trim()) return 'Name is required';
    if (!form.email.trim()) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Invalid email address';
    if (!form.phone.trim()) return 'Phone number is required';
    if (!form.location.trim()) return 'Location is required';
    if (!file) return 'Resume is required';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (cooldown) {
      setError(`Please wait ${cooldownTime} seconds before submitting again.`);
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      // Step 1: Get presigned URL for resume upload
      setUploading(true);
      const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
      const presignRes = await getResumeUploadUrl({
        content_type: file.type,
        file_name: file.name,
        byte_size: file.size,
      });

      const uploadUrl = presignRes.upload_url || presignRes.url;
      const resumeKey = presignRes.key || presignRes.file_key;

      if (!uploadUrl || !resumeKey) {
        throw new Error('Failed to get upload URL');
      }

      // Step 2: Upload file to storage
      await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      setUploading(false);

      // Step 3: Submit application
      await submitApplication({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        linkedin_url: form.linkedin_url.trim() || null,
        location: form.location.trim(),
        job_title: decodedTitle,
        resume_key: resumeKey,
      });

      setSubmitted(true);

      // Start cooldown
      setCooldown(true);
      setCooldownTime(RATE_LIMIT_COOLDOWN / 1000);

    } catch (err) {
      const message = err?.response?.data?.error || err?.message || 'Failed to submit application';

      // Check for rate limiting
      if (err?.response?.status === 429) {
        setError('Too many applications submitted. Please try again later.');
        setCooldown(true);
        setCooldownTime(RATE_LIMIT_COOLDOWN / 1000);
      } else {
        setError(message);
      }
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  // Success state
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Application Submitted!</h1>
          <p className="text-gray-600 mb-6">
            Thank you for applying for the <strong>{decodedTitle}</strong> position.
            We'll review your application and get back to you soon.
          </p>
          <Link
            to="/careers"
            className="inline-flex items-center gap-2 text-amber-600 hover:text-amber-700 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Careers
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4">
          <Link
            to="/careers"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Careers
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Apply for {decodedTitle}
          </h1>
          <p className="text-gray-600">
            Fill out the form below to submit your application.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-colors"
              placeholder="John Doe"
              disabled={submitting}
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-colors"
              placeholder="john@example.com"
              disabled={submitting}
            />
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-colors"
              placeholder="(555) 123-4567"
              disabled={submitting}
            />
          </div>

          {/* LinkedIn */}
          <div>
            <label htmlFor="linkedin_url" className="block text-sm font-medium text-gray-700 mb-1.5">
              LinkedIn Profile <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="url"
              id="linkedin_url"
              name="linkedin_url"
              value={form.linkedin_url}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-colors"
              placeholder="https://linkedin.com/in/johndoe"
              disabled={submitting}
            />
          </div>

          {/* Location */}
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1.5">
              Location <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="location"
              name="location"
              value={form.location}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-colors"
              placeholder="City, State"
              disabled={submitting}
            />
          </div>

          {/* Resume Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Resume <span className="text-red-500">*</span>
            </label>

            {!file ? (
              <div
                onDrop={handleFileDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  border-2 border-dashed rounded-xl p-6 sm:p-8 text-center cursor-pointer
                  transition-colors hover:border-amber-400 hover:bg-amber-50/50
                  ${fileError ? 'border-red-300 bg-red-50/50' : 'border-gray-300'}
                `}
              >
                <Upload className={`w-8 h-8 mx-auto mb-3 ${fileError ? 'text-red-400' : 'text-gray-400'}`} />
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-medium text-amber-600">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500">
                  PDF, JPG, PNG, or TXT (max 10MB)
                </p>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={removeFile}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={submitting}
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            )}

            {fileError && (
              <p className="mt-2 text-sm text-red-600">{fileError}</p>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.txt"
              onChange={handleFileSelect}
              className="hidden"
              disabled={submitting}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || cooldown}
            className={`
              w-full py-3.5 px-6 rounded-xl font-medium text-white
              transition-colors flex items-center justify-center gap-2
              ${submitting || cooldown
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-amber-500 hover:bg-amber-600'
              }
            `}
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {uploading ? 'Uploading Resume...' : 'Submitting...'}
              </>
            ) : cooldown ? (
              `Please wait ${cooldownTime}s`
            ) : (
              'Submit Application'
            )}
          </button>

          <p className="text-xs text-gray-500 text-center">
            By submitting this application, you agree to our{' '}
            <Link to="/legal/privacy" className="text-amber-600 hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </form>
      </main>
    </div>
  );
}
