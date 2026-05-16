// src/components/ImportCustomersModal.jsx
import React, { useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { X, Upload, FileText, AlertCircle, CheckCircle, ChevronDown, ArrowRight, HelpCircle, Download } from 'lucide-react';

// Field definitions with aliases for smart inference
const FIELD_DEFINITIONS = {
  name: {
    label: 'Name',
    required: false,
    recommended: true,
    aliases: ['name', 'full_name', 'fullname', 'full name', 'contact_name', 'contact name', 'customer_name', 'customer name', 'customer', 'company', 'company_name', 'company name', 'business_name', 'business name'],
  },
  email: {
    label: 'Email',
    required: false,
    recommended: true,
    aliases: ['email', 'email_address', 'email address', 'e-mail', 'e_mail', 'mail', 'emailaddress'],
  },
  phone_number: {
    label: 'Phone',
    required: false,
    recommended: true,
    aliases: ['phone', 'phone_number', 'phone number', 'phonenumber', 'telephone', 'tel', 'mobile', 'cell', 'cell_phone', 'cellphone', 'mobile_phone', 'mobilephone'],
  },
  street: {
    label: 'Street Address',
    required: false,
    recommended: false,
    aliases: ['street', 'street_address', 'street address', 'address', 'address1', 'address_1', 'address 1', 'line1', 'line_1', 'line 1', 'street_line', 'street line'],
  },
  city: {
    label: 'City',
    required: false,
    recommended: false,
    aliases: ['city', 'town', 'municipality'],
  },
  state: {
    label: 'State',
    required: false,
    recommended: false,
    aliases: ['state', 'province', 'region', 'state_province', 'state/province'],
  },
  zip: {
    label: 'ZIP Code',
    required: false,
    recommended: false,
    aliases: ['zip', 'zipcode', 'zip_code', 'zip code', 'postal', 'postal_code', 'postal code', 'postalcode'],
  },
  status: {
    label: 'Status',
    required: false,
    recommended: false,
    aliases: ['status', 'customer_status', 'customer status'],
    validValues: ['lead', 'active', 'paused', 'archived'],
    defaultValue: 'lead',
  },
  tags: {
    label: 'Tags',
    required: false,
    recommended: false,
    aliases: ['tags', 'tag', 'labels', 'label', 'categories', 'category'],
    isArray: true,
  },
  frequency: {
    label: 'Service Frequency',
    required: false,
    recommended: false,
    aliases: ['frequency', 'service_frequency', 'service frequency', 'schedule', 'visit_frequency', 'visit frequency'],
  },
  pay_mode: {
    label: 'Pay Mode',
    required: false,
    recommended: false,
    aliases: ['pay_mode', 'pay mode', 'paymode', 'payment_mode', 'payment mode', 'billing_mode', 'billing mode'],
    validValues: ['immediate', 'monthly'],
    defaultValue: 'monthly',
  },
  reminder_opt_in: {
    label: 'Reminder Opt-in',
    required: false,
    recommended: false,
    aliases: ['reminder_opt_in', 'reminder opt in', 'reminders', 'send_reminders', 'send reminders'],
    isBoolean: true,
    defaultValue: true,
  },
};

// Example CSV content for download
const EXAMPLE_CSV = `Name,Email,Phone,Street,City,State,Zip,Status,Tags,Frequency
John Smith,john@example.com,555-123-4567,123 Main St,Austin,TX,78701,active,"residential,weekly",weekly
Jane Doe,jane@example.com,555-987-6543,456 Oak Ave,Houston,TX,77001,lead,commercial,monthly
Acme Corp,contact@acme.com,555-555-5555,789 Business Blvd,Dallas,TX,75201,active,"commercial,priority",bi-weekly`;

const MAX_IMPORT_LIMIT = 500;

// Help modal component
function ImportHelpModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const handleDownloadExample = () => {
    const blob = new Blob([EXAMPLE_CSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customer_import_example.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-neutral-800">CSV Import Guide</h2>
            <button onClick={onClose} className="p-1 hover:bg-neutral-100 rounded transition-colors">
              <X className="w-5 h-5 text-neutral-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Limit warning */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800">Import Limit</p>
                  <p className="text-sm text-amber-700 mt-1">
                    You can import up to <strong>{MAX_IMPORT_LIMIT} customers</strong> per batch.
                    For larger imports, split your CSV into multiple files.
                  </p>
                </div>
              </div>
            </div>

            {/* Download example */}
            <div>
              <h3 className="font-medium text-neutral-800 mb-2">Example CSV</h3>
              <p className="text-sm text-neutral-600 mb-3">
                Download an example CSV file to see the expected format:
              </p>
              <button
                onClick={handleDownloadExample}
                className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                Download Example CSV
              </button>
            </div>

            {/* Accepted fields */}
            <div>
              <h3 className="font-medium text-neutral-800 mb-3">Accepted Fields</h3>
              <p className="text-sm text-neutral-600 mb-4">
                Columns can be in any order. We automatically detect common column names.
              </p>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-neutral-600">Field</th>
                      <th className="px-4 py-2 text-left font-medium text-neutral-600">Accepted Column Names</th>
                      <th className="px-4 py-2 text-left font-medium text-neutral-600">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="px-4 py-2 font-medium">Name <span className="text-amber-500">*</span></td>
                      <td className="px-4 py-2 text-neutral-600">name, full_name, contact_name, company, customer</td>
                      <td className="px-4 py-2 text-neutral-500 text-xs">Required if no email</td>
                    </tr>
                    <tr className="bg-neutral-50/50">
                      <td className="px-4 py-2 font-medium">Email <span className="text-amber-500">*</span></td>
                      <td className="px-4 py-2 text-neutral-600">email, email_address, e-mail, mail</td>
                      <td className="px-4 py-2 text-neutral-500 text-xs">Required if no name. Used for duplicate detection.</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-medium">Phone</td>
                      <td className="px-4 py-2 text-neutral-600">phone, phone_number, telephone, mobile, cell</td>
                      <td className="px-4 py-2 text-neutral-500 text-xs">Any format accepted</td>
                    </tr>
                    <tr className="bg-neutral-50/50">
                      <td className="px-4 py-2 font-medium">Street</td>
                      <td className="px-4 py-2 text-neutral-600">street, address, street_address, address1</td>
                      <td className="px-4 py-2 text-neutral-500 text-xs">Street address line</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-medium">City</td>
                      <td className="px-4 py-2 text-neutral-600">city, town</td>
                      <td className="px-4 py-2 text-neutral-500 text-xs"></td>
                    </tr>
                    <tr className="bg-neutral-50/50">
                      <td className="px-4 py-2 font-medium">State</td>
                      <td className="px-4 py-2 text-neutral-600">state, province, region</td>
                      <td className="px-4 py-2 text-neutral-500 text-xs">State abbreviation or full name</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-medium">ZIP</td>
                      <td className="px-4 py-2 text-neutral-600">zip, zipcode, postal_code, postal</td>
                      <td className="px-4 py-2 text-neutral-500 text-xs"></td>
                    </tr>
                    <tr className="bg-neutral-50/50">
                      <td className="px-4 py-2 font-medium">Status</td>
                      <td className="px-4 py-2 text-neutral-600">status, customer_status</td>
                      <td className="px-4 py-2 text-neutral-500 text-xs">lead, active, paused, or archived. Defaults to "lead".</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-medium">Tags</td>
                      <td className="px-4 py-2 text-neutral-600">tags, labels, categories</td>
                      <td className="px-4 py-2 text-neutral-500 text-xs">Comma-separated values</td>
                    </tr>
                    <tr className="bg-neutral-50/50">
                      <td className="px-4 py-2 font-medium">Frequency</td>
                      <td className="px-4 py-2 text-neutral-600">frequency, service_frequency, schedule</td>
                      <td className="px-4 py-2 text-neutral-500 text-xs">e.g., weekly, bi-weekly, monthly</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-medium">Pay Mode</td>
                      <td className="px-4 py-2 text-neutral-600">pay_mode, payment_mode, billing_mode</td>
                      <td className="px-4 py-2 text-neutral-500 text-xs">"immediate" or "monthly". Defaults to "monthly".</td>
                    </tr>
                    <tr className="bg-neutral-50/50">
                      <td className="px-4 py-2 font-medium">Reminders</td>
                      <td className="px-4 py-2 text-neutral-600">reminder_opt_in, reminders, send_reminders</td>
                      <td className="px-4 py-2 text-neutral-500 text-xs">yes/no, true/false, 1/0. Defaults to "yes".</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-neutral-500 mt-2">
                <span className="text-amber-500">*</span> Each row must have at least a Name or Email.
              </p>
            </div>

            {/* Tips */}
            <div>
              <h3 className="font-medium text-neutral-800 mb-2">Tips</h3>
              <ul className="text-sm text-neutral-600 space-y-1 list-disc list-inside">
                <li>Export from Excel or Google Sheets as CSV (comma-separated values)</li>
                <li>The first row should contain column headers</li>
                <li>Wrap values containing commas in quotes (e.g., "Austin, TX")</li>
                <li>Duplicate customers are detected by email address</li>
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t bg-neutral-50 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Normalize string for matching
const normalize = (str) => String(str || '').toLowerCase().trim().replace(/[_\-\s]+/g, ' ');

// Infer field mapping from CSV header
function inferFieldMapping(csvHeaders) {
  const mapping = {};
  const usedHeaders = new Set();

  // First pass: exact matches
  for (const [field, def] of Object.entries(FIELD_DEFINITIONS)) {
    for (const header of csvHeaders) {
      if (usedHeaders.has(header)) continue;
      const normalizedHeader = normalize(header);
      if (def.aliases.includes(normalizedHeader)) {
        mapping[field] = header;
        usedHeaders.add(header);
        break;
      }
    }
  }

  // Second pass: partial matches for unmapped fields
  for (const [field, def] of Object.entries(FIELD_DEFINITIONS)) {
    if (mapping[field]) continue;
    for (const header of csvHeaders) {
      if (usedHeaders.has(header)) continue;
      const normalizedHeader = normalize(header);
      for (const alias of def.aliases) {
        if (normalizedHeader.includes(alias) || alias.includes(normalizedHeader)) {
          mapping[field] = header;
          usedHeaders.add(header);
          break;
        }
      }
      if (mapping[field]) break;
    }
  }

  return mapping;
}

// Parse CSV text to array of objects
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(line => line.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  // Parse header row
  const headers = parseCSVLine(lines[0]);

  // Parse data rows
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0 || values.every(v => !v.trim())) continue;

    const row = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });
    row._lineNumber = i + 1;
    rows.push(row);
  }

  return { headers, rows };
}

