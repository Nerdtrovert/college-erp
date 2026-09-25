interface Announcement {
  id: number;
  title: string;
  body: string;
  category: string;
  date: string;
  author: string;
  pinned?: boolean;
}

/**
 * Sort announcements with pinned items first, then by date (newest first), then by ID (highest first)
 * @param items - Array of announcements to sort
 * @returns Sorted array of announcements
 */
export const sortAnnouncements = (items: Announcement[]): Announcement[] => {
  return [...items].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;

    const dateDifference = Date.parse(b.date) - Date.parse(a.date);
    if (!Number.isNaN(dateDifference) && dateDifference !== 0) return dateDifference;

    return b.id - a.id;
  });
}