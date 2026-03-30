import { useEffect, useState } from 'react'
import { useAuth } from "./AuthContext";
import {  useRef} from 'react'
import { useLocation, useNavigate } from "react-router-dom";
import { getNote, uploadNote, updateNote, deleteNote } from "./api";
import { encryptNote, decryptNote } from "./crypto/lockinCrypto";
import { saveNoteClient, getNoteClient } from "./client_storage";
import type { EncryptedNote, DecryptedNote } from "../../shared_types/note_types";
import './NoteEdit.css'
import { useKeyComboDetector } from './useKeyComboDetector'
import { getAlt, getKey, getShift } from './SettingsMem'

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
	const [pinned, setPinned] = useState(false);
	
	const [title, setTitle] = useState(ogNoteName ?? "Untitled Document");
	const [content, setContent] = useState("");
	const [isNoteInfoHidden, setIsNoteInfoHidden] = useState(false);
	const hideButtonRef = useRef<HTMLButtonElement | null>(null);
	const audioFileInputRef = useRef<HTMLInputElement | null>(null);
	
	const [extraPassword, setExtraPassword] = useState(false);
	
	const [confirming, setConfirming] = useState(false);
	const [attachFileKind, setAttachFileKind] = useState<'audio' | 'image'>('audio');
	const hideCombo = {
		key: getKey(),
		shift: getShift(),
		alt: getAlt(),
		ctrl: true,
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
						}
					} catch (e) {
						console.error("Client load error:", e);
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
									setTitle(decrypted.note_title);
								} catch (e) {
									console.error("Decryption failed:", e);
									alert("Failed to decrypt note. Check your key.");
								}
							} else {
								console.warn("No vault key available to decrypt note");
							}

							setNoteId(noteData.id);
							setExtraPassword(false); //TODO, make this true if the note already has an extra password
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
				note_type: 'text',
				updated_at: now,
				created_at: now
			};

			const encryptedNote = await encryptNote(noteToEncrypt, vaultKey);

			if (noteId == null) { 
				console.log("Creating new note...");
				const result = await uploadNote(encryptedNote);
				setNoteId(String(result.id));
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
				note_type: 'text',
				updated_at: now,
				created_at: now
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
	
	const attachFile = () => {
		if (attachFileKind !== 'audio') return;
		audioFileInputRef.current?.click();
	}

	const doCancel = () => {
		setConfirming(false);
	}

	const addExtraPassword = () => {
		
		if (extraPassword) {
			alert("This note already has an extra password!");
		} else {
			const extraPass = prompt("Please enter the new extra password. (THIS CANNOT BE CHANGED");
			
			if (extraPass == "") {
				alert("No new password was added");
			} else {
			
				//SEND THE NEW PASSWORD TO THE DATABASE HERE
				
				setExtraPassword(true);
				
				alert("An extra password has been set. If you forget this, you will not be able to access this note again");
			
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
			}
			setConfirming(false);
		}
	}

  return (
	<div className="note-page">
		<input
			ref={audioFileInputRef}
			type="file"
			accept=".mp3,audio/mpeg"
			style={{ display: 'none' }}
			onChange={async (e) => {
				const file = e.target.files?.[0];
				if (!file || attachFileKind !== 'audio') {
					e.target.value = '';
					return;
				}

				try {
					const buffer = await file.arrayBuffer();
					const now = new Date().toISOString();
					const audioAsString = arrayBufferToBase64(buffer);

					// TODO: String object for saving on DB and encrypting (you can use this to save, encrypt, decrypt, view)
					const audioNoteDraft: DecryptedNote = {
						user_id: userId || "offline-user",
						id: noteId ?? "",
						note_title: title,
						note_text: audioAsString,
						iv_b64: "",
						pinned: pinned,
						note_type: 'audio',
						updated_at: now,
						created_at: now
					};

					setContent(audioNoteDraft.note_text);
				} catch (error) {
					console.error("Failed to convert audio file:", error);
					alert("Failed to process selected audio file.");
				} finally {
					e.target.value = '';
				}
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
			
			<button onClick={doSaveServer}>
			{noteId && !ogNoteClient ? "Save to Server" : "Upload to Server"}
			</button>
			
			<button onClick={doSaveClient}>
			{noteId && ogNoteClient ? "Save to Client" : "Save to Client"}
			</button>
			
			<button onClick={togglePin}>
			{pinned ? "Unpin" : "Pin"}
			</button>
			
			<button onClick={attachFile}>
			Make File Note
			</button>
			<select
				value={attachFileKind}
				onChange={(e) => setAttachFileKind(e.target.value as 'audio' | 'image')}
			>
				<option value="audio">Audio</option>
				<option value="image">Image</option>
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
			
			<button onClick={addExtraPassword}>
			Add Extra Password
			</button>
			{/* more buttons probably */}
			
			
		</div>
		
		<textarea
		
			className={`note-text ${isNoteInfoHidden ? "note-info-hidden" : ""}`}
			placeholder="Write note here"
			value={content}
			onChange={(e) => setContent(e.target.value)}
		
		/>
	</div>
  )
}

export default NoteEdit;
