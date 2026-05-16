// utils/billingDates.js
function computeNextDueDate(fromDate, dueDay /* 1..28 */, tz = 'America/New_York') {
  // Keep it simple: do it in UTC month math; if you store org tz, adjust with date-fns-tz or luxon.
  const d = new Date(fromDate);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const day = d.getUTCDate();

  // If we haven’t reached the dueDay yet this month, use this month; else next month.
  const targetMonth = (day <= dueDay) ? month : (month + 1);
  const target = new Date(Date.UTC(year, targetMonth, dueDay, 0, 0, 0));
  return target;
}

module.exports = { computeNextDueDate };
