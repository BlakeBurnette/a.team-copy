// hooks/useOccurrences.js
import { useEffect, useState } from 'react';
import { getScheduleWindow } from '../lib/api';
import { ymd } from '../lib/scheduleUtilsProxy';


export default function useOccurrences(headersFn, { mode, teamId, profile }, { rangeFrom, rangeTo }) {
const [occurrences, setOccurrences] = useState([]);
const [loading, setLoading] = useState(true);


const fetchAll = async () => {
setLoading(true);
try {
const headers = await headersFn();
const data = await getScheduleWindow(headers, ymd(rangeFrom), ymd(rangeTo));
let combined = Array.isArray(data?.occurrences) ? data.occurrences : Array.isArray(data) ? data : [];
combined = combined.map(o => ({ ...o, team_id: o.team_id ?? null }));


if (mode === 'crew') {
const tid = teamId ?? profile?.team_id ?? profile?.teamId ?? null;
if (tid != null) combined = combined.filter(o => Number(o.team_id) === Number(tid));
}
setOccurrences(combined);
} finally {
setLoading(false);
}
};


useEffect(() => { fetchAll(); /* eslint-disable-next-line */ }, [mode, teamId, rangeFrom, rangeTo]);


return { occurrences, setOccurrences, loading, fetchAll };
}
