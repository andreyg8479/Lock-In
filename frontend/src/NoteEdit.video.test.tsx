/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "./AuthContext";
import NoteEdit, {
	NOTE_VIDEO_FILE_INPUT_ID,
	NOTE_INLINE_VIDEO_ID,
} from "./NoteEdit";

function renderNoteEdit() {
	return render(
		<AuthProvider>
			<MemoryRouter>
				<NoteEdit />
			</MemoryRouter>
		</AuthProvider>,
	);
}

afterEach(() => {
	cleanup();
});

describe("NoteEdit inline video", () => {
	it("renders video with a data URL src after attaching an MP4", async () => {
		renderNoteEdit();
		const select = document.getElementById(
			"note-edit-note-type",
		) as HTMLSelectElement;
		fireEvent.change(select, { target: { value: "video" } });

		const fileInput = document.getElementById(
			NOTE_VIDEO_FILE_INPUT_ID,
		) as HTMLInputElement;
		const mp4Bytes = new Uint8Array([
			0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70,
		]);
		const file = new File([mp4Bytes], "clip.mp4", { type: "video/mp4" });
		fireEvent.change(fileInput, { target: { files: [file] } });

		await waitFor(() => {
			const video = document.getElementById(
				NOTE_INLINE_VIDEO_ID,
			) as HTMLVideoElement | null;
			expect(video).not.toBeNull();
			expect(video!.getAttribute("src")).toMatch(/^data:video\/mp4;base64,/);
		});
	});
});
