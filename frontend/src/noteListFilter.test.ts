import { describe, it, expect } from "vitest";
import { filterNotesForList, notePassesDateRange } from "./noteListFilter";
import type { DisplayNote } from "../../shared_types/note_types";

function makeNote(
	overrides: Partial<DisplayNote> & Pick<DisplayNote, "note_title" | "created_at" | "updated_at">
): DisplayNote {
	return {
		user_id: "test",
		id: crypto.randomUUID(),
		note_text: "",
		iv_b64: "",
		pinned: false,
		second_password: null,
		client: false,
		note_type: "text",
		...overrides,
	};
}

describe("filterNotesForList", () => {
	it("returns all notes when search is empty and no date range is set", () => {
		const notes: DisplayNote[] = [
			makeNote({
				note_title: "Alpha",
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-06-01T00:00:00.000Z",
				note_type: "text",
			}),
			makeNote({
				note_title: "Beta",
				created_at: "2023-12-01T00:00:00.000Z",
				updated_at: "2024-03-15T00:00:00.000Z",
				note_type: "audio",
				client: true,
			}),
			makeNote({
				note_title: "Gamma",
				created_at: "2024-02-01T00:00:00.000Z",
				updated_at: "2024-02-10T00:00:00.000Z",
				note_type: "image",
			}),
		];

		expect(filterNotesForList(notes, "", "updated", "", "")).toEqual(notes);
	});

	it("filters by title search case-insensitively across note types", () => {
		const notes: DisplayNote[] = [
			makeNote({
				note_title: "Project Notes",
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-02T00:00:00.000Z",
				note_type: "text",
			}),
			makeNote({
				note_title: "Audio PROJECT",
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-03T00:00:00.000Z",
				note_type: "audio",
			}),
			makeNote({
				note_title: "Other",
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-04T00:00:00.000Z",
				note_type: "image",
			}),
		];

		const result = filterNotesForList(notes, "project", "updated", "", "");
		expect(result.map((n) => n.note_title)).toEqual(["Project Notes", "Audio PROJECT"]);
	});

	it("filters by updated date range (from / to) inclusively", () => {
		const notes: DisplayNote[] = [
			makeNote({
				note_title: "Before",
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-05-15T12:00:00.000Z",
				note_type: "text",
			}),
			makeNote({
				note_title: "Inside",
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-06-15T12:00:00.000Z",
				note_type: "audio",
			}),
			makeNote({
				note_title: "After",
				created_at: "2024-01-01T00:00:00.000Z",
				// Mid-July UTC stays in July in all real-world offsets (avoids midnight UTC edge cases).
				updated_at: "2024-07-15T12:00:00.000Z",
				note_type: "image",
			}),
		];

		const result = filterNotesForList(notes, "", "updated", "2024-06-01", "2024-06-30");
		expect(result.map((n) => n.note_title)).toEqual(["Inside"]);
	});

	it("uses created_at when dateFilterField is created", () => {
		const notes: DisplayNote[] = [
			makeNote({
				note_title: "Old create, new update",
				created_at: "2020-01-01T00:00:00.000Z",
				updated_at: "2024-12-01T00:00:00.000Z",
				note_type: "text",
			}),
			makeNote({
				note_title: "Recent create",
				created_at: "2024-06-10T00:00:00.000Z",
				updated_at: "2024-06-11T00:00:00.000Z",
				note_type: "text",
			}),
		];

		const result = filterNotesForList(notes, "", "created", "2024-06-01", "2024-06-30");
		expect(result.map((n) => n.note_title)).toEqual(["Recent create"]);
	});

	it("applies only dateFrom when dateTo is empty", () => {
		const notes: DisplayNote[] = [
			makeNote({
				note_title: "A",
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-05-01T00:00:00.000Z",
				note_type: "text",
			}),
			makeNote({
				note_title: "B",
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-07-01T00:00:00.000Z",
				note_type: "audio",
			}),
		];

		const result = filterNotesForList(notes, "", "updated", "2024-06-01", "");
		expect(result.map((n) => n.note_title)).toEqual(["B"]);
	});

	it("applies only dateTo when dateFrom is empty", () => {
		const notes: DisplayNote[] = [
			makeNote({
				note_title: "A",
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-05-01T00:00:00.000Z",
				note_type: "text",
			}),
			makeNote({
				note_title: "B",
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-08-01T12:00:00.000Z",
				note_type: "image",
			}),
		];

		const result = filterNotesForList(notes, "", "updated", "", "2024-06-30");
		expect(result.map((n) => n.note_title)).toEqual(["A"]);
	});

	it("combines search and date filter", () => {
		const notes: DisplayNote[] = [
			makeNote({
				note_title: "Report Q1",
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-06-15T00:00:00.000Z",
				note_type: "text",
			}),
			makeNote({
				note_title: "Report Q2",
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-08-01T00:00:00.000Z",
				note_type: "text",
			}),
			makeNote({
				note_title: "Other",
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-06-20T00:00:00.000Z",
				note_type: "text",
			}),
		];

		const result = filterNotesForList(notes, "report", "updated", "2024-06-01", "2024-06-30");
		expect(result.map((n) => n.note_title)).toEqual(["Report Q1"]);
	});

	it("excludes notes with unparseable timestamps when a date bound is set", () => {
		const bad: DisplayNote = makeNote({
			note_title: "Bad date",
			created_at: "not-a-date",
			updated_at: "not-a-date",
			note_type: "text",
		});
		const good: DisplayNote = makeNote({
			note_title: "Good",
			created_at: "2024-01-01T00:00:00.000Z",
			updated_at: "2024-06-15T00:00:00.000Z",
			note_type: "audio",
		});

		const result = filterNotesForList([bad, good], "", "updated", "2024-06-01", "2024-06-30");
		expect(result).toEqual([good]);
	});
});

describe("notePassesDateRange", () => {
	it("returns true when both bounds are empty regardless of field", () => {
		const note = makeNote({
			note_title: "N",
			created_at: "invalid",
			updated_at: "invalid",
			note_type: "text",
		});
		expect(notePassesDateRange(note, "updated", "", "")).toBe(true);
		expect(notePassesDateRange(note, "created", "", "")).toBe(true);
	});
});
