/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Settings from "./Settings";

const get2faStatusMock = vi.fn();
const enable2faMock = vi.fn();

vi.mock("./AuthContext", () => ({
	useAuth: () => ({
		email: "user@example.com",
	}),
}));

vi.mock("./api", () => ({
	get2faStatus: (...args: any[]) => get2faStatusMock(...args),
	send2fa: vi.fn(),
	disable2fa: vi.fn(),
	enable2fa: (...args: any[]) => enable2faMock(...args),
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
	enable2faMock.mockReset();
});

describe("Settings add 2FA", () => {
	it("adds 2FA when user clicks Add 2FA", async () => {
		get2faStatusMock.mockResolvedValue({ twoFaEnabled: false });
		enable2faMock.mockResolvedValue({ ok: true });
		const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

		renderSettings();

		fireEvent.click(screen.getByRole("button", { name: "Add 2FA" }));

		await waitFor(() => {
			expect(enable2faMock).toHaveBeenCalledWith({ email: "user@example.com" });
			expect(alertSpy).toHaveBeenCalledWith("2FA successfully added");
		});
	});
});
