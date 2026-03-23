import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from "react-router-dom";
import { connectSocket, getUserId, sendMessage, checkSocket, getAuthToken } from "./WebSocketConnect";
import { sortNotes, type SortOption, type NoteForSort } from "./noteListSort";
import { getAllNoteNames as loadNotes } from "./api";
// import { decryptFilenames } from "./crypto/lockinCrypto";
import './NoteList.css'
import { useKeyComboDetector } from './useKeyComboDetector'
import { getAlt, getKey, getShift } from './SettingsMem'


type Note = {
	name: string;
	modified: Date;
	made: Date;
	pinned: boolean;
	client: boolean;
};

function NotePage() {

	const navigate = useNavigate();
	const [sortBy, setSortBy] = useState<SortOption>('byName');
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
		
		connectSocket((data) => {
		
			if (typeof data === "object") {	
				
				//console.log(data.got);
				
				if (data.got === "List") {
				
					let noteList: Note[] = [];
					
					const size = data.listSize;
					
					for (let i = 0; i < size; i++) {

				
						//console.log("i = ", i);					
						noteList.push({
							name: data.listNames[i],
							modified: data.listMod[i],
							made: data.listMade[i],
							pinned: data.listPinned[i],
							client: false
						});
					}

					loadListAfterServer(noteList, searchTermRef.current, sortByRef.current);
				}
				
			} else {			
				console.log("Received:", data);
			} 
		});
		
		
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

		const userID = getUserId();
		const vaultKey = getAuthToken();
		
		//Get list from server
		if (userID) {
			try {
				const response = await loadNotes({ userID });
				
				if (response.notes) {
					
					let noteNames = response.notes.map((n: any) => n.note_title);
					
					// dont worry about encrypting/decrypting anthing for now

					
					/* If we have the key, decrypt. Else show raw (or placeholder)
					if (vaultKey) {
						try {
							// decryptFilenames expects string[], returns Promise<string[]>
							// This assumes n.note_title is the encrypted base64 string
							const decrypted = await decryptFilenames(noteNames, vaultKey);
							noteNames = decrypted;
						} catch (e) {
							console.error("Decryption error:", e);
						}
					} */

					const fetchedNotes = response.notes.map((n: any, index: number) : Note => ({
						name: noteNames[index], 
						modified: n.updated_at,
						made: n.created_at, // Server only returns one date for now
						pinned: n.pinned,
						client: false // From server
					}));
					
					loadListAfterServer(fetchedNotes);
				}
			} catch (err) {
				console.error("Failed to load notes:", err);
				// Fallback to socket or empty list
			}
		} else {
			// Fallback if no user ID (waiting for socket/login)
			console.log("No user ID available for API call");
		}
	}

	function loadListAfterServer(notes: NoteForSort[], term = searchTerm, sort = sortBy) {
	
		const filtered: NoteForSort[] = [];
	
		
		//remove notes without search term
		for (const note of notes) {
			if (note.name.toLowerCase().includes(term.toLowerCase())) {
				filtered.push(note);
			}
		}
	
		const sorted = sortNotes(filtered, sort);
		
		
		addNotesToList(sorted);
	}

	function addNotesToList(notes: NoteForSort[]) {
	  
		const listBox = document.getElementById("noteList");
		if (!listBox) return;
		
		// If the list is currently hidden, do not update its contents
		if (isListHidden) return;
		
		listBox.innerHTML = "";
		
		for (const note of notes) {
			const item = document.createElement("div");
			item.className = "list-item";
			
			const name = document.createElement("span");
			name.textContent = note.name;
			if (note.pinned) {
				name.textContent = "📌 " + note.name;
			}
			item.appendChild(name);
			
			const editButton = document.createElement("button");
			editButton.textContent = "🖉";
			editButton.className = "edit-button";
			
			editButton.addEventListener("click", () => {
			
				navigate("/NoteEdit", { state: { noteName: note.name, client: note.client } });
			
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

