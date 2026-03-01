export type SortOption = 'byName' | 'byModified' | 'byCreated';

export type NoteForSort = {
  name: string;
  modified: Date | string;
  made: Date | string;
  pinned: boolean;
  [key: string]: unknown;
};


export function sortNotes(
  notes: NoteForSort[],
  sortBy: SortOption
): NoteForSort[] {
  const sorted = [...notes];
  sorted.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
  return sorted;
}
