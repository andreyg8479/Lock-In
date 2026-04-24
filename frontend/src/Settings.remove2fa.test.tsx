/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Settings from "./Settings";

const get2faStatusMock = vi.fn();

vi.mock("./AuthContext", () => ({
	useAuth: () => ({
		email: "user@example.com",
	}),
}));

vi.mock("./api", () => ({
	get2faStatus: (...args: any[]) => get2faStatusMock(...args),
	send2fa: vi.fn(),
	disable2fa: vi.fn(),
	enable2fa: vi.fn(),
	requestLogin: vi.fn(),
}));

vi.mock("./crypto/lockinCrypto", () => ({
	handleLogin: vi.fn(),
}));

function renderSettings() {
	return render(
		<MemoryRouter>
			<Settings />
		</MemoryRouter>,
	);
}

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	get2faStatusMock.mockReset();
});

describe("Settings remove 2FA", () => {
	it("shows password verification step when removing 2FA", async () => {
		get2faStatusMock.mockResolvedValue({ twoFaEnabled: true });

		renderSettings();

		const removeButton = screen.getByRole("button", { name: "Remove 2FA" });
		fireEvent.click(removeButton);

		await waitFor(() => {
			expect(screen.getByRole("button", { name: "Verify Password" })).toBeTruthy();
			expect(
				screen.getByPlaceholderText("Enter account password"),
			).toBeTruthy();
		});
	});
});
