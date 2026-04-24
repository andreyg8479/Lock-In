/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NoteEdit, { ADD_EXTRA_PASSWORD_BUTTON_ID } from "./NoteEdit";

vi.mock("./AuthContext", () => ({
	useAuth: () => ({
		userId: "user-1",
		vaultKey: {} as CryptoKey,
	}),
}));

vi.mock("./crypto/lockinCrypto", async () => {
	const actual = await vi.importActual("./crypto/lockinCrypto");
	return {
		...actual,
		encryptSecondPassword: vi.fn(async () => "encrypted-pass-b64"),
	};
});

function renderNoteEdit() {
	return render(
		<MemoryRouter>
			<NoteEdit />
		</MemoryRouter>,
	);
}

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

describe("NoteEdit remove optional password", () => {
	it("lets the user remove the extra password on a note", async () => {
		const promptSpy = vi
			.spyOn(window, "prompt")
			.mockReturnValueOnce("my-extra-pass")
			.mockReturnValueOnce("");
		const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

		renderNoteEdit();
		const button = document.getElementById(ADD_EXTRA_PASSWORD_BUTTON_ID);
		expect(button).not.toBeNull();

		fireEvent.click(button!);
		await waitFor(() => {
			expect(alertSpy).toHaveBeenCalledWith(
				"An extra password has been set. Save the note to persist this change. If you forget this password, you will not be able to access this note again.",
			);
		});

		fireEvent.click(button!);
		await waitFor(() => {
			expect(promptSpy).toHaveBeenLastCalledWith(
				"Please insert the current extra password to remove it",
			);
			expect(alertSpy).toHaveBeenCalledWith("Extra Password Removed");
		});
		expect(screen.getByRole("button", { name: "Add Extra Password" })).toBeTruthy();
	});
});
