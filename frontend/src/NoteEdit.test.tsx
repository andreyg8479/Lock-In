/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "./AuthContext";
import NoteEdit, { NOTE_TYPE_SELECT_ID } from "./NoteEdit";

function renderNoteEdit() {
	return render(
		<AuthProvider>
			<MemoryRouter>
				<NoteEdit />
			</MemoryRouter>
		</AuthProvider>,
	);
}

describe("NoteEdit note type", () => {
	it("updates the selected note type when the type control is changed", () => {
		renderNoteEdit();
		const select = screen.getByRole("combobox") as HTMLSelectElement;
		expect(select.id).toBe(NOTE_TYPE_SELECT_ID);
		expect(select.value).toBe("text");

		fireEvent.change(select, { target: { value: "audio" } });
		expect(select.value).toBe("audio");

		fireEvent.change(select, { target: { value: "image" } });
		expect(select.value).toBe("image");
	});
});
