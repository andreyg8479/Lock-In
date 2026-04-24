/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import ShareNoteDialog from "./ShareNoteDialog";
import type { DecryptedNote } from "../../shared_types/note_types";

const lookupUserByEmailMock = vi.fn();
const createShareMock = vi.fn();
const importPublicKeyB64Mock = vi.fn();
const createShareBundleMock = vi.fn();

vi.mock("./AuthContext", () => ({
	useAuth: () => ({
		token: "test-token",
		email: "sender@example.com",
	}),
}));

vi.mock("./api", () => ({
	lookupUserByEmail: (...args: any[]) => lookupUserByEmailMock(...args),
	createShare: (...args: any[]) => createShareMock(...args),
}));

vi.mock("./crypto/lockinCrypto", () => ({
	importPublicKeyB64: (...args: any[]) => importPublicKeyB64Mock(...args),
	createShareBundle: (...args: any[]) => createShareBundleMock(...args),
}));

function makeNote(): DecryptedNote {
	const now = new Date().toISOString();
	return {
		user_id: "u1",
		id: "note-123",
		note_title: "Shared test note",
		note_text: "secret content",
		iv_b64: "",
		pinned: false,
		note_type: "text",
		updated_at: now,
		created_at: now,
		second_password: null,
	};
}

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	lookupUserByEmailMock.mockReset();
	createShareMock.mockReset();
	importPublicKeyB64Mock.mockReset();
	createShareBundleMock.mockReset();
});

describe("ShareNoteDialog", () => {
	it("creates a secure shared copy for another user", async () => {
		lookupUserByEmailMock.mockResolvedValue({
			id: "recipient-1",
			username: "friend",
			publicKeySpkiB64: "public-key-b64",
		});
		importPublicKeyB64Mock.mockResolvedValue({} as CryptoKey);
		createShareBundleMock.mockResolvedValue({
			note_type: "text",
			note_title: "Shared test note",
			note_text: "encrypted-note-text",
			iv_text_b64: "iv-b64",
			encrypted_share_key_b64: "enc-share-key-b64",
		});
		createShareMock.mockResolvedValue({ ok: true, shareId: "share-42" });

		render(<ShareNoteDialog note={makeNote()} onClose={() => {}} />);

		fireEvent.change(screen.getByPlaceholderText("friend@example.com"), {
			target: { value: "friend@example.com" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Next" }));

		await waitFor(() => {
			expect(screen.getByText(/about to share this note with/i)).toBeTruthy();
		});

		fireEvent.click(screen.getByRole("button", { name: "Send" }));

		await waitFor(() => {
			expect(screen.getByText("Share created. The recipient has been emailed a link.")).toBeTruthy();
		});

		expect(createShareMock).toHaveBeenCalledWith(
			expect.objectContaining({
				recipientId: "recipient-1",
				sourceNoteId: "note-123",
				note_title: "Shared test note",
				encrypted_share_key_b64: "enc-share-key-b64",
			}),
			"test-token"
		);
	});
});
