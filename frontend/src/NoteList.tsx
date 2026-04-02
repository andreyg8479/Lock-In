import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { sortNotes, type SortOption } from "./noteListSort";
import { getAllNoteNames as loadNotes } from "./api";
import { getAllNotesClient } from "./client_storage";
import { decryptFilenames, verifySecondPassword } from "./crypto/lockinCrypto";
import type { DisplayNote, NoteType } from "../../shared_types/note_types";
import './NoteList.css'
import { useKeyComboDetector } from './useKeyComboDetector'
import { getAlt, getKey, getShift } from './SettingsMem'

/** Set to false when login works again — shows demo server + client rows without auth. */
const FAKE_NOTE_LIST_PREVIEW = false

function fakeDemoNotes(): DisplayNote[] {
	const now = Date.now()
	const iso = (offsetMs: number) => new Date(now + offsetMs).toISOString()
	return [
		{
			user_id: "preview-user",
			id: "fake-preview-server-1",
			note_title: "Weekly standup",
			note_text: "",
			iv_b64: "",
			pinned: true,
			note_type: "text",
			updated_at: iso(-86_400_000),
			created_at: iso(-1_209_600_000),
			second_password: null,
			client: false,
		},
		{
			user_id: "preview-user",
			id: "fake-preview-server-2",
			note_title: "Bookmarks",
			note_text: "",
			iv_b64: "",
			pinned: false,
			note_type: "text",
			updated_at: iso(-3_600_000),
			created_at: iso(-604_800_000),
			second_password: null,
			client: false,
		},
		{
			user_id: "preview-user",
			id: "fake-preview-client-1",
			note_title: "Scratch pad",
			note_text: "",
			iv_b64: "",
			pinned: false,
			note_type: "text",
			updated_at: iso(-120_000),
			created_at: iso(-2_592_000_000),
			second_password: null,
			client: true,
		},
		{
			user_id: "preview-user",
			id: "fake-preview-client-2",
			note_title: "Voice memo (audio)",
			note_text: "",
			iv_b64: "",
			pinned: false,
			note_type: "audio",
			updated_at: iso(-500),
			created_at: iso(-86_400_000),
			second_password: null,
			client: true,
		},
	]
}

