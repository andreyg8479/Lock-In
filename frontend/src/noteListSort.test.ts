// import { describe, it, expect } from "vitest";
// import { sortNotes } from "./noteListSort";
// import type { DisplayNote } from "../../shared_types/note_types";

// const makeNote = (
//   note_title: string,
//   updated_at: string,
//   created_at: string,
//   pinned = false
// ): DisplayNote => ({
//   user_id: "test",
//   id: crypto.randomUUID(),
//   note_title,
//   note_text: "",
//   iv_b64: "",
//   pinned,
//   updated_at,
//   created_at,
//   client: false
// });

// describe("sortNotes", () => {
//   it("always keeps pinned notes at the top (no matter the sort mode)", () => {
//     const notes: DisplayNote[] = [
//       makeNote("B", "2024-01-02", "2024-01-01"),
//       makeNote("A", "2024-01-03", "2024-01-02", true),
//       makeNote("C", "2024-01-01", "2024-01-03"),
//     ];

//     expect(sortNotes(notes, "byName")[0].note_title).toBe("A");
//     expect(sortNotes(notes, "byModified")[0].note_title).toBe("A");
//     expect(sortNotes(notes, "byCreated")[0].note_title).toBe("A");
//   });

//   it("sorts by name A–Z after pinned notes", () => {
//     const notes: DisplayNote[] = [
//       makeNote("Zebra", "2024-01-01", "2024-01-01"),
//       makeNote("Apple", "2024-01-01", "2024-01-01"),
//       makeNote("Mango", "2024-01-01", "2024-01-01", true),
//     ];

//     const result = sortNotes(notes, "byName");
//     expect(result.map((n) => n.note_title)).toEqual(["Mango", "Apple", "Zebra"]);
//   });

//   it("sorts by modified date (newest first) after pinned notes", () => {
//     const notes: DisplayNote[] = [
//       makeNote("First", "2024-01-01T00:00:00Z", "2024-01-01T00:00:00Z"),
//       makeNote("Second", "2024-01-03T00:00:00Z", "2024-01-01T00:00:00Z"),
//       makeNote("Third", "2024-01-02T00:00:00Z", "2024-01-01T00:00:00Z"),
//     ];

//     const result = sortNotes(notes, "byModified");
//     expect(result.map((n) => n.note_title)).toEqual(["Second", "Third", "First"]);
//   });

//   it("sorts by created date (newest first) after pinned notes", () => {
//     const notes: DisplayNote[] = [
//       makeNote("First", "2024-01-01T00:00:00Z", "2024-01-01T00:00:00Z"),
//       makeNote("Second", "2024-01-01T00:00:00Z", "2024-01-03T00:00:00Z"),
//       makeNote("Third", "2024-01-01T00:00:00Z", "2024-01-02T00:00:00Z"),
//     ];

//     const result = sortNotes(notes, "byCreated");
//     expect(result.map((n) => n.note_title)).toEqual(["Second", "Third", "First"]);
//   });

//   it("accepts ISO date strings for updated_at/created_at fields", () => {
//     const notes: DisplayNote[] = [
//       makeNote("A", "2024-01-01T00:00:00Z", "2024-01-01T00:00:00Z"),
//       makeNote("B", "2024-01-03T00:00:00Z", "2024-01-03T00:00:00Z"),
//       makeNote("C", "2024-01-02T00:00:00Z", "2024-01-02T00:00:00Z"),
//     ];

//     expect(sortNotes(notes, "byModified").map((n) => n.note_title)).toEqual(["B","C","A"]);

//     expect(sortNotes(notes, "byCreated").map((n) => n.note_title)).toEqual(["B","C","A"]);
//   });
// });