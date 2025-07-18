import { format, isAfter, isThisWeek, isThisYear, isToday, isYesterday, subDays } from 'date-fns';
import type { SimpleConversationResponse } from '~/lib/persistence/conversations';

type Bin = { category: string; items: SimpleConversationResponse[] };

export function binDates(_list: SimpleConversationResponse[]) {
  const list = _list.toSorted((a, b) => b.updatedAt - a.updatedAt);

  const binLookup: Record<string, Bin> = {};
  const bins: Array<Bin> = [];

  list.forEach((item) => {
    const category = dateCategory(new Date(item.updatedAt));

    if (!(category in binLookup)) {
      const bin = {
        category,
        items: [item],
      };

      binLookup[category] = bin;

      bins.push(bin);
    } else {
      binLookup[category].items.push(item);
    }
  });

  return bins;
}

function dateCategory(date: Date) {
  if (isToday(date)) {
    return 'Today';
  }

  if (isYesterday(date)) {
    return 'Yesterday';
  }

  if (isThisWeek(date)) {
    // e.g., "Mon" instead of "Monday"
    return format(date, 'EEE');
  }

  const thirtyDaysAgo = subDays(new Date(), 30);

  if (isAfter(date, thirtyDaysAgo)) {
    return 'Past 30 Days';
  }

  if (isThisYear(date)) {
    // e.g., "Jan" instead of "January"
    return format(date, 'LLL');
  }

  // e.g., "Jan 2023" instead of "January 2023"
  return format(date, 'LLL yyyy');
}