// Parse a single CSV line handling quotes
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
  }
  result.push(current.trim());

  return result;
}

// Transform row based on mapping
function transformRow(row, mapping) {
  const result = {};

  for (const [field, csvHeader] of Object.entries(mapping)) {
    if (!csvHeader) continue;

    let value = row[csvHeader];
    if (value === undefined || value === null) continue;

    const def = FIELD_DEFINITIONS[field];

    // Handle boolean fields
    if (def?.isBoolean) {
      const v = String(value).toLowerCase().trim();
      if (['true', 'yes', '1', 'y'].includes(v)) {
        value = true;
      } else if (['false', 'no', '0', 'n'].includes(v)) {
        value = false;
      } else {
        value = def.defaultValue ?? true;
      }
    }
    // Handle array fields (tags)
    else if (def?.isArray) {
      value = String(value).split(/[,;|]/).map(v => v.trim()).filter(Boolean);
    }
    // Handle valid values
    else if (def?.validValues) {
      const v = String(value).toLowerCase().trim();
      if (!def.validValues.includes(v)) {
        value = def.defaultValue || def.validValues[0];
      } else {
        value = v;
      }
    }
    // Handle email normalization
    else if (field === 'email') {
      value = String(value).toLowerCase().trim();
    }
    // Trim strings
    else {
      value = String(value).trim();
    }

    if (value !== '' && value !== null && value !== undefined) {
      result[field] = value;
    }
  }

  return result;
}

