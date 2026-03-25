import type { DisplayNote } from "../../shared_types/note_types";

export type SortOption = 'byName' | 'byModified' | 'byCreated';

function compareName(a: DisplayNote, b: DisplayNote): number {
  return a.note_title.localeCompare(b.note_title);
}

function compareModified(a: DisplayNote, b: DisplayNote): number {
  return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
}

function compareCreated(a: DisplayNote, b: DisplayNote): number {
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

export function sortNotes(
  notes: DisplayNote[],
  sortBy: SortOption
): DisplayNote[] {
  const sorted = [...notes];

  switch (sortBy) {
    case 'byName':
      sorted.sort(compareName);
      break;
    case 'byModified':
      sorted.sort(compareModified);
      break;
    case 'byCreated':
      sorted.sort(compareCreated);
      break;
  }

  sorted.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
  return sorted;
}
