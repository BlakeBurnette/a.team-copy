// hooks/useScheduleRange.js
import { useMemo, useState, useCallback } from 'react';
import { addDays, startOfToday, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';


export default function useScheduleRange(gridSpan = '7', daysCount = 7) {
const span = Number.isFinite(daysCount) && daysCount > 0 ? Math.floor(daysCount) : 7;
const [rangeFrom, setRangeFrom] = useState(startOfToday());
const [rangeTo, setRangeTo] = useState(addDays(startOfToday(), span - 1));


const days = useMemo(() => {
const s = startOfMonth(rangeFrom);
const e = endOfMonth(rangeFrom);
if (gridSpan === 'month') return eachDayOfInterval({ start: s, end: e });
return eachDayOfInterval({ start: rangeFrom, end: rangeTo });
}, [rangeFrom, rangeTo, gridSpan]);


const nextRange = useCallback(() => {
const from = addDays(rangeFrom, span);
setRangeFrom(from);
setRangeTo(addDays(from, span - 1));
}, [rangeFrom, span]);


const prevRange = useCallback(() => {
const from = addDays(rangeFrom, -span);
setRangeFrom(from);
setRangeTo(addDays(from, span - 1));
}, [rangeFrom, span]);


return { rangeFrom, rangeTo, setRangeFrom, setRangeTo, days, nextRange, prevRange };
}
