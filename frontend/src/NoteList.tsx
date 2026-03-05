import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from "react-router-dom";
import { connectSocket, getUserId, sendMessage, checkSocket } from "./WebSocketConnect";
import { sortNotes, type SortOption, type NoteForSort } from "./noteListSort";
import { getAllNoteNames as loadNotes } from "./api";
import './NoteList.css'

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
	
	const searchTermRef = useRef(searchTerm);
	const sortByRef = useRef(sortBy);

	useEffect(() => {
		searchTermRef.current = searchTerm;
	}, [searchTerm]);

	useEffect(() => {
		sortByRef.current = sortBy;
	}, [sortBy]);
  
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
	
	function loadList() {

		const userID = getUserId();
		
		//Get list from server
		if (userID) {
			loadNotes({ userID }).then((response) => {
				
				if (response.notes) {
					// TODO: Implement actual decryption logic here when integrated with crypto/lockinCrypto.ts
					// For now, assuming names are plaintext or handling them as is
					
					const fetchedNotes = response.notes.map((n: any) : Note => ({
						name: n.note_title, // This might be encrypted, currently showing raw
						modified: n.date,
						made: n.date, // Server only returns one date for now
						pinned: n.pinned,
						client: false // From server
					}));
					
					loadListAfterServer(fetchedNotes);
				}
			}).catch(err => {
				console.error("Failed to load notes:", err);
				// Fallback to socket or empty list
			});
		} else {
			// Fallback if no user ID (waiting for socket/login)
			console.log("No user ID available for API call");
		}

		/* 
		// Old Socket Code - kept for reference or fallback
		if (checkSocket()) {
			sendMessage(JSON.stringify({
				command: "GetList"
			}));
		} else {
			// TODO: Code doesn't reach here, you might know why

			loadListAfterServer(noteList);
		 }
		*/
	  
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
		
		listBox.innerHTML = "";
		
		for (const note of notes) {
			const item = document.createElement("div");
			item.className = "list-item";
			
			const name = document.createElement("span");
			name.textContent = note.name;
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

