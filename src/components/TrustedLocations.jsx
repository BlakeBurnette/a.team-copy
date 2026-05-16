import React, { useState } from 'react';
import { latLngToCell } from 'h3-js';
import { listTrustedLocations, createTrustedLocation, deleteTrustedLocation } from '../api/trustedLocations';

export default function TrustedLocations({ customerId, locations: initialLocations, error, onChange, headers }) {
  const [label, setLabel] = useState('');
  const [radius, setRadius] = useState(5000);
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState('');
  const [locations, setLocations] = useState(initialLocations || []);

  const refresh = async () => {
    try {
      const data = await listTrustedLocations(customerId, headers);
      const list = Array.isArray(data?.locations) ? data.locations : Array.isArray(data) ? data : [];
      setLocations(list);
      onChange?.();
    } catch (e) {
      setLocalError(e?.response?.data?.error || 'Failed to load locations');
    }
  };

  useEffect(() => {
    setLocations(initialLocations || []);
  }, [initialLocations]);

  const geolocate = () =>
    new Promise((resolve) => {
      if (!navigator?.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords || {};
          if (latitude == null || longitude == null) return resolve(null);
          try {
            const h3 = latLngToCell(latitude, longitude, 9);
            resolve({ h3 });
          } catch {
            resolve(null);
          }
        },
        () => resolve(null),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 2500 }
      );
    });

  const addLocation = async () => {
    setSaving(true);
    setLocalError('');
    try {
      const geo = await geolocate();
      if (!geo?.h3) {
        setLocalError('Unable to get location (permission or support).');
        setSaving(false);
        return;
      }
      await createTrustedLocation(
        customerId,
        { label: label || 'Home', radius_km: (Number(radius) || 5000) / 1000, h3_index: geo.h3 },
        headers
      );
      setLabel('');
      setRadius(5000);
      refresh();
    } catch (e) {
      setLocalError(e?.response?.data?.error || 'Failed to save location');
    } finally {
      setSaving(false);
    }
  };

  const deleteLocation = async (id) => {
    if (!id) return;
    await deleteTrustedLocation(customerId, id, headers);
    refresh();
  };

  return (
    <div className="mt-4 space-y-2">
      <div className="text-sm font-semibold text-neutral-900">Trusted locations</div>
      <div className="text-xs text-neutral-600">We’ll warn if approvals come from outside these areas.</div>
      {error ? <div className="text-sm text-red-600">{error}</div> : null}
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          className="border rounded px-3 py-2 text-sm"
          placeholder="Label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <input
          className="border rounded px-3 py-2 text-sm"
          type="number"
          value={radius}
          onChange={(e) => setRadius(e.target.value)}
          placeholder="Radius (m, default 5000)"
        />
        <button
          type="button"
          onClick={addLocation}
          className="px-3 py-2 rounded bg-emerald-600 text-white text-sm"
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Add trusted location'}
        </button>
      </div>
      {localError ? <div className="text-xs text-red-600">{localError}</div> : null}
      <div className="space-y-1">
        {(locations || []).map((loc) => (
          <div key={loc.id} className="flex items-center justify-between border rounded p-2 text-sm bg-neutral-50">
            <div>
              <div className="font-medium">{loc.label || 'Location'}</div>
              <div className="text-xs text-neutral-600">Radius: {loc.radius_m || loc.radius} m</div>
            </div>
            <button
              type="button"
              onClick={() => deleteLocation(loc.id)}
              className="text-xs text-rose-700 underline"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
