import { useEffect, useState } from 'react'
import { connectSocket, sendMessage } from "./WebSocketConnect";
import { useLocation, useNavigate } from "react-router-dom";
import './NoteEdit.css'

function noteEdit() {

	const navigate = useNavigate();
	
	//for getting the note name if we come here from list
	const location = useLocation();
	const ogNoteName = location.state?.noteName;
	
	const [pinned, setPinned] = useState(false);
	
	const [title, setTitle] = useState(ogNoteName ?? "Untitled Document");
	const [content, setContent] = useState("");
  
	useEffect(() => {
	
		//clear the location state stuff
		if (window.history.replaceState) {
		  window.history.replaceState({}, document.title);
		}
		
		connectSocket((data) => {
			if (typeof data === "object") {	
					
				if (data.got === "NoteForEdit") {
				
					setContent(data.noteData);
					
					setPinned(data.pinned);
					
				}
				
			} else {			
				console.log("Received:", data);
			}
		});
		
		if (!ogNoteName) {
			console.log("no note selected, want to make new note")
		} else { //load the new note
		
			if (true) { //if its a server note
			
				console.log("Requesting Note");
			
				sendMessage(JSON.stringify({
					command: "GetNote",
					noteName: ogNoteName
				}));
			
			} // else if its a client note
		
		}
		
	}, [])
	

	
	const doSaveServer = () => {
		const noteName = title; 
		const noteData = content; //these should be encrypted before sending
		
		if (!ogNoteName) { //if its a newly made note vs editing old note
			sendMessage(JSON.stringify({
				command: "NewNote",
				name: noteName,
				pinned: pinned,
				data: noteData
			}));
		} else {
			sendMessage(JSON.stringify({
				command: "Override",
				name: ogNoteName,
				newName: noteName,
				pinned: pinned,
				data: noteData
			}));
		}
	}
	
	const doSaveClient = () => {
	
	}
	
	const togglePin = () => {
		setPinned(!pinned);
	}
	
	const doCancel = () => {
		navigate("/NoteList");
	}
	
	const attachFile = () => {
		//Not a this week problem
	}
	
	const doDelete = () => {
		if (true) { //if its a note thats been saved before
			//also make sure the name changing is accounted for
			sendMessage(JSON.stringify({
				command: "DeleteNote",
				name: ogNoteName
			}));
		}
		doCancel();
	}

  return (
	<div className="note-page">
	
		<input
			className="note-title"
			type="text"
			value={title}
			onChange={(e) => setTitle(e.target.value)}
		/>
	
		<div className="buttons">
		
			<button onClick={doCancel}>
			Cancel
			</button>
			
			<button onClick={doSaveServer}>
			Save to Server
			</button>
			
			<button onClick={doSaveClient}>
			Save to Client
			</button>
			
			<button onClick={togglePin}>
			{pinned ? "Unpin" : "Pin"}
			</button>
			
			<button onClick={attachFile}>
			Attach File {/* Should Change to unpin if is pinned */}
			</button>
			
			<button onClick={doDelete}>
			Delete
			</button>
			
			{/* more buttons probably */}
			
			
		</div>
		
		<textarea
		
			className="note-text"
			placeholder="Write note here"
			value={content}
			onChange={(e) => setContent(e.target.value)}
		
		/>
	</div>
  )
}

export default noteEdit;
