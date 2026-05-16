import React, { useCallback, useEffect, useMemo, useState } from 'react';
import InlineSelect from './InlineSelect';
import ZipcodeListInput from './ZipcodeListInput';
import ScheduleHoursEditor from './ScheduleHoursEditor';
import MultiSelectCheckboxes from './MultiSelectCheckboxes';
import { SERVICES_BY_INDUSTRY } from './constants';

const FieldLabel = ({ children }) => (
  <label className="block mb-1 text-sm font-semibold">{children}</label>
);

function safeParseJSON(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  if (typeof value === 'string' && value.trim()) {
    try { return JSON.parse(value); } catch {}
  }
  return fallback;
}
const deepEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const Row = ({
  org,
  edits,
  industryOptions,
  queueOrgEdit,
  users = [],
  notify,
  queueChange, // from AdminPanel, to set user role/org when picking owner here
}) => {
  // Scalars (prefer edits over DB)
  const website   = edits.website ?? org.website ?? '';
  const phone     = edits.phone_number ?? org.phone_number ?? '';
  const email     = edits.email ?? org.email ?? '';
  const street    = edits.street ?? org.street ?? '';
  const city      = edits.city ?? org.city ?? '';
  const state     = edits.state ?? org.state ?? '';
  const zip       = edits.zip ?? org.zip ?? '';
  const industry  = edits.industry ?? org.industry ?? '';

  // Complex fields
  const serviceArea = useMemo(
    () => safeParseJSON(edits.service_area_zipcodes ?? org.service_area_zipcodes, []),
    [edits.service_area_zipcodes, org.service_area_zipcodes]
  );
  const businessHours = useMemo(
    () => safeParseJSON(edits.business_hours ?? org.business_hours, {}),
    [edits.business_hours, org.business_hours]
  );
  const servicesRendered = useMemo(
    () => safeParseJSON(edits.services_rendered ?? org.services_rendered, []),
    [edits.services_rendered, org.services_rendered]
  );

  // Who is the current/effective owner according to USERS (already overlaid with pendingChanges)?
  const derivedOwner = useMemo(
    () => users.find(u => u.organization_id === org.id && u.role === 'owner') || null,
    [users, org.id]
  );

  const ownerId = edits.owner_user_id ?? org.owner_user_id ?? null;
  const effectiveOwnerId = ownerId ?? (derivedOwner ? derivedOwner.id : null);

  // Owner options (you can filter to users in this org if desired)
  const ownerOptions = useMemo(
    () => users.map((u) => ({
      value: String(u.id),
      label: `${u.name || u.email} (${u.email})`,
    })),
    [users]
  );

  const setVal = useCallback((k, v) => {
    const current = Object.prototype.hasOwnProperty.call(edits, k) ? edits[k] : org[k];
    if (deepEqual(current, v)) return;
    queueOrgEdit(org.id, k, v);
  }, [queueOrgEdit, org.id, edits, org]);

  // If org has no owner set but we can derive one from the users list, prefill once so the picker shows it.
  useEffect(() => {
    if (org.owner_user_id == null && edits.owner_user_id == null && derivedOwner) {
      setVal('owner_user_id', derivedOwner.id);
    }
  }, [org.owner_user_id, edits.owner_user_id, derivedOwner, setVal]);

  // When user chooses an owner, enforce “one owner per org” immediately and reflect to users list
  const onOwnerPick = (val) => {
    const nextOwnerId = val ? Number(val) : null;

    if (nextOwnerId) {
      const otherOwner =
        users.find(u => u.organization_id === org.id && u.role === 'owner' && u.id !== nextOwnerId) || null;

      if (otherOwner) {
        notify?.('Only one owner is allowed for an organization. Another owner already exists for this org.');
        return; // block change
      }

      // Reflect in org edits
      setVal('owner_user_id', nextOwnerId);

      // Mirror into the user pending changes so the Users list matches immediately
      const chosenUser = users.find(u => u.id === nextOwnerId);
      if (chosenUser && queueChange) {
        queueChange(chosenUser.email, 'role', 'owner');
        queueChange(chosenUser.email, 'organization_id', org.id);
      }
    } else {
      // Clearing owner
      setVal('owner_user_id', null);
    }
  };

  const serviceOptions = useMemo(
    () => SERVICES_BY_INDUSTRY[industry] || [],
    [industry]
  );

  return (
    <div className="border rounded-lg p-4 md:p-6 bg-white shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Organization (read-only) */}
        <div className="min-w-0">
          <FieldLabel>Organization</FieldLabel>
          <input className="border p-2 w-full bg-gray-50 text-sm" value={org.name} readOnly />
        </div>

        {/* Organization Owner */}
        <div className="min-w-0">
          <FieldLabel>Organization Owner</FieldLabel>
          <InlineSelect
            value={effectiveOwnerId ? String(effectiveOwnerId) : ''}
            options={ownerOptions}
            onChange={onOwnerPick}
            placeholder="Select owner…"
          />
        </div>

        {/* Industry */}
        <div className="min-w-0">
          <FieldLabel>Industry</FieldLabel>
          <InlineSelect
            value={industry || ''}
            options={industryOptions}
            onChange={(val) => setVal('industry', val)}
            buttonClassName="w-full border rounded px-2 py-2 text-sm bg-white text-left"
            placeholder="Select industry…"
          />
        </div>

        <div className="min-w-0">
          <FieldLabel>Website</FieldLabel>
          <input
            className="border p-2 w-full text-sm"
            value={website}
            onChange={(e) => setVal('website', e.target.value)}
          />
        </div>

        <div className="min-w-0">
          <FieldLabel>Phone</FieldLabel>
          <input
            className="border p-2 w-full text-sm"
            value={phone}
            onChange={(e) => setVal('phone_number', e.target.value)}
            placeholder="(555) 123-4567"
          />
        </div>

        <div className="min-w-0">
          <FieldLabel>Email</FieldLabel>
          <input
            className="border p-2 w-full text-sm"
            value={email}
            onChange={(e) => setVal('email', e.target.value)}
          />
        </div>
      </div>

      {/* Address grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        <div className="min-w-0">
          <FieldLabel>Street</FieldLabel>
          <input
            className="border p-2 w-full text-sm"
            value={street}
            onChange={(e) => setVal('street', e.target.value)}
          />
        </div>
        <div className="min-w-0">
          <FieldLabel>City</FieldLabel>
          <input
            className="border p-2 w-full text-sm"
            value={city}
            onChange={(e) => setVal('city', e.target.value)}
          />
        </div>
        <div className="min-w-0">
          <FieldLabel>State</FieldLabel>
          <input
            className="border p-2 w-full text-sm uppercase"
            maxLength={2}
            value={state}
            onChange={(e) => setVal('state', e.target.value.toUpperCase())}
          />
        </div>
        <div className="min-w-0">
          <FieldLabel>ZIP</FieldLabel>
          <input
            className="border p-2 w-full text-sm"
            value={zip}
            onChange={(e) => setVal('zip', e.target.value)}
          />
        </div>
      </div>

      {/* Service area */}
      <div className="mt-4 min-w-0">
        <FieldLabel>Service Area Zipcodes</FieldLabel>
        <ZipcodeListInput
          value={serviceArea}
          onChange={(arr) => setVal('service_area_zipcodes', arr)}
        />
      </div>

      {/* Business hours */}
      <div className="mt-4 min-w-0">
        <FieldLabel>Business Hours</FieldLabel>
        <ScheduleHoursEditor
          value={businessHours}
          onChange={(obj) => setVal('business_hours', obj)}
        />
      </div>

      {/* Services rendered */}
      <div className="mt-4 min-w-0">
        <FieldLabel>Services Rendered</FieldLabel>
        {!industry ? (
          <div className="text-sm text-gray-500 italic">
            Select an industry to add services
          </div>
        ) : (
          <MultiSelectCheckboxes
            options={serviceOptions}
            value={servicesRendered}
            onChange={(arr) => setVal('services_rendered', arr)}
          />
        )}
      </div>
    </div>
  );
};

