// src/components/owner/OwnerOrganizationEditor.jsx
import React, { useMemo } from 'react';
import ZipcodeListInput from '../admin/ZipcodeListInput';
import ScheduleHoursEditor from '../admin/ScheduleHoursEditor';
import MultiSelectCheckboxes from '../admin/MultiSelectCheckboxes';
import { SERVICES_BY_INDUSTRY } from '../admin/constants';

const Label = ({ children }) => (
  <label className="block mb-1 font-semibold">{children}</label>
);

const OwnerOrganizationEditor = ({ org, edits, queueEdit, industryOptions }) => {
  const val = (k, fallback) =>
    Object.prototype.hasOwnProperty.call(edits, k)
      ? edits[k]
      : (org?.[k] ?? fallback);

  const set = (k, v) => queueEdit(k, v);

  const industry = val('industry', '');
  const serviceOptions = useMemo(
    () => SERVICES_BY_INDUSTRY[industry] || [],
    [industry]
  );

  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label>Industry</Label>
          <select
            className="border p-2 w-full"
            value={industry}
            onChange={(e) => set('industry', e.target.value)}
          >
            <option value="">-- Select Industry --</option>
            {industryOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label>Website</Label>
          <input
            className="border p-2 w-full"
            value={val('website', '')}
            onChange={(e) => set('website', e.target.value)}
          />
        </div>

        <div>
          <Label>Phone Number</Label>
          <input
            className="border p-2 w-full"
            value={val('phone_number', '')}
            onChange={(e) => set('phone_number', e.target.value)}
            placeholder="(555) 123-4567"
          />
        </div>

        <div>
          <Label>Email</Label>
          <input
            className="border p-2 w-full"
            value={val('email', '')}
            onChange={(e) => set('email', e.target.value)}
          />
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4 mt-4">
        <div>
          <Label>Street</Label>
          <input
            className="border p-2 w-full"
            value={val('street', '')}
            onChange={(e) => set('street', e.target.value)}
          />
        </div>
        <div>
          <Label>City</Label>
          <input
            className="border p-2 w-full"
            value={val('city', '')}
            onChange={(e) => set('city', e.target.value)}
          />
        </div>
        <div>
          <Label>State</Label>
          <input
            className="border p-2 w-full uppercase"
            maxLength={2}
            value={val('state', '')}
            onChange={(e) => set('state', e.target.value.toUpperCase())}
          />
        </div>
        <div>
          <Label>ZIP</Label>
          <input
            className="border p-2 w-full"
            value={val('zip', '')}
            onChange={(e) => set('zip', e.target.value)}
          />
        </div>
      </div>

      <div className="mt-4">
        <Label>Service Area Zipcodes</Label>
        <ZipcodeListInput
          value={val('service_area_zipcodes', [])}
          onChange={(arr) => set('service_area_zipcodes', arr)}
        />
      </div>

      <div className="mt-4">
        <Label>Business Hours</Label>
        <ScheduleHoursEditor
          value={val('business_hours', {})}
          onChange={(obj) => set('business_hours', obj)}
        />
      </div>

      <div className="mt-4">
        <Label>Services Rendered</Label>
        {industry ? (
          <MultiSelectCheckboxes
            options={serviceOptions}
            value={val('services_rendered', [])}
            onChange={(arr) => set('services_rendered', arr)}
          />
        ) : (
          <div className="text-sm text-gray-500">
            Select an industry to add services
          </div>
        )}
      </div>
    </div>
  );
};

export default OwnerOrganizationEditor;
