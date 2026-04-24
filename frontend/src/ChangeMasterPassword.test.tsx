/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ChangeMasterPassword from "./ChangeMasterPassword";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
	const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
	return {
		...actual,
		useNavigate: () => mockNavigate,
	};
});

const mockSetToken = vi.fn();

vi.mock("./AuthContext", () => ({
	useAuth: () => ({
		username: "testuser",
		email: "test@example.com",
		token: "token-123",
		setToken: mockSetToken,
	}),
}));

vi.mock("./crypto/lockinCrypto", () => ({
	rewrapVaultKey: vi.fn().mockResolvedValue({
		ok: true,
		payload: {
			newSaltB64: "salt",
			newIvB64: "iv",
			newWrappedMasterKeyB64: "wrapped",
			newAuthHashB64: "auth",
			newIterations: 100000,
		},
	}),
}));

vi.mock("./api", () => ({
	requestLogin: vi.fn().mockResolvedValue({
		kdf: "PBKDF2",
		iterations: 100000,
		salt: "salt",
		cipher: "AES-GCM",
		iv: "iv",
		aes_key_length: 256,
		gcm_iv_length: 12,
		wrapped_master_key: "wrapped",
		version: 1,
	}),
	get2faStatus: vi.fn().mockResolvedValue({ twoFaEnabled: false }),
	send2fa: vi.fn().mockResolvedValue(undefined),
	changeMasterPasswordApi: vi.fn().mockResolvedValue({ token: "new-token-456" }),
}));

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
	mockNavigate.mockReset();
	mockSetToken.mockReset();
});

describe("ChangeMasterPassword", () => {
	it("allows changing the master password with valid inputs", async () => {
		const alertSpy = vi.fn();
		vi.stubGlobal("alert", alertSpy);

		renderChangeMasterPassword();

		const oldPasswordInput = screen.getByPlaceholderText("Enter current password");
		const newPasswordInput = screen.getByPlaceholderText("Create a new password");
		const confirmPasswordInput = screen.getByPlaceholderText("Re-enter new password");
		const updateButton = screen.getByRole("button", { name: "Update Password" });

		fireEvent.change(oldPasswordInput, { target: { value: "oldPassword123" } });
		fireEvent.change(newPasswordInput, { target: { value: "newPassword123" } });
		fireEvent.change(confirmPasswordInput, { target: { value: "newPassword123" } });
		fireEvent.click(updateButton);

		await waitFor(() => {
			expect(alertSpy).toHaveBeenCalledWith("Password updated successfully.");
		});
	});
});
