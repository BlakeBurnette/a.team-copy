// utils/dates.js
import { format } from 'date-fns';


export const ymdToLocalDate = (s) => {
const [y, m, d] = String(s).split('-').map(Number);
return new Date(y, (m || 1) - 1, d || 1);
};


export const formatRangeLabel = (from, to) => `${format(from, 'MMM d')} — ${format(to, 'MMM d')}`;
