import { useEffect, useRef, useState } from 'react'
import { getUserId } from "./WebSocketConnect";
import { useLocation, useNavigate } from "react-router-dom";
import { getNote, uploadNote, updateNote, deleteNote } from "./api"; // Import API functions
import './NoteEdit.css'
import { useKeyComboDetector } from './useKeyComboDetector'
import { getAlt, getKey, getShift } from './SettingsMem'

function NoteEdit() {
	const navigate = useNavigate();
	
	//for getting the note name if we come here from list
	const location = useLocation();
	const ogNoteName = location.state?.noteName;
	const ogNoteServer = true; //true = server, false = client, //
	
	const [noteId, setNoteId] = useState<string | null>(null);
	const [pinned, setPinned] = useState(false);
	
	const [title, setTitle] = useState(ogNoteName ?? "Untitled Document");
	const [content, setContent] = useState("");
	const [isNoteInfoHidden, setIsNoteInfoHidden] = useState(false);
	const hideButtonRef = useRef<HTMLButtonElement | null>(null);
	
	const [confirming, setConfirming] = useState(false);
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
			if (ogNoteName) {
				const userID = getUserId();
				if (!userID) {
					console.error("User ID missing");
					return;
				}

				try {
					console.log("Requesting Note via API");
					// The controller expects { noteName: string } in req.body.
					// We pass userID as well if needed in future auth checks
					// VaultController.ts:getNote uses req.body.noteName
					const response = await getNote({ noteName: ogNoteName, userID });
					
					console.log("RAW RESPONSE FROM SERVER:", response);

					// VaultController.ts:getNote returns { note: notes } where 'notes' is likely an array from supabase.select('*')
					if (response.note && response.note.length > 0) {
						const noteData = response.note[0];
						
						// Map database columns to state
						// DB columns based on VaultController.ts: 'note_text', 'pinned', 'id'
						setContent(noteData.note_text);
						setPinned(noteData.pinned);
						setNoteId(noteData.id);
						
						console.log("Loaded Note Id: ", noteData.id);
					}
				} catch (error) {
					console.error("Error fetching note:", error);
				}
			} else {
				console.log("no note selected, want to make new note");
			}
		};

		fetchNote();
		
	}, [ogNoteName])
	

	
	const doSaveServer = async () => { // use ogNoteServer to tell if its originaly from the server or the client
		const userID = getUserId();
		if (!userID) {
			console.log("Not logged in"); 
			return;
		}

		try {
			if (noteId == null) { 
				// Create New Note
				console.log("Creating new note...");
				await uploadNote({
					name: title,
					data: content,
					pinned: pinned,
					user_id: userID
				});
				alert("Note Created!");
				navigate("/NoteList");
			} else {
				// Update Existing Note
				console.log("Updating note...");
				await updateNote({
					noteId: noteId,
					name: title, 
					data: content,
					pinned: pinned,
					user_id: userID
				});
				alert("Note Updated!");
			}
		} catch (error) {
			console.error("Save failed:", error);
			alert("Failed to save note.");
		}
	}
	
	const doSaveClient = () => {  // use ogNoteServer to tell if its originaly from the server or the client
		// saving to client is sprint 2 problem
		console.log("Save to client is sprint 2 problem");
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
	
	const attachFile = () => {
		//Not a this week problem
	}

	const doCancel = () => {
		setConfirming(false);
	}
	
	const doDelete = async () => {
		if (!confirming) {
			setConfirming(true);
		} else {
			try {
                const userID = getUserId();
                if (!userID) {
                    console.error("User ID missing");
                    return;
                }
				// VaultController deleteNote expects { note_title: string }
				if (title) { 
					await deleteNote({ note_title: title, user_id: userID });
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
			{(ogNoteName || ogNoteServer) ? "Save to Server?" : "Clone to Server?"}
			</button>
			
			<button onClick={doSaveClient}>
			{(ogNoteName || !ogNoteServer) ? "Save to Client?" : "Clone to Client?"}
			</button>
			
			<button onClick={togglePin}>
			{pinned ? "Unpin" : "Pin"}
			</button>
			
			<button onClick={attachFile}>
			Attach File {/* Should Change to unpin if is pinned */}
			</button>
			
			<button onClick={doDelete}>
			{confirming ? "Positive?" : "Delete"}
			</button>

			<button ref={hideButtonRef} onClick={toggleNoteInfoVisibility}>
			{isNoteInfoHidden ? "Unhide Note Info" : "Hide Note Info"}
			</button>
			
			{confirming && (
				<button onClick={doCancel}>Cancel</button>
			)}
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
