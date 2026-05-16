import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';

export function useCrewDaySummary({ orgId }) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [teamId, setTeamId] = useState('');
  const [summaries, setSummaries] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchSummary = useCallback(async (opts = {}) => {
    const { date: overrideDate, teamId: overrideTeamId } = opts;
    const effDate = overrideDate || date;
    if (!effDate) return;
    setLoading(true);
    setError('');
    try {
      const params = { date: effDate };
      if (overrideTeamId !== undefined ? overrideTeamId : teamId) {
        params.team_id = overrideTeamId !== undefined ? overrideTeamId : teamId;
      }
      const { data, headers } = await axios.get('/api/owner/crew/day-summary', {
        withCredentials: true,
        params,
      });
      const list = Array.isArray(data?.teams) ? data.teams : Array.isArray(data) ? data : data?.summary ? [data.summary] : [];
      setSummaries(list);
      setWarnings(Array.isArray(data?.warnings) ? data.warnings : []);
    } catch (e) {
      const status = e?.response?.status;
      const requestId = e?.response?.headers?.['x-request-id'] || e?.response?.headers?.['x-requestid'];
      try {
        // eslint-disable-next-line no-console
        console.warn('[DaySummary] fetch failed', { endpoint: '/api/owner/crew/day-summary', status, requestId, date: overrideDate || date, orgId });
      } catch {}
      setSummaries([]);
      setWarnings([]);
      setError('friendly');
    } finally {
      setLoading(false);
    }
  }, [date, teamId, orgId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return {
    date,
    setDate,
    teamId,
    setTeamId,
    summaries,
    warnings,
    loading,
    error,
    refetch: fetchSummary,
  };
}

export default useCrewDaySummary;
