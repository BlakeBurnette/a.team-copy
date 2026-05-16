import React, { useMemo } from 'react';
import InlineSelect from './InlineSelect';
import ZipcodeListInput from './ZipcodeListInput';
import ScheduleHoursEditor from './ScheduleHoursEditor';
import MultiSelectCheckboxes from './MultiSelectCheckboxes';
import { SERVICES_BY_INDUSTRY } from './constants';

const FieldLabel = ({ children }) => (
  <label className="block mb-1 text-sm font-semibold">{children}</label>
);

const CreateOrganizationForm = ({
  newOrgName,
  setNewOrgName,
  showAdvanced,
  setShowAdvanced,
  newOrgAdvanced,
  setNewOrgAdvanced,
  onSubmit,
  industryOptions,
  users = [], // ⬅️ pass from AdminPanel
}) => {
  const setAdv = (k, v) => setNewOrgAdvanced({ ...newOrgAdvanced, [k]: v });

  const serviceOptions = useMemo(
    () => SERVICES_BY_INDUSTRY[newOrgAdvanced.industry] || [],
    [newOrgAdvanced.industry]
  );

  const ownerOptions = useMemo(
    () =>
      users.map((u) => ({
        value: String(u.id),
        label: `${u.name || u.email} (${u.email})`,
      })),
    [users]
  );

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4">
      <h3 className="text-lg font-semibold">Create New Organization</h3>

      {/* Name (required) */}
      <div>
        <FieldLabel>Organization Name (required)</FieldLabel>
        <input
          type="text"
          required
          className="border p-2 w-full"
          value={newOrgName}
          onChange={(e) => setNewOrgName(e.target.value)}
          placeholder="Acme Lawn & Co."
        />
      </div>

      {/* Advanced Panel */}
      <div className="border rounded-lg overflow-hidden bg-white">
        <button
          type="button"
          onClick={() => setShowAdvanced((s) => !s)}
          className="w-full text-left px-4 py-3 flex items-center justify-between bg-gray-50"
        >
          <span className="font-semibold">Advanced fields (optional)</span>
          <span className="text-sm">{showAdvanced ? 'Hide ▲' : 'Show ▼'}</span>
        </button>

        {showAdvanced && (
          <div className="p-4 space-y-4">
            {/* Top row (Industry, Owner, Website, Phone, Email) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="min-w-0">
                <FieldLabel>Industry</FieldLabel>
                <InlineSelect
                  value={newOrgAdvanced.industry || ''}
                  options={industryOptions}
                  onChange={(val) => setAdv('industry', val)}
                  placeholder="Select industry…"
                />
              </div>

              <div className="min-w-0">
                <FieldLabel>Organization Owner</FieldLabel>
                <InlineSelect
                  value={newOrgAdvanced.owner_user_id ? String(newOrgAdvanced.owner_user_id) : ''}
                  options={ownerOptions}
                  onChange={(val) => setAdv('owner_user_id', val ? Number(val) : null)}
                  placeholder="Select owner…"
                />
              </div>

              <div className="min-w-0">
                <FieldLabel>Website</FieldLabel>
                <input
                  type="url"
                  className="border p-2 w-full text-sm"
                  value={newOrgAdvanced.website}
                  onChange={(e) => setAdv('website', e.target.value)}
                  placeholder="https://example.com"
                />
              </div>

              <div className="min-w-0">
                <FieldLabel>Phone Number</FieldLabel>
                <input
                  type="tel"
                  className="border p-2 w-full text-sm"
                  value={newOrgAdvanced.phone_number}
                  onChange={(e) => setAdv('phone_number', e.target.value)}
                  placeholder="(555) 123-4567"
                  inputMode="tel"
                />
              </div>

              <div className="min-w-0">
                <FieldLabel>Email</FieldLabel>
                <input
                  type="email"
                  className="border p-2 w-full text-sm"
                  value={newOrgAdvanced.email}
                  onChange={(e) => setAdv('email', e.target.value)}
                  placeholder="owner@example.com"
                />
              </div>
            </div>

            {/* Address */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="min-w-0">
                <FieldLabel>Street</FieldLabel>
                <input
                  className="border p-2 w-full text-sm"
                  value={newOrgAdvanced.street}
                  onChange={(e) => setAdv('street', e.target.value)}
                  placeholder="123 Main St"
                />
              </div>
              <div className="min-w-0">
                <FieldLabel>City</FieldLabel>
                <input
                  className="border p-2 w-full text-sm"
                  value={newOrgAdvanced.city}
                  onChange={(e) => setAdv('city', e.target.value)}
                  placeholder="Springfield"
                />
              </div>
              <div className="min-w-0">
                <FieldLabel>State</FieldLabel>
                <input
                  className="border p-2 w-full text-sm uppercase"
                  maxLength={2}
                  value={newOrgAdvanced.state}
                  onChange={(e) => setAdv('state', e.target.value.toUpperCase())}
                  placeholder="ST"
                />
              </div>
              <div className="min-w-0">
                <FieldLabel>ZIP</FieldLabel>
                <input
                  className="border p-2 w-full text-sm"
                  value={newOrgAdvanced.zip}
                  onChange={(e) => setAdv('zip', e.target.value)}
                  placeholder="00000"
                  inputMode="numeric"
                />
              </div>
            </div>

            {/* Service Area Zipcodes */}
            <div className="min-w-0">
              <FieldLabel>Service Area Zipcodes</FieldLabel>
              <ZipcodeListInput
                value={newOrgAdvanced.service_area_zipcodes || []}
                onChange={(arr) => setAdv('service_area_zipcodes', arr)}
              />
            </div>

            {/* Business Hours */}
            <div className="min-w-0">
              <FieldLabel>Business Hours</FieldLabel>
              <ScheduleHoursEditor
                value={newOrgAdvanced.business_hours || {}}
                onChange={(obj) => setAdv('business_hours', obj)}
              />
            </div>

            {/* Services Rendered */}
            <div className="min-w-0">
              <FieldLabel>Services Rendered</FieldLabel>
              {!newOrgAdvanced.industry ? (
                <div className="text-sm text-gray-500 italic">Select an industry to add services</div>
              ) : (
                <MultiSelectCheckboxes
                  options={serviceOptions}
                  value={newOrgAdvanced.services_rendered || []}
                  onChange={(arr) => setAdv('services_rendered', arr)}
                />
              )}
            </div>
          </div>
        )}
      </div>

      <button type="submit" className="bg-zinc-600 text-white px-4 py-2 rounded">
        Create Organization
      </button>
    </form>
  );
};

export default CreateOrganizationForm;