const OrganizationsEditor = ({
  organizations,
  orgEdits,
  queueOrgEdit,
  industryOptions,
  onSaveOne,
  onResetOne,
  users = [],
  notify,
  queueChange,
}) => {
  const [selectedId, setSelectedId] = useState(null);

  // Initialize / keep selectedId valid when organizations change
  useEffect(() => {
    if (!organizations.length) { setSelectedId(null); return; }
    setSelectedId((prev) =>
      organizations.some((o) => o.id === prev) ? prev : organizations[0].id
    );
  }, [organizations]);

  const selectedOrg = organizations.find((o) => o.id === selectedId) || null;
  const hasEdits =
    !!(selectedId && orgEdits[selectedId] && Object.keys(orgEdits[selectedId]).length);

  const orgOptions = useMemo(
    () => organizations.map((o) => ({ value: String(o.id), label: o.name })),
    [organizations]
  );

  if (!organizations.length) {
    return (
      <div className="mt-10">
        <h3 className="text-lg font-semibold mb-2">Edit Organizations</h3>
        <p className="text-gray-600">No organizations found.</p>
      </div>
    );
  }

  return (
    <div className="mt-10 space-y-4">
      <h3 className="text-lg font-semibold">Edit Organizations</h3>

      {/* Organization chooser */}
      <div className="mb-2 max-w-xl">
        <FieldLabel>Select Organization</FieldLabel>
        <InlineSelect
          value={selectedId != null ? String(selectedId) : ''}
          options={orgOptions}
          onChange={(val) => setSelectedId(val ? Number(val) : null)}
          placeholder="Choose organization…"
        />
      </div>

      {selectedOrg ? (
        <>
          <Row
            org={selectedOrg}
            edits={orgEdits[selectedId] || {}}
            industryOptions={industryOptions}
            queueOrgEdit={queueOrgEdit}
            users={users}
            notify={notify}
            queueChange={queueChange}
          />

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <button
              onClick={() => onSaveOne?.(selectedId)}
              disabled={!hasEdits}
              className={`px-4 py-2 rounded text-white text-sm ${
                hasEdits ? 'bg-zinc-600' : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              Save Changes
            </button>
            <button
              onClick={() => onResetOne?.(selectedId)}
              disabled={!hasEdits}
              className="px-4 py-2 rounded border text-sm"
            >
              Reset
            </button>
          </div>
        </>
      ) : (
        <p className="text-gray-600">Select an organization to edit.</p>
      )}
    </div>
  );
};

export default OrganizationsEditor;
