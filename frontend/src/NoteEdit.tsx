import { useEffect, useState } from 'react'
import { connectSocket, sendMessage } from "./WebSocketConnect";
import './NoteEdit.css'

function NotePage() {
	
	const [title, setTitle] = useState("Untitled Document");
	const [content, setContent] = useState("");
  
	useEffect(() => {
		
		connectSocket((data) => {
			console.log("Received:", data);
		/*
			try {
			
				const recieved = JSON.parse(data);
				

			} catch {
				console.log("Received:", data);
			} 
			*/
		});
		
	}, [])
	
	const doSaveServer = () => {
		const noteName = title; 
		const noteData = content; //these should be encrypted before sending
		
		if (true) { //if its a newly made note vs editing old note
			sendMessage(JSON.stringify({
				command: "NewNote",
				name: noteName,
				data: noteData
			}));
		} else {
			sendMessage(JSON.stringify({
				command: "Override",
				name: noteName,
				data: noteData
			}));
		}
	}
	
	const doSaveClient = () => {
	
	}
	
	const togglePin = () => {
	
	}
	
	const doCancel = () => {
		//just go back to the list page
	}
	
	const attachFile = () => {
		//Not a this week problem
	}
	
	const doDelete = () => {
		const noteName = title; 
		if (true) { //if its a note thats been saved before
			//also make sure the name changing is accounted for
			sendMessage(JSON.stringify({
				command: "DeleteNote",
				name: noteName
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
			Pin {/* Should Change to unpin if is pinned */}
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

export default NotePage;
