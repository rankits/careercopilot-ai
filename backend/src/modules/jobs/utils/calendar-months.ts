export function subtractCalendarMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  const expectedMonth = (result.getUTCMonth() - months) % 12;
  const targetMonth = expectedMonth < 0 ? expectedMonth + 12 : expectedMonth;
  
  result.setUTCMonth(result.getUTCMonth() - months);
  
  // If the month changed unexpectedly, it means the target month 
  // had fewer days than the starting month (e.g., March 31 minus 1 month -> Feb 28/29).
  // We clamp to the last day of the expected target month.
  if (result.getUTCMonth() !== targetMonth) {
    result.setUTCDate(0); // Set to the last day of the previous month
  }
  
  return result;
}
