/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "./AuthContext";
import Login, { LOGIN_EMAIL_INPUT_ID } from "./Login";

function renderLogin() {
	return render(
		<AuthProvider>
			<MemoryRouter>
				<Login />
			</MemoryRouter>
		</AuthProvider>,
	);
}

describe("Login email (used for 2FA)", () => {
	it("updates the email value when the user edits the email field", () => {
		renderLogin();
		const input = document.getElementById(LOGIN_EMAIL_INPUT_ID) as HTMLInputElement;
		expect(input.value).toBe("");

		fireEvent.change(input, { target: { value: "user@example.com" } });
		expect(input.value).toBe("user@example.com");
	});
});
