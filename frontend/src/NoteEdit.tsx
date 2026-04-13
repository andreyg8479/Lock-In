import { useEffect, useState } from 'react'
import { useAuth } from "./AuthContext";
import {  useRef} from 'react'
import { useLocation, useNavigate } from "react-router-dom";
import { getNote, uploadNote, updateNote, deleteNote } from "./api";
import { encryptNote, decryptNote, encryptSecondPassword } from "./crypto/lockinCrypto";
import { saveNoteClient, getNoteClient } from "./client_storage";
import type { EncryptedNote, DecryptedNote, NoteType } from "../../shared_types/note_types";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
import './NoteEdit.css'

export const NOTE_TYPE_SELECT_ID = "note-edit-note-type";
export const ADD_EXTRA_PASSWORD_BUTTON_ID = "note-edit-add-extra-password";
export const SAVE_TO_SERVER_BUTTON_ID = "note-edit-save-server";
export const SAVE_TO_CLIENT_BUTTON_ID = "note-edit-save-client";
export const NOTE_AUDIO_FILE_INPUT_ID = "note-edit-audio-file";
export const NOTE_IMAGE_FILE_INPUT_ID = "note-edit-image-file";
export const NOTE_INLINE_AUDIO_ID = "note-edit-inline-audio";
export const NOTE_INLINE_IMAGE_ID = "note-edit-inline-image";
export const NOTE_VIDEO_FILE_INPUT_ID = "note-edit-video-file";
export const NOTE_INLINE_VIDEO_ID = "note-edit-inline-video";
import { useKeyComboDetector } from './useKeyComboDetector'
import { getAlt, getCtrl, getKey, getShift } from './SettingsMem'

