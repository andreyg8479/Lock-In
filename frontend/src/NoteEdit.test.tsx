/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "./AuthContext";
import NoteEdit, {
	ADD_EXTRA_PASSWORD_BUTTON_ID,
	NOTE_AUDIO_FILE_INPUT_ID,
	NOTE_IMAGE_FILE_INPUT_ID,
	NOTE_INLINE_AUDIO_ID,
	NOTE_INLINE_IMAGE_ID,
	NOTE_INLINE_VIDEO_ID,
	NOTE_TYPE_SELECT_ID,
	NOTE_VIDEO_FILE_INPUT_ID,
	NOTE_VOICE_TRANSCRIPT_CHECKBOX_ID,
	SAVE_TO_CLIENT_BUTTON_ID,
	SAVE_TO_SERVER_BUTTON_ID,
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
	vi.restoreAllMocks();
});

describe("NoteEdit note type", () => {
	it("updates the selected note type when the type control is changed", () => {
		renderNoteEdit();
		const select = screen.getByRole("combobox") as HTMLSelectElement;
		expect(select.id).toBe(NOTE_TYPE_SELECT_ID);
		expect(select.value).toBe("text");

		fireEvent.change(select, { target: { value: "audio" } });
		expect(select.value).toBe("audio");

		fireEvent.change(select, { target: { value: "image" } });
		expect(select.value).toBe("image");
	});

	it("shows the voice transcript checkbox when note type is audio", () => {
		renderNoteEdit();
		const select = screen.getByRole("combobox") as HTMLSelectElement;
		fireEvent.change(select, { target: { value: "audio" } });
		const box = document.getElementById(NOTE_VOICE_TRANSCRIPT_CHECKBOX_ID);
		expect(box).not.toBeNull();
		expect((box as HTMLInputElement).type).toBe("checkbox");
	});
});

describe("NoteEdit optional second password", () => {
	it("opens the add-extra-password prompt when the button is clicked", () => {
		const promptSpy = vi
			.spyOn(window, "prompt")
			.mockReturnValue("extra-secret");
		const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

		renderNoteEdit();
		const button = document.getElementById(ADD_EXTRA_PASSWORD_BUTTON_ID);
		expect(button).not.toBeNull();
		fireEvent.click(button!);

		expect(promptSpy).toHaveBeenCalledWith(
			"Please enter the new extra password. (THIS CANNOT BE CHANGED)",
		);
		expect(alertSpy).toHaveBeenCalledWith(
			"Encryption key not available. Please log in again.",
		);
	});
});

describe("NoteEdit inline audio and image (view without downloading)", () => {
	it("renders audio with a data URL src after attaching an MP3", async () => {
		renderNoteEdit();
		const fileInput = document.getElementById(
			NOTE_AUDIO_FILE_INPUT_ID,
		) as HTMLInputElement;
		const file = new File([new Uint8Array([0xff, 0xfb, 0x90])], "clip.mp3", {
			type: "audio/mpeg",
		});
		fireEvent.change(fileInput, { target: { files: [file] } });

		await waitFor(() => {
			const audio = document.getElementById(
				NOTE_INLINE_AUDIO_ID,
			) as HTMLAudioElement | null;
			expect(audio).not.toBeNull();
			expect(audio!.getAttribute("src")).toMatch(/^data:audio\/mpeg;base64,/);
		});
	});

	it("renders an image with a data URL src after attaching a PNG", async () => {
		renderNoteEdit();
		const fileInput = document.getElementById(
			NOTE_IMAGE_FILE_INPUT_ID,
		) as HTMLInputElement;
		const pngBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);
		const file = new File([pngBytes], "pic.png", { type: "image/png" });
		fireEvent.change(fileInput, { target: { files: [file] } });

		await waitFor(() => {
			const img = document.getElementById(
				NOTE_INLINE_IMAGE_ID,
			) as HTMLImageElement | null;
			expect(img).not.toBeNull();
			expect(img!.getAttribute("src")).toMatch(/^data:image\/png;base64,/);
		});
	});

	it("renders a video with a data URL src after attaching an MP4", async () => {
		renderNoteEdit();
		const fileInput = document.getElementById(
			NOTE_VIDEO_FILE_INPUT_ID,
		) as HTMLInputElement;
		const file = new File([new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112])], "clip.mp4", {
			type: "video/mp4",
		});
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

describe("NoteEdit save destination (server vs client)", () => {
	it("exposes server and client save controls and runs their handlers when clicked", () => {
		const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
		const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		renderNoteEdit();
		const serverBtn = document.getElementById(SAVE_TO_SERVER_BUTTON_ID);
		const clientBtn = document.getElementById(SAVE_TO_CLIENT_BUTTON_ID);
		expect(serverBtn).not.toBeNull();
		expect(clientBtn).not.toBeNull();

		fireEvent.click(clientBtn!);
		expect(alertSpy).toHaveBeenCalledWith(
			"Encryption key not found. Please log in again.",
		);

		fireEvent.click(serverBtn!);
		expect(logSpy).toHaveBeenCalledWith("Not logged in");
	});
});
