import type { DisplayNote } from "../../shared_types/note_types";

export type DateFilterField = "created" | "updated";

export function notePassesDateRange(
	note: DisplayNote,
	field: DateFilterField,
	dateFrom: string,
	dateTo: string
): boolean {
	if (!dateFrom && !dateTo) return true;
	const t = new Date(field === "created" ? note.created_at : note.updated_at).getTime();
	if (Number.isNaN(t)) return false;
	const fromMs = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
	const toMs = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null;
	if (fromMs !== null && t < fromMs) return false;
	if (toMs !== null && t > toMs) return false;
	return true;
}

/** Search + date filters applied in `displayNotes` before sorting. */
export function filterNotesForList(
	notes: DisplayNote[],
	searchTerm: string,
	dateFilterField: DateFilterField,
	dateFrom: string,
	dateTo: string
): DisplayNote[] {
	return notes
		.filter((note) => note.note_title.toLowerCase().includes(searchTerm.toLowerCase()))
		.filter((note) => notePassesDateRange(note, dateFilterField, dateFrom, dateTo));
}
