export type SortOption = 'byName' | 'byModified' | 'byCreated';

export type NoteForSort = {
  name: string;
  modified: Date | string;
  made: Date | string;
  pinned: boolean;
  [key: string]: unknown;
};

function compareName(a: NoteForSort, b: NoteForSort): number {
  return a.name.localeCompare(b.name);
}

function compareModified(a: NoteForSort, b: NoteForSort): number {
  return new Date(b.modified).getTime() - new Date(a.modified).getTime();
}

function compareCreated(a: NoteForSort, b: NoteForSort): number {
  return new Date(b.made).getTime() - new Date(a.made).getTime();
}

export function sortNotes(
  notes: NoteForSort[],
  sortBy: SortOption
): NoteForSort[] {
  console.log(sortBy)
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
