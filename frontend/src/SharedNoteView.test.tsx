/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import SharedNoteView from "./SharedNoteView";

const getShareMock = vi.fn();
const getAllNoteNamesMock = vi.fn();
const uploadNoteMock = vi.fn();
const getAllNotesClientMock = vi.fn();
const openShareBundleMock = vi.fn();
const decryptFilenamesMock = vi.fn();
const encryptNoteMock = vi.fn();

vi.mock("./AuthContext", () => ({
	useAuth: () => ({
		token: "token-1",
		userId: "user-1",
		vaultKey: {} as CryptoKey,
		rsaPrivateKey: {} as CryptoKey,
	}),
}));

vi.mock("./api", () => ({
	getShare: (...args: any[]) => getShareMock(...args),
	getAllNoteNames: (...args: any[]) => getAllNoteNamesMock(...args),
	uploadNote: (...args: any[]) => uploadNoteMock(...args),
}));

vi.mock("./client_storage", () => ({
	getAllNotesClient: (...args: any[]) => getAllNotesClientMock(...args),
}));

vi.mock("./crypto/lockinCrypto", () => ({
	openShareBundle: (...args: any[]) => openShareBundleMock(...args),
	decryptFilenames: (...args: any[]) => decryptFilenamesMock(...args),
	encryptNote: (...args: any[]) => encryptNoteMock(...args),
}));

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	getShareMock.mockReset();
	getAllNoteNamesMock.mockReset();
	uploadNoteMock.mockReset();
	getAllNotesClientMock.mockReset();
	openShareBundleMock.mockReset();
	decryptFilenamesMock.mockReset();
	encryptNoteMock.mockReset();
});

describe("SharedNoteView import conflict", () => {
	it("lets the user rename the incoming note when the default shared name already exists", async () => {
		getShareMock.mockResolvedValue({
			share: {
				id: "share-1",
				created_at: new Date().toISOString(),
				expires_at: null,
			},
			sender: { username: "alice" },
			viewerIsOwner: false,
		});
		openShareBundleMock.mockResolvedValue({
			note_title: "Trip Plan",
			note_text: "secret",
			note_type: "text",
		});
		getAllNoteNamesMock.mockResolvedValue({
			notes: [{ note_title: "encrypted-title-1" }],
		});
		getAllNotesClientMock.mockResolvedValue([]);
		decryptFilenamesMock.mockResolvedValue(["[Shared] Trip Plan"]);
		encryptNoteMock.mockImplementation(async (note: any) => note);
		uploadNoteMock.mockResolvedValue({ ok: true });

		const promptSpy = vi.spyOn(window, "prompt").mockReturnValue("Trip Plan (from Alice)");
		const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

		render(
			<MemoryRouter initialEntries={["/shared/share-1"]}>
				<Routes>
					<Route path="/shared/:id" element={<SharedNoteView />} />
				</Routes>
			</MemoryRouter>,
		);

		await waitFor(() => {
			expect(screen.getByRole("button", { name: "Import to my vault" })).toBeTruthy();
		});

		fireEvent.click(screen.getByRole("button", { name: "Import to my vault" }));

		await waitFor(() => {
			expect(promptSpy).toHaveBeenCalled();
			expect(uploadNoteMock).toHaveBeenCalled();
		});

		expect(uploadNoteMock).toHaveBeenCalledWith(
			expect.objectContaining({
				note_title: "Trip Plan (from Alice)",
			}),
		);
		expect(alertSpy).toHaveBeenCalledWith("Saved a copy to your vault.");
	});
});
