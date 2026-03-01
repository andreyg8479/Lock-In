import { useEffect, useState } from 'react'
import { useNavigate } from "react-router-dom";
import { connectSocket, sendMessage, checkSocket } from "./WebSocketConnect";
import { sortNotes, type SortOption, type NoteForSort } from "./noteListSort";
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

					loadListAfterServer(noteList);
				}
				
			} else {			
				console.log("Received:", data);
			} 
		});
		
		
		loadList();
		
		
		
	}, [])
	
	function loadList() {

		const noteList: Note[] = [];
		
		//Get list from server
		if (checkSocket()) {
			sendMessage(JSON.stringify({
				command: "GetList"
			}));
		} else {
			// TODO: Code doesn't reach here, you might know why

			loadListAfterServer(noteList);
		}
	  
	}

	function loadListAfterServer(notes: NoteForSort[]) {
		const sorted = sortNotes(notes, sortBy);
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

  return (
	<div className="list-page">
	
		<div className="top-bar">
			<button className="home-button">Home</button>
			<h1>Your Notes</h1>
			<button className="refresh-button" onClick={loadList} >Refresh</button>
		</div>
	
	
		<div className="controls">
			<input type="text" placeholder="Search..."/>
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