function NoteEdit() {
	const navigate = useNavigate();
	const { userId, vaultKey } = useAuth();
	
	//for getting the note name if we come here from list
	const location = useLocation();
	const locationState = location.state || {};
	const ogNoteId = locationState.noteId;
	const ogNoteName = locationState.noteName;
	const ogNoteClient = locationState.client || false; //true = client, false = server
	
	const [noteId, setNoteId] = useState<string | null>(ogNoteId || null);
	const [existsOnServer, setExistsOnServer] = useState(ogNoteId && !ogNoteClient ? true : false);
	const [pinned, setPinned] = useState(false);
	
	const [title, setTitle] = useState(ogNoteName ?? "Untitled Document");
	const [content, setContent] = useState("");
	const [noteType, setNoteType] = useState<NoteType>('text');
	const [isNoteInfoHidden, setIsNoteInfoHidden] = useState(false);
	const hideButtonRef = useRef<HTMLButtonElement | null>(null);
	const audioFileInputRef = useRef<HTMLInputElement | null>(null);
	const imageFileInputRef = useRef<HTMLInputElement | null>(null);
	const videoFileInputRef = useRef<HTMLInputElement | null>(null);
	
	const [extraPassword, setExtraPassword] = useState(false);
	const [secondPasswordB64, setSecondPasswordB64] = useState<string | null>(null);
	
	const [confirming, setConfirming] = useState(false);
	const [isDragging, setIsDragging] = useState(false);
	const hideCombo = {
		key: getKey(),
		shift: getShift(),
		alt: getAlt(),
		ctrl: getCtrl(),
	} as const;

	useKeyComboDetector(
		hideCombo,
		() => {
			hideButtonRef.current?.click();
		},
		{ preventDefault: true }
	);
  
	useEffect(() => {
	
		//clear the location state stuff
		if (window.history.replaceState) {
		  window.history.replaceState({}, document.title);
		}
		
		const fetchNote = async () => {
			if (ogNoteId) {
				if (ogNoteClient) {
					// Client-side fetch
					console.log("Loading from Client Storage...");
					try {
						const encryptedNote = await getNoteClient(ogNoteId);
						if (encryptedNote && vaultKey) {
							const decrypted = await decryptNote(encryptedNote, vaultKey);
							setContent(decrypted.note_text);
							setPinned(decrypted.pinned);
							setTitle(decrypted.note_title);
							setNoteType(encryptedNote.note_type || 'text');
							if (encryptedNote.second_password) {
								setSecondPasswordB64(encryptedNote.second_password);
								setExtraPassword(true);
							}
						}
					} catch (e) {
						console.error("Client load error:", e);
						alert(
							`Failed to load this note from this device.\n\n${e instanceof Error ? e.message : String(e)}`,
						);
					}
				} else {
					// Server-side fetch
					if (!userId) {
						console.error("User ID missing");
						return;
					}

					try {
						console.log("Requesting Note via API");
						const response = await getNote({ noteId: ogNoteId, userID: userId });

						if (response.note && response.note.length > 0) {
							const noteData = response.note[0] as EncryptedNote;

							if (vaultKey) {
								try {
									const decrypted = await decryptNote(noteData, vaultKey);
									setContent(decrypted.note_text);
									setPinned(decrypted.pinned);
									setTitle(decrypted.note_title);								setNoteType(noteData.note_type || 'text');								} catch (e) {
									console.error("Decryption failed:", e);
									alert("Failed to decrypt note. Check your key.");
								}
							} else {
								console.warn("No vault key available to decrypt note");
							}

							setNoteId(noteData.id);
							setExistsOnServer(true);
							if (noteData.second_password) {
								setSecondPasswordB64(noteData.second_password);
								setExtraPassword(true);
							}
						}
					} catch (error) {
						console.error("Error fetching note:", error);
					}
			}
		} else {
			console.log("no note selected, want to make new note");
		}

	   };

		fetchNote();
		
	}, [ogNoteId, ogNoteClient]);
	

	
	const doSaveServer = async () => { 
		if (!userId) {
			console.log("Not logged in"); 
			return;
		}
		
		if (!vaultKey) {
			alert("Encryption key not found. Please log in again.");
			return;
		}

		try {
			const now = new Date().toISOString();

			const noteToEncrypt: DecryptedNote = {
				user_id: userId,
				id: noteId ?? "",
				note_title: title,
				note_text: content,
				iv_b64: "",
				pinned: pinned,
				note_type: noteType,
				updated_at: now,
				created_at: now,
				second_password: secondPasswordB64
			};

			const encryptedNote = await encryptNote(noteToEncrypt, vaultKey);

			if (!existsOnServer) { 
				console.log("Creating new note...");
				const result = await uploadNote(encryptedNote);
				setNoteId(String(result.id));
				setExistsOnServer(true);
				alert("Note Created!");
				navigate("/NoteList");
			} else {
				console.log("Updating note...");
				await updateNote(encryptedNote);
				alert("Note Updated!");
			}
		} catch (error) {
			console.error("Save failed:", error);
			alert("Failed to save note.");
		}
	}
	
	const doSaveClient = async () => {
		if (!vaultKey) {
			alert("Encryption key not found. Please log in again.");
			return;
		}
		
		try {
			const id = noteId || crypto.randomUUID();
			const now = new Date().toISOString();

			const noteToEncrypt: DecryptedNote = {
				user_id: userId || "offline-user",
				id: id,
				note_title: title,
				note_text: content,
				iv_b64: "",
				pinned: pinned,
				note_type: noteType,
				updated_at: now,
				created_at: now,
				second_password: secondPasswordB64
			};

			const encryptedNote = await encryptNote(noteToEncrypt, vaultKey);
			await saveNoteClient(encryptedNote);
			
			setNoteId(id);
			alert("Saved to Client Storage!");
		} catch (error) {
			console.error("Client save failed:", error);
			alert("Failed to save to client storage.");
		}
	}
	
	const togglePin = () => {
		setPinned(!pinned);
	}
	
	const doBack = () => {
		navigate("/NoteList");
	}

	const toggleNoteInfoVisibility = () => {
		setIsNoteInfoHidden((prev) => !prev);
	}

	const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
		const bytes = new Uint8Array(buffer);
		const chunkSize = 0x8000;
		let binary = "";

		for (let i = 0; i < bytes.length; i += chunkSize) {
			const chunk = bytes.subarray(i, i + chunkSize);
			binary += String.fromCharCode(...chunk);
		}

		return btoa(binary);
	}

	const ACCEPTED_MIME_TYPES: Record<string, NoteType> = {
		'audio/mpeg': 'audio',
		'image/png': 'image',
		'image/jpeg': 'image',
		'video/mp4': 'video',
	};

	const processFile = async (file: File) => {
		const detectedType = ACCEPTED_MIME_TYPES[file.type];
		if (!detectedType) {
			alert("Unsupported file type. Accepted: MP3, PNG, JPEG, MP4.");
			return;
		}
		if (file.size > MAX_FILE_SIZE) {
			alert("File exceeds 10 MB limit.");
			return;
		}
		if (content) {
			if (!confirm("This will replace the current note content. Continue?")) return;
		}
		try {
			const buffer = await file.arrayBuffer();
			setContent(arrayBufferToBase64(buffer));
			setNoteType(detectedType);
		} catch (error) {
			console.error("Failed to process file:", error);
			alert("Failed to process the selected file.");
		}
	};

	const attachFile = () => {
		if (noteType === 'audio') {
			audioFileInputRef.current?.click();
		} else if (noteType === 'image') {
			imageFileInputRef.current?.click();
		} else if (noteType === 'video') {
			videoFileInputRef.current?.click();
		}
	}

	const doCancel = () => {
		setConfirming(false);
	}

	const addExtraPassword = async () => {
		
		if (extraPassword) {
			alert("This note already has an extra password!");
		} else {
			const extraPass = prompt("Please enter the new extra password. (THIS CANNOT BE CHANGED)");
			
			if (!extraPass) {
				alert("No new password was added");
			} else if (!vaultKey) {
				alert("Encryption key not available. Please log in again.");
			} else {
				try {
					const encryptedPass = await encryptSecondPassword(extraPass, vaultKey);
					setSecondPasswordB64(encryptedPass);
					setExtraPassword(true);
					alert("An extra password has been set. Save the note to persist this change. If you forget this password, you will not be able to access this note again.");
				} catch (e) {
					console.error("Failed to encrypt second password:", e);
					alert("Failed to set extra password.");
				}
			}
		}
		
	}
	
	const doDelete = async () => {
		if (!confirming) {
			setConfirming(true);
		} else {
			try {
				if (!userId) {
					console.error("User ID missing");
					return;
				}
				if (title) { 
					await deleteNote({ note_title: title, user_id: userId });
					navigate("/NoteList");
				}
			} catch (error) {
				console.error("Delete failed:", error);
				alert(
					`Failed to delete the note.\n\n${error instanceof Error ? error.message : String(error)}`,
				);
			}
			setConfirming(false);
		}
	}

  return (
	<div className="note-page">
		<input
			ref={audioFileInputRef}
			id={NOTE_AUDIO_FILE_INPUT_ID}
			type="file"
			accept=".mp3,audio/mpeg"
			style={{ display: 'none' }}
			onChange={(e) => {
				const file = e.target.files?.[0];
				if (file) processFile(file);
				e.target.value = '';
			}}
		/>
		<input
			ref={imageFileInputRef}
			id={NOTE_IMAGE_FILE_INPUT_ID}
			type="file"
			accept=".png,.jpg,.jpeg,image/png,image/jpeg"
			style={{ display: 'none' }}
			onChange={(e) => {
				const file = e.target.files?.[0];
				if (file) processFile(file);
				e.target.value = '';
			}}
		/>
		<input
			ref={videoFileInputRef}
			id={NOTE_VIDEO_FILE_INPUT_ID}
			type="file"
			accept=".mp4,video/mp4"
			style={{ display: 'none' }}
			onChange={(e) => {
				const file = e.target.files?.[0];
				if (file) processFile(file);
				e.target.value = '';
			}}
		/>
	
		<input
			className={`note-title ${isNoteInfoHidden ? "note-info-hidden" : ""}`}
			type="text"
			value={title}
			onChange={(e) => setTitle(e.target.value)}
		/>
	
		<div className="buttons">
		
			<button onClick={doBack}>
			Exit
			</button>
			
			<button id={SAVE_TO_SERVER_BUTTON_ID} onClick={doSaveServer}>
			{noteId && !ogNoteClient ? "Save to Server" : "Upload to Server"}
			</button>
			
			<button id={SAVE_TO_CLIENT_BUTTON_ID} onClick={doSaveClient}>
			{noteId && ogNoteClient ? "Save to Client" : "Save to Client"}
			</button>
			
			<button onClick={togglePin}>
			{pinned ? "Unpin" : "Pin"}
			</button>
			
			<button onClick={attachFile}>
			Attach File
			</button>
			<select
				id={NOTE_TYPE_SELECT_ID}
				value={noteType}
				onChange={(e) => {
					const newType = e.target.value as NoteType;
					if (noteType !== 'text' && newType === 'text') {
						if (!confirm("Switching to text will clear the current media content. Continue?")) return;
						setContent("");
					}
					setNoteType(newType);
				}}
			>
				<option value="text">Text</option>
				<option value="audio">Audio</option>
				<option value="image">Image</option>
				<option value="video">Video</option>
			</select>
			
			<button onClick={doDelete}>
			{confirming ? "Positive?" : "Delete"}
			</button>

			<button ref={hideButtonRef} onClick={toggleNoteInfoVisibility}>
			{isNoteInfoHidden ? "Unhide Note Info" : "Hide Note Info"}
			</button>
			
			{confirming && (
				<button onClick={doCancel}>Cancel</button>
			)}
			
			<button id={ADD_EXTRA_PASSWORD_BUTTON_ID} onClick={addExtraPassword}>
			Add Extra Password
			</button>
			{/* more buttons probably */}
			
			
		</div>
		
		<div
			className={`drop-zone ${isDragging ? "drop-zone-active" : ""}`}
			onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
			onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
			onDragLeave={() => setIsDragging(false)}
			onDrop={(e) => {
				e.preventDefault();
				setIsDragging(false);
				const file = e.dataTransfer.files?.[0];
				if (file) processFile(file);
			}}
		>
			{noteType === 'text' && (
				<textarea
					className={`note-text ${isNoteInfoHidden ? "note-info-hidden" : ""}`}
					placeholder="Write note here"
					value={content}
					onChange={(e) => setContent(e.target.value)}
				/>
			)}

			{noteType === 'audio' && content && (
				<div className={`note-media ${isNoteInfoHidden ? "note-info-hidden" : ""}`}>
					<audio
						id={NOTE_INLINE_AUDIO_ID}
						controls
						src={`data:audio/mpeg;base64,${content}`}
					/>
				</div>
			)}

			{noteType === 'image' && content && (
				<div className={`note-media ${isNoteInfoHidden ? "note-info-hidden" : ""}`}>
					<img
						id={NOTE_INLINE_IMAGE_ID}
						src={`data:image/png;base64,${content}`}
						alt={title}
						className="note-image"
					/>
				</div>
			)}

			{noteType === 'video' && content && (
				<div className={`note-media ${isNoteInfoHidden ? "note-info-hidden" : ""}`}>
					<video
						id={NOTE_INLINE_VIDEO_ID}
						controls
						className="note-video"
						src={`data:video/mp4;base64,${content}`}
					/>
				</div>
			)}

			{noteType !== 'text' && !content && (
				<div className={`note-media drop-placeholder ${isNoteInfoHidden ? "note-info-hidden" : ""}`}>
					Drag &amp; drop a file here, or click Attach File
				</div>
			)}
		</div>
	</div>
  )
}

export default NoteEdit;
