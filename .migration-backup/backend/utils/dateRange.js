import { subDays, startOfMonth, endOfMonth } from "date-fns";

export function getDateRange(range) {
  let startDate, endDate;

  if (range === "last7") {
    startDate = subDays(new Date(), 7);
    endDate = new Date();
  } else if (range === "last30") {
    startDate = subDays(new Date(), 30);
    endDate = new Date();
  } else if (range === "thisMonth") {
    startDate = startOfMonth(new Date());
    endDate = endOfMonth(new Date());
  }

  return { startDate, endDate };
}
