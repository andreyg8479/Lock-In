import { describe, it, expect } from "vitest";
import { sortNotes, type NoteForSort } from "./noteListSort";

const makeNote = (
  name: string,
  modified: Date | string,
  made: Date | string,
  pinned = false
): NoteForSort => ({ name, modified, made, pinned });

describe("sortNotes", () => {
  it("always keeps pinned notes at the top (no matter the sort mode)", () => {
    const notes: NoteForSort[] = [
      makeNote("B", "2024-01-02", "2024-01-01"),
      makeNote("A", "2024-01-03", "2024-01-02", true),
      makeNote("C", "2024-01-01", "2024-01-03"),
    ];

    expect(sortNotes(notes, "byName")[0].name).toBe("A");
    expect(sortNotes(notes, "byModified")[0].name).toBe("A");
    expect(sortNotes(notes, "byCreated")[0].name).toBe("A");
  });

  it("sorts by name A–Z after pinned notes", () => {
    const notes: NoteForSort[] = [
      makeNote("Zebra", "2024-01-01", "2024-01-01"),
      makeNote("Apple", "2024-01-01", "2024-01-01"),
      makeNote("Mango", "2024-01-01", "2024-01-01", true),
    ];

    const result = sortNotes(notes, "byName");
    expect(result.map((n) => n.name)).toEqual(["Mango", "Apple", "Zebra"]);
  });

  it("sorts by modified date (newest first) after pinned notes", () => {
    const notes: NoteForSort[] = [
      makeNote("First", "2024-01-01T00:00:00Z", "2024-01-01T00:00:00Z"),
      makeNote("Second", "2024-01-03T00:00:00Z", "2024-01-01T00:00:00Z"),
      makeNote("Third", "2024-01-02T00:00:00Z", "2024-01-01T00:00:00Z"),
    ];

    const result = sortNotes(notes, "byModified");
    expect(result.map((n) => n.name)).toEqual(["Second", "Third", "First"]);
  });

  it("sorts by created date (made) (newest first) after pinned notes", () => {
    const notes: NoteForSort[] = [
      makeNote("First", "2024-01-01T00:00:00Z", "2024-01-01T00:00:00Z"),
      makeNote("Second", "2024-01-01T00:00:00Z", "2024-01-03T00:00:00Z"),
      makeNote("Third", "2024-01-01T00:00:00Z", "2024-01-02T00:00:00Z"),
    ];

    const result = sortNotes(notes, "byCreated");
    expect(result.map((n) => n.name)).toEqual(["Second", "Third", "First"]);
  });

  it("accepts ISO date strings for modified/made fields", () => {
    const notes: NoteForSort[] = [
      makeNote("A", "2024-01-01T00:00:00Z", "2024-01-01T00:00:00Z"),
      makeNote("B", "2024-01-03T00:00:00Z", "2024-01-03T00:00:00Z"),
      makeNote("C", "2024-01-02T00:00:00Z", "2024-01-02T00:00:00Z"),
    ];

    expect(sortNotes(notes, "byModified").map((n) => n.name)).toEqual(["B","C","A"]);

    expect(sortNotes(notes, "byCreated").map((n) => n.name)).toEqual(["B","C","A"]);
  });
});