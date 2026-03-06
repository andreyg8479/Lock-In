export type SortOption = 'byName' | 'byModified' | 'byCreated';

export type NoteForSort = {
  name: string;
  modified: Date | string;
  made: Date | string;
  pinned: boolean;
  [key: string]: unknown;
};

function compareByName(a: NoteForSort, b: NoteForSort): number {
  return a.name.localeCompare(b.name);
}

export function sortNotes(
  notes: NoteForSort[],
  sortBy: SortOption
): NoteForSort[] {
  console.log(sortBy)
      
  const sorted = [...notes];

    switch (sortBy) {
    case 'byName':
      sorted.sort(compareByName);
      break;
    case 'byModified':
      sorted.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
      break;
    case 'byCreated':
      sorted.sort((a, b) => new Date(b.made).getTime() - new Date(a.made).getTime());
      break;
  }

  sorted.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
  return sorted;
}