// Validate a transformed row
function validateRow(row) {
  const errors = [];

  // Must have at least name OR email
  if (!row.name && !row.email) {
    errors.push('Must have at least a name or email');
  }

  // Email format validation
  if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
    errors.push('Invalid email format');
  }

  return errors;
}

export default function ImportCustomersModal({ isOpen, onClose, onImportComplete }) {
  const [step, setStep] = useState('upload'); // 'upload' | 'mapping' | 'preview' | 'importing' | 'complete'
  const [file, setFile] = useState(null);
  const [csvData, setCsvData] = useState({ headers: [], rows: [] });
  const [mapping, setMapping] = useState({});
  const [duplicateHandling, setDuplicateHandling] = useState('skip'); // 'skip' | 'update' | 'create'
  const [importResults, setImportResults] = useState(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  // Reset state when modal closes
  const handleClose = useCallback(() => {
    setStep('upload');
    setFile(null);
    setCsvData({ headers: [], rows: [] });
    setMapping({});
    setImportResults(null);
    setError('');
    onClose();
  }, [onClose]);

  // Handle file selection
  const handleFileSelect = useCallback(async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setError('');
    setFile(selectedFile);

    try {
      const text = await selectedFile.text();
      const parsed = parseCSV(text);

      if (parsed.headers.length === 0) {
        setError('Could not parse CSV headers');
        return;
      }

      if (parsed.rows.length === 0) {
        setError('CSV file has no data rows');
        return;
      }

      setCsvData(parsed);
      const inferredMapping = inferFieldMapping(parsed.headers);
      setMapping(inferredMapping);
      setStep('mapping');
    } catch (err) {
      setError('Failed to read file: ' + err.message);
    }
  }, []);

  // Handle drag and drop
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.name.endsWith('.csv')) {
      const fakeEvent = { target: { files: [droppedFile] } };
      handleFileSelect(fakeEvent);
    } else {
      setError('Please drop a CSV file');
    }
  }, [handleFileSelect]);

  // Preview data with current mapping
  const previewData = useMemo(() => {
    return csvData.rows.slice(0, 5).map(row => {
      const transformed = transformRow(row, mapping);
      const errors = validateRow(transformed);
      return { original: row, transformed, errors, lineNumber: row._lineNumber };
    });
  }, [csvData.rows, mapping]);

  // Count valid/invalid rows
  const validationSummary = useMemo(() => {
    let valid = 0;
    let invalid = 0;
    for (const row of csvData.rows) {
      const transformed = transformRow(row, mapping);
      const errors = validateRow(transformed);
      if (errors.length === 0) valid++;
      else invalid++;
    }
    return { valid, invalid, total: csvData.rows.length };
  }, [csvData.rows, mapping]);

  // Execute import
  const handleImport = useCallback(async () => {
    setImporting(true);
    setError('');

    try {
      // Transform all rows
      const customersToImport = [];
      const skippedRows = [];

      for (const row of csvData.rows) {
        const transformed = transformRow(row, mapping);
        const errors = validateRow(transformed);

        if (errors.length > 0) {
          skippedRows.push({ lineNumber: row._lineNumber, errors });
        } else {
          transformed.source = 'csv_import';
          customersToImport.push({ data: transformed, lineNumber: row._lineNumber });
        }
      }

      // Call bulk import API
      const response = await axios.post('/api/owner/customers/bulk-import', {
        customers: customersToImport.map(c => c.data),
        duplicate_handling: duplicateHandling,
      }, { withCredentials: true });

      const result = response.data;
      setImportResults({
        imported: result.imported || 0,
        updated: result.updated || 0,
        skipped: result.skipped || 0,
        failed: result.failed || 0,
        errors: result.errors || [],
        skippedValidation: skippedRows,
      });
      setStep('complete');

      if (onImportComplete) {
        onImportComplete();
      }
    } catch (err) {
      setError(err?.response?.data?.error || 'Import failed: ' + err.message);
    } finally {
      setImporting(false);
    }
  }, [csvData.rows, mapping, duplicateHandling, onImportComplete]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/50" onClick={handleClose} />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-neutral-800">Import Customers</h2>
            <button
              onClick={handleClose}
              className="p-1 hover:bg-neutral-100 rounded transition-colors"
            >
              <X className="w-5 h-5 text-neutral-500" />
            </button>
          </div>

          {/* Steps indicator */}
          <div className="px-6 py-3 bg-neutral-50 border-b">
            <div className="flex items-center gap-2 text-sm">
              <span className={`px-2 py-1 rounded ${step === 'upload' ? 'bg-amber-100 text-amber-700 font-medium' : 'text-neutral-500'}`}>
                1. Upload
              </span>
              <ArrowRight className="w-4 h-4 text-neutral-300" />
              <span className={`px-2 py-1 rounded ${step === 'mapping' ? 'bg-amber-100 text-amber-700 font-medium' : 'text-neutral-500'}`}>
                2. Map Columns
              </span>
              <ArrowRight className="w-4 h-4 text-neutral-300" />
              <span className={`px-2 py-1 rounded ${step === 'preview' ? 'bg-amber-100 text-amber-700 font-medium' : 'text-neutral-500'}`}>
                3. Preview
              </span>
              <ArrowRight className="w-4 h-4 text-neutral-300" />
              <span className={`px-2 py-1 rounded ${step === 'complete' ? 'bg-green-100 text-green-700 font-medium' : 'text-neutral-500'}`}>
                4. Complete
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            )}

            {/* Upload Step */}
            {step === 'upload' && (
              <div className="space-y-4">
                {/* Import limit notice */}
                <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-neutral-600">
                    <AlertCircle className="w-4 h-4 text-neutral-400" />
                    <span>Maximum {MAX_IMPORT_LIMIT} customers per import</span>
                  </div>
                  <button
                    onClick={() => setShowHelp(true)}
                    className="inline-flex items-center gap-1 text-sm text-amber-600 hover:text-amber-700 font-medium"
                  >
                    <HelpCircle className="w-4 h-4" />
                    View format guide
                  </button>
                </div>

                <div
                  className="border-2 border-dashed border-neutral-300 rounded-lg p-12 text-center hover:border-amber-400 transition-colors"
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <Upload className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-neutral-800 mb-2">Upload your CSV file</h3>
                  <p className="text-neutral-500 mb-4">
                    Drag and drop or click to select a file
                  </p>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label
                    htmlFor="csv-upload"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg cursor-pointer transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    Select CSV File
                  </label>
                  <p className="text-xs text-neutral-400 mt-4">
                    Columns can be in any order. We'll automatically detect common field names like "Email", "Phone Number", etc.
                  </p>
                </div>
              </div>
            )}

            {/* Mapping Step */}
            {step === 'mapping' && (
              <div className="space-y-6">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <FileText className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-800">
                        {file?.name} — {csvData.rows.length} rows detected
                      </p>
                      <p className="text-sm text-amber-700 mt-1">
                        We've automatically mapped columns based on their names. Review and adjust as needed.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4">
                  <h3 className="font-medium text-neutral-800">Column Mapping</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {Object.entries(FIELD_DEFINITIONS).map(([field, def]) => (
                      <div key={field} className="flex items-center gap-3">
                        <label className="w-32 text-sm font-medium text-neutral-700 flex-shrink-0">
                          {def.label}
                          {def.recommended && <span className="text-amber-500 ml-1">*</span>}
                        </label>
                        <div className="relative flex-1">
                          <select
                            value={mapping[field] || ''}
                            onChange={(e) => setMapping(prev => ({ ...prev, [field]: e.target.value }))}
                            className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm appearance-none bg-white pr-8"
                          >
                            <option value="">— Not mapped —</option>
                            {csvData.headers.map(header => (
                              <option key={header} value={header}>{header}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-neutral-500">
                    <span className="text-amber-500">*</span> Recommended fields. At minimum, each row needs a Name or Email.
                  </p>
                </div>

                {/* Duplicate handling */}
                <div className="border-t pt-4">
                  <h3 className="font-medium text-neutral-800 mb-3">Duplicate Handling</h3>
                  <p className="text-sm text-neutral-600 mb-3">
                    What should we do if a customer with the same email already exists?
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {[
                      { value: 'skip', label: 'Skip duplicates', desc: 'Keep existing, ignore new' },
                      { value: 'update', label: 'Update existing', desc: 'Merge new data into existing' },
                      { value: 'create', label: 'Create anyway', desc: 'Create new record regardless' },
                    ].map(option => (
                      <label
                        key={option.value}
                        className={`flex items-start gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                          duplicateHandling === option.value
                            ? 'border-amber-500 bg-amber-50'
                            : 'border-neutral-200 hover:border-neutral-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="duplicateHandling"
                          value={option.value}
                          checked={duplicateHandling === option.value}
                          onChange={(e) => setDuplicateHandling(e.target.value)}
                          className="mt-1"
                        />
                        <div>
                          <div className="font-medium text-sm">{option.label}</div>
                          <div className="text-xs text-neutral-500">{option.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Preview Step */}
            {step === 'preview' && (
              <div className="space-y-6">
                {/* Summary */}
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-neutral-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-neutral-800">{validationSummary.total}</div>
                    <div className="text-sm text-neutral-500">Total Rows</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{validationSummary.valid}</div>
                    <div className="text-sm text-green-600">Ready to Import</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">{validationSummary.invalid}</div>
                    <div className="text-sm text-red-600">Will Be Skipped</div>
                  </div>
                </div>

                {/* Preview table */}
                <div>
                  <h3 className="font-medium text-neutral-800 mb-3">Preview (first 5 rows)</h3>
                  <div className="border rounded-lg overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-neutral-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-neutral-600">Row</th>
                          <th className="px-3 py-2 text-left font-medium text-neutral-600">Name</th>
                          <th className="px-3 py-2 text-left font-medium text-neutral-600">Email</th>
                          <th className="px-3 py-2 text-left font-medium text-neutral-600">Phone</th>
                          <th className="px-3 py-2 text-left font-medium text-neutral-600">Address</th>
                          <th className="px-3 py-2 text-left font-medium text-neutral-600">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {previewData.map((item, idx) => (
                          <tr
                            key={idx}
                            className={item.errors.length > 0 ? 'bg-red-50' : ''}
                          >
                            <td className="px-3 py-2 text-neutral-500">{item.lineNumber}</td>
                            <td className="px-3 py-2">{item.transformed.name || '—'}</td>
                            <td className="px-3 py-2">{item.transformed.email || '—'}</td>
                            <td className="px-3 py-2">{item.transformed.phone_number || '—'}</td>
                            <td className="px-3 py-2">
                              {[item.transformed.street, item.transformed.city, item.transformed.state, item.transformed.zip]
                                .filter(Boolean)
                                .join(', ') || '—'}
                            </td>
                            <td className="px-3 py-2">
                              {item.errors.length > 0 ? (
                                <span className="text-red-600 text-xs">{item.errors.join(', ')}</span>
                              ) : (
                                <span className="text-green-600">{item.transformed.status || 'lead'}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {validationSummary.invalid > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-sm text-amber-800">
                      <strong>{validationSummary.invalid} row(s)</strong> will be skipped because they're missing
                      required information (name or email).
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Importing Step */}
            {step === 'importing' && (
              <div className="text-center py-12">
                <div className="animate-spin w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-4" />
                <h3 className="text-lg font-medium text-neutral-800">Importing customers...</h3>
                <p className="text-neutral-500 mt-1">This may take a moment</p>
              </div>
            )}

            {/* Complete Step */}
            {step === 'complete' && importResults && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-neutral-800">Import Complete</h3>
                </div>

                <div className="grid md:grid-cols-4 gap-4">
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{importResults.imported}</div>
                    <div className="text-sm text-green-600">Imported</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">{importResults.updated}</div>
                    <div className="text-sm text-blue-600">Updated</div>
                  </div>
                  <div className="bg-neutral-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-neutral-600">{importResults.skipped}</div>
                    <div className="text-sm text-neutral-500">Skipped</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">{importResults.failed}</div>
                    <div className="text-sm text-red-600">Failed</div>
                  </div>
                </div>

                {importResults.errors && importResults.errors.length > 0 && (
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium text-neutral-800 mb-2">Errors</h4>
                    <ul className="text-sm text-red-600 space-y-1 max-h-32 overflow-y-auto">
                      {importResults.errors.slice(0, 10).map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                      {importResults.errors.length > 10 && (
                        <li className="text-neutral-500">...and {importResults.errors.length - 10} more</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t bg-neutral-50 flex justify-between">
            <button
              onClick={step === 'complete' ? handleClose : () => {
                if (step === 'mapping') setStep('upload');
                else if (step === 'preview') setStep('mapping');
              }}
              className="px-4 py-2 text-neutral-600 hover:text-neutral-800 transition-colors"
              disabled={step === 'upload' || importing}
            >
              {step === 'complete' ? 'Close' : 'Back'}
            </button>

            <div className="flex gap-3">
              {step === 'mapping' && (
                <button
                  onClick={() => setStep('preview')}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors"
                >
                  Continue to Preview
                </button>
              )}
              {step === 'preview' && (
                <button
                  onClick={handleImport}
                  disabled={importing || validationSummary.valid === 0}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {importing ? 'Importing...' : `Import ${validationSummary.valid} Customers`}
                </button>
              )}
              {step === 'complete' && (
                <button
                  onClick={handleClose}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Help Modal */}
      <ImportHelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}
