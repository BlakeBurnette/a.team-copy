import React from 'react';
import axios from 'axios';
import { Card, FieldLabel, useAuthHeader } from './_shared';
import Dropdown from '../../components/Dropdown';
import { INDUSTRY_OPTIONS } from '../../components/admin/constants';

export default function OrganizationTab({ showToast }) {
  const authHeader = useAuthHeader();

  const [loading, setLoading] = React.useState(true);
  const [org, setOrg] = React.useState(null);

  const [q, setQ] = React.useState('');
  const [industry, setIndustry] = React.useState('');
  const [searching, setSearching] = React.useState(false);
  const [results, setResults] = React.useState([]);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const { data } = await axios.get('/api/users/my-organization', { headers: authHeader, withCredentials: true });
        if (!mounted) return;
        setOrg(data || null);
        // Default to a different industry
        if (!industry && Array.isArray(INDUSTRY_OPTIONS)) {
          const firstOther = INDUSTRY_OPTIONS.find(i => i !== (data?.industry || ''));
          if (firstOther) setIndustry(firstOther);
        }
      } catch {
        setOrg(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [authHeader]); // eslint-disable-line

  const search = async () => {
    if (!industry) {
      showToast('Choose an industry to search');
      return;
    }
    setSearching(true);
    setResults([]);
    try {
      const params = new URLSearchParams();
      params.set('industry', industry);
      if (q) params.set('q', q);
      params.set('exclude_same_industry', 'true');
      const { data } = await axios.get(`/api/users/organizations/search?${params.toString()}`, {
        headers: authHeader, withCredentials: true,
      });
      const list = Array.isArray(data) ? data : (data?.organizations || []);
      setResults(list);
    } catch (e) {
      console.error('org search failed', e?.response?.data || e);
      showToast('Search not available');
    } finally {
      setSearching(false);
    }
  };

  const selectOrg = async (candidate) => {
    const curIndustry = org?.industry || '';
    if (candidate.industry && curIndustry && candidate.industry === curIndustry) {
      showToast('You cannot select an organization in the same industry.');
      return;
    }
    try {
      await axios.post('/api/users/organizations/select', { organization_id: candidate.id }, { headers: authHeader, withCredentials: true });
      showToast('Organization updated');
      // Refresh current org view
      const { data } = await axios.get('/api/users/my-organization', { headers: authHeader, withCredentials: true });
      setOrg(data || null);
      setResults([]);
    } catch (e) {
      const msg = e?.response?.data?.error || 'Failed to select organization';
      showToast(msg);
    }
  };

  return (
    <div className="grid gap-6">
      <Card title="Your organization">
        {loading ? (
          <div className="text-neutral-600">Loading…</div>
        ) : !org ? (
          <div className="text-neutral-600">No organization linked to your account yet.</div>
        ) : (
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <FieldLabel>Name</FieldLabel>
              <div className="font-medium">{org.name || '—'}</div>
            </div>
            <div>
              <FieldLabel>Industry</FieldLabel>
              <div className="font-medium">{org.industry || '—'}</div>
            </div>
            <div>
              <FieldLabel>Contact</FieldLabel>
              <div className="font-medium">{org.email || '—'}{org.phone_number ? ` · ${org.phone_number}` : ''}</div>
            </div>
            <div>
              <FieldLabel>Website</FieldLabel>
              <div className="font-medium">{org.website || '—'}</div>
            </div>
            <div className="md:col-span-2">
              <FieldLabel>Address</FieldLabel>
              <div className="font-medium">
                {[org.street, org.city, org.state, org.zip].filter(Boolean).join(', ') || '—'}
              </div>
            </div>
          </div>
        )}
      </Card>

      <Card
        title="Find organizations (other industries only)"
        actions={
          <button className="px-3 py-2 rounded text-white bg-zinc-600" onClick={search} disabled={searching || !industry}>
            {searching ? 'Searching…' : 'Search'}
          </button>
        }
      >
        <div className="grid md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <FieldLabel>Search</FieldLabel>
            <input className="border p-2 w-full" value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Name, city, ZIP…" />
          </div>
          <div>
            <FieldLabel>Industry</FieldLabel>
            <Dropdown
              value={industry}
              onChange={setIndustry}
              options={[
                { value: '', label: '-- Select Industry --' },
                ...((INDUSTRY_OPTIONS || [])
                  .filter(i => i !== (org?.industry || ''))
                  .map(v => ({ value: v, label: v })))
              ]}
            />
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {results.length === 0 ? (
            <div className="text-neutral-600">{searching ? 'Searching…' : 'No results yet.'}</div>
          ) : results.map(r => {
            const same = (org?.industry || '') && r.industry === org.industry;
            return (
              <div key={r.id} className="border rounded p-3 flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">{r.name}</div>
                  <div className="text-sm text-neutral-600">
                    {r.industry || '—'} · {[r.city, r.state].filter(Boolean).join(', ')}
                  </div>
                </div>
                <div>
                  <button
                    className={`px-3 py-2 rounded border ${same ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={same}
                    onClick={() => selectOrg(r)}
                  >
                    {same ? 'Same industry' : 'Select'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