function NotePage() {

	const navigate = useNavigate();
	const { userId, vaultKey } = useAuth();
	const [sortBy, setSortBy] = useState<SortOption>('byName');
	const [showTypes, setShowTypes] = useState<NoteType | 'all'>('all');
	const [searchTerm, setSearchTerm] = useState<string>('');
	
	const [isListHidden, setIsListHidden] = useState<boolean>(false);
	const hideButtonRef = useRef<HTMLButtonElement | null>(null);
	const hideCombo = {
		key: getKey(),
		shift: getShift(),
		alt: getAlt(),
		ctrl: true,
	} as const;
	
	const searchTermRef = useRef(searchTerm);
	const sortByRef = useRef(sortBy);

	useEffect(() => {
		searchTermRef.current = searchTerm;
	}, [searchTerm]);

	useEffect(() => {
		sortByRef.current = sortBy;
	}, [sortBy]);

	useKeyComboDetector(hideCombo, () => {
		hideButtonRef.current?.click();
	}, { preventDefault: true });
  
	useEffect(() => {
		loadList();
	}, [])


	useEffect(() => {

		// interval to load list every 10 seconds when the page is visible

		let interval: ReturnType<typeof setInterval> | null = null;


		const startInterval = () => {
			interval = setInterval(() => {
				loadList();
			}, 10000);
		};

		const stopInterval = () => {
			if (interval !== null) {
				clearInterval(interval);
				interval = null;
			}
		};


		if (document.visibilityState === "visible") {
			startInterval();
		}

		const handleVisibilityChange = () => {
			if (document.visibilityState === "visible") {
				startInterval();
			} else {
				stopInterval();
			}
		};

		document.addEventListener("visibilitychange", handleVisibilityChange);
		
		return () => {
			document.removeEventListener("visibilitychange", handleVisibilityChange);
			stopInterval();
		};

	}, []);

	// Refresh list when sorting mode changes
	useEffect(() => {
		loadList();
	}, [sortBy]);


	async function loadList() {
		if (FAKE_NOTE_LIST_PREVIEW) {
			displayNotes(fakeDemoNotes())
			return
		}

		let allNotes: DisplayNote[] = [];

		if (!userId || !vaultKey) {
			displayNotes([]);
			return;
		}

		// 1. Get list from server
		if (userId) {
			try {
				const response = await loadNotes({ userID: userId });
				
				if (response.notes) {
					const serverNotes = response.notes.map((n: any) : DisplayNote => ({
						user_id: n.user_id,
						id: n.id,
						note_title: n.note_title,
						note_text: "",
						iv_b64: n.iv_b64 || "",
						pinned: n.pinned,
						note_type: n.note_type || 'text',
						updated_at: n.updated_at,
						created_at: n.created_at,
						second_password: n.second_password ?? null,
						client: false
					}));
					allNotes = [...allNotes, ...serverNotes];
				}
			} catch (err) {
				console.error("Failed to load server notes:", err);
			}
		}

		// 2. Get list from client storage
		try {
			const clientNotesRaw = await getAllNotesClient();
			const filteredClientNotes = clientNotesRaw.filter(n => n.user_id === userId);

			const clientNotes = filteredClientNotes.map((n) : DisplayNote => ({
				user_id: n.user_id,
				id: n.id,
				note_title: n.note_title,
				note_text: "",
				iv_b64: n.iv_b64 || "",
				pinned: n.pinned,
				note_type: n.note_type || 'text',
				updated_at: n.updated_at,
				created_at: n.created_at,
				second_password: n.second_password ?? null,
				client: true
			}));
			allNotes = [...allNotes, ...clientNotes];

		} catch (e) {
			console.error("Failed to load client notes:", e);
		}

		// 3. Decrypt names if key is available
		if (vaultKey && allNotes.length > 0) {
			try {
				const encryptedNames = allNotes.map(n => n.note_title);
				const decryptedNames = await decryptFilenames(encryptedNames, vaultKey);
				
				allNotes = allNotes.map((note, index) => ({
					...note,
					note_title: decryptedNames[index]
				}));
			} catch (e) {
				console.error("Decryption error:", e);
			}
		}

		displayNotes(allNotes);
	}

	function displayNotes(notes: DisplayNote[], term = searchTerm, sort = sortBy) {
	
		const filtered = notes.filter(note =>
			note.note_title.toLowerCase().includes(term.toLowerCase())
		);
	
		const sorted = sortNotes(filtered, sort);
		
		renderNoteList(sorted);
	}

	function renderNoteList(notes: DisplayNote[]) {
	  
		const listBox = document.getElementById("noteList");
		if (!listBox) return;
		
		// If the list is currently hidden, do not update its contents
		if (isListHidden) return;
		
		listBox.innerHTML = "";
		
		for (const note of notes) {
		
			if (showTypes !== 'all') {
				if (note.note_type !== showTypes) {
					continue;
				}
			}
		
			const item = document.createElement("div");
			item.className = "list-item";

			const left = document.createElement("div");
			left.className = "list-item-left";

			const storageIcon = document.createElement("span");
			storageIcon.className = "note-storage-icon";
			storageIcon.textContent = note.client ? "💾" : "☁️";
			storageIcon.title = note.client
				? "Saved on this device (client)"
				: "Saved on server";
			storageIcon.setAttribute("aria-label", storageIcon.title);
			left.appendChild(storageIcon);

			const name = document.createElement("span");
			name.className = "list-item-title";
			name.textContent = note.pinned ? "📌 " + note.note_title : note.note_title;
			left.appendChild(name);

			item.appendChild(left);
			
			const editButton = document.createElement("button");
			editButton.textContent = "🖉";
			editButton.className = "edit-button";
			if (FAKE_NOTE_LIST_PREVIEW) {
				editButton.disabled = true;
				editButton.title = "Preview only — login to open notes";
			} else {
				editButton.addEventListener("click", async () => {
					if (note.second_password) {
						if (!vaultKey) {
							alert("Encryption key not available. Please log in again.");
							return;
						}
						let verified = false;
						while (!verified) {
							const attempt = prompt("This note is locked. Enter the second password:");
							if (attempt === null) return; // user cancelled
							verified = await verifySecondPassword(attempt, note.second_password, vaultKey);
							if (!verified) {
								alert("Incorrect password. Try again.");
							}
						}
					}
					navigate("/NoteEdit", { state: { noteId: note.id, noteName: note.note_title, client: note.client } });
				});
			}
			
			item.appendChild(editButton);
			
			listBox.appendChild(item);
		}
	}
	
	function homeButton() {
		navigate("/");
	}
	
	const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
		setSearchTerm(event.target.value);
	};

	const toggleListVisibility = () => {
		setIsListHidden((prev) => !prev);
	};

  return (
	<div className="list-page">
	
		<div className="top-bar">
			<button className="home-button" onClick={homeButton}>Home</button>
			<h1>Your Notes</h1>
			<button className="refresh-button" onClick={loadList} >Refresh</button>
		</div>
	
	
		<div className="controls">
			<input 
				type="text" 
				placeholder="Search..."
			    value={searchTerm}
				onChange={handleInputChange}
			/>
			<button
				type="button"
				className="hide-list-button"
				ref={hideButtonRef}
				onClick={toggleListVisibility}
			>
				{isListHidden ? "Unhide Notes" : "Hide Notes"}
			</button>
			<select
				value={sortBy}
				onChange={(e) => setSortBy(e.target.value as SortOption)}
			>
				<option value="byName">By Name</option>
				<option value="byModified">By Modified</option>
				<option value="byCreated">By Created</option>
			</select>
			
			
			<select
				value={showTypes}
				onChange={(e) => setShowTypes(e.target.value as NoteType | 'all')}
			>
				<option value="all">All Types</option>
				<option value="text">Text Only</option>
				<option value="audio">Audio Only</option>
				<option value="image">Image Only</option>
			</select>
		</div>
		<div className="list-container">
			<div
				className={`list-box ${isListHidden ? "list-box-hidden" : ""}`}
				id="noteList"
			>
			</div>
		</div>
		
	</div>
  )
}

export default NotePage;

