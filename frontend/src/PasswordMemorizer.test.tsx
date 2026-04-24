/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PasswordMemorizer from "./PasswordMemorizer";

function renderPasswordMemorizer() {
	return render(
		<MemoryRouter>
			<PasswordMemorizer />
		</MemoryRouter>,
	);
}

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

describe("PasswordMemorizer", () => {
	it("clears the retry input when the password is correctly re-entered", () => {
		const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

		renderPasswordMemorizer();

		const passwordInput = screen.getByPlaceholderText("Enter Password");
		const retryInput = screen.getByPlaceholderText("Try to retype here");

		fireEvent.change(passwordInput, { target: { value: "mySecret123" } });
		fireEvent.change(retryInput, { target: { value: "mySecret123" } });

		expect((retryInput as HTMLInputElement).value).toBe("");
		expect(alertSpy).not.toHaveBeenCalled();
	});
});
