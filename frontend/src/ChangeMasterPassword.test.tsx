/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ChangeMasterPassword from "./ChangeMasterPassword";

function renderChangeMasterPassword() {
	return render(
		<MemoryRouter>
			<ChangeMasterPassword />
		</MemoryRouter>,
	);
}

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

describe("ChangeMasterPassword", () => {
	it("allows changing the master password with valid inputs", () => {
		const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

		renderChangeMasterPassword();

		const oldPasswordInput = screen.getByPlaceholderText("Enter current password");
		const newPasswordInput = screen.getByPlaceholderText("Create a new password");
		const confirmPasswordInput = screen.getByPlaceholderText("Re-enter new password");
		const updateButton = screen.getByRole("button", { name: "Update Password" });

		fireEvent.change(oldPasswordInput, { target: { value: "oldPassword123" } });
		fireEvent.change(newPasswordInput, { target: { value: "newPassword123" } });
		fireEvent.change(confirmPasswordInput, { target: { value: "newPassword123" } });
		fireEvent.click(updateButton);

		expect(alertSpy).toHaveBeenCalledWith("Password updated successfully.");
	});
});
