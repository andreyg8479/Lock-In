import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { sortNotes, type SortOption } from "./noteListSort";
import { getAllNoteNames as loadNotes } from "./api";
import { getAllNotesClient } from "./client_storage";
import { decryptFilenames } from "./crypto/lockinCrypto";
import type { DisplayNote } from "../../shared_types/note_types";
import './NoteList.css'

function NotePage() {

	const navigate = useNavigate();
	const { userId, vaultKey } = useAuth();
	const [sortBy, setSortBy] = useState<SortOption>('byName');
	const [searchTerm, setSearchTerm] = useState<string>('');
	
	const searchTermRef = useRef(searchTerm);
	const sortByRef = useRef(sortBy);

	useEffect(() => {
		searchTermRef.current = searchTerm;
	}, [searchTerm]);

	useEffect(() => {
		sortByRef.current = sortBy;
	}, [sortBy]);
  
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
		
		let allNotes: DisplayNote[] = [];

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
						updated_at: n.updated_at,
						created_at: n.created_at,
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
			const filteredClientNotes = userId ? clientNotesRaw.filter(n => n.user_id === userId) : clientNotesRaw;

			const clientNotes = filteredClientNotes.map((n) : DisplayNote => ({
				user_id: n.user_id,
				id: n.id,
				note_title: n.note_title,
				note_text: "",
				iv_b64: n.iv_b64 || "",
				pinned: n.pinned,
				updated_at: n.updated_at,
				created_at: n.created_at,
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
		
		listBox.innerHTML = "";
		
		for (const note of notes) {
			const item = document.createElement("div");
			item.className = "list-item";
			
			const name = document.createElement("span");
			name.textContent = note.pinned ? "📌 " + note.note_title : note.note_title;
			item.appendChild(name);
			
			const editButton = document.createElement("button");
			editButton.textContent = "🖉";
			editButton.className = "edit-button";
			
			editButton.addEventListener("click", () => {
				navigate("/NoteEdit", { state: { noteId: note.id, noteName: note.note_title, client: note.client } });
			});
			
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
			<select
				value={sortBy}
				onChange={(e) => setSortBy(e.target.value as SortOption)}
			>
				<option value="byName">By Name</option>
				<option value="byModified">By Modified</option>
				<option value="byCreated">By Created</option>
			</select>
		</div>
	
	
		<div className="list-container">
			<div className="list-box" id="noteList">
			</div>
		</div>
		
	</div>
  )
}

export default NotePage;

