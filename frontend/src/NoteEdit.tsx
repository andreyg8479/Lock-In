import { useEffect, useState } from 'react'
import { getUserId, getAuthToken } from "./WebSocketConnect";
import { useLocation, useNavigate } from "react-router-dom";
import { getNote, uploadNote, updateNote, deleteNote } from "./api"; // Import API functions
import { encryptNote, decryptNote } from "./crypto/lockinCrypto";
import type { EncryptedNote, DecryptedNote } from "../../shared_types/note_types";
import './NoteEdit.css'

function NoteEdit() {

	const navigate = useNavigate();
	
	//for getting the note name if we come here from list
	const location = useLocation();
	const ogNoteName = location.state?.noteName; // This is likely encryptedName if coming from List
    // Also support passing the full note object or ID if we refactor NoteList later
    const ogNoteID = location.state?.noteID;

	const ogNoteServer = true; //true = server, false = client, //
	
	const [noteId, setNoteId] = useState<string | null>(ogNoteID ?? null);
	const [pinned, setPinned] = useState(false);
	
	const [title, setTitle] = useState(ogNoteName ? "Loading..." : "Untitled Document");
	const [content, setContent] = useState("");
	
	const [confirming, setConfirming] = useState(false);
  
	useEffect(() => {
	
		//clear the location state stuff
		if (window.history.replaceState) {
		  window.history.replaceState({}, document.title);
		}
		
		const fetchNote = async () => {
			if (ogNoteName || noteId) {
				const userID = getUserId();
                const vaultKey = getAuthToken();

				if (!userID || !vaultKey) {
					console.error("User ID or Key missing");
					return;
				}

				try {
					console.log("Requesting Note via API");
					// The controller expects { noteName: string, userID, noteID } in req.body.
					const response = await getNote({ noteName: ogNoteName, userID, noteID: noteId });
					
					console.log("RAW RESPONSE FROM SERVER:", response);

					if (response.note) {
                        const encryptedNote = response.note as EncryptedNote;
                        
                        try {
                            const decryptedNote = await decryptNote(encryptedNote, vaultKey);
                            
                            setContent(decryptedNote.plaintext);
                            setTitle(decryptedNote.name);
                            setPinned(decryptedNote.pinned);
                            setNoteId(decryptedNote.id);
                            
                            console.log("Loaded Note Id: ", decryptedNote.id);
                        } catch (e) {
                            console.error("Failed to decrypt note:", e);
                            setContent("Error decrypting note.");
                            setTitle("Error");
                        }
					}
				} catch (error) {
					console.error("Error fetching note:", error);
				}
			} else {
				console.log("no note selected, want to make new note");
			}
		};

		fetchNote();
		
	}, [ogNoteName, noteId])
	

	
	const doSaveServer = async () => { // use ogNoteServer to tell if its originaly from the server or the client
		const userID = getUserId();
        const vaultKey = getAuthToken();

		if (!userID || !vaultKey) {
			console.log("Not logged in"); 
			return;
		}

        // Construct DecryptedNote
        // ID is needed for update, for new note we can generate one or let server/encryptNote handle it?
        // encryptNote takes DecryptedNote which has 'id'. 
        // If it's a new note, noteId is null. We might need to generate a random ID here.
        // But let's see what encryptNote does. It uses noteID for the output.
        // It doesn't seem to generate one if missing.
        // We should generate a UUID for new notes.
        const currentId = noteId || crypto.randomUUID(); 

        const noteToSave: DecryptedNote = {
            userID: userID,
            id: currentId,
            name: title,
            plaintext: content,
            pinned: pinned,
            lastModified: new Date().toISOString(),
            createdAt: new Date().toISOString() // Should be preserved if existing, but we don't have it in state easily unless we stored it.
            // For now, using current time for create if new. Ideally we fetch it.
        };

        try {
            const encryptedNote = await encryptNote(noteToSave, vaultKey);

			if (noteId == null) { 
				// Create New Note
				console.log("Creating new note...");
				await uploadNote(encryptedNote);
				alert("Note Created!");
				navigate("/NoteList");
			} else {
				// Update Existing Note
				console.log("Updating note...");
				await updateNote(encryptedNote);
                alert("Note Update!");
                // we stay on page
			}

		} catch (e) {
            console.error("Error saving note:", e);
            alert("Error saving note");
        }
	}; 
	
	const doSaveClient = () => {  // use ogNoteServer to tell if its originaly from the server or the client
		// saving to client is sprint 2 problem
		console.log("Save to client is sprint 2 problem");
	}
	
	const togglePin = () => {
		setPinned(!pinned);
	}
	
	const doExit = () => {
		navigate("/NoteList");
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
            const userID = getUserId();
            if (!userID) {
                console.error("User ID missing");
                return;
            }

            if (noteId) {
                try {
                    await deleteNote({ noteID: noteId, userID });
                    navigate("/NoteList");
                } catch (error) {
                    console.error("Delete failed:", error);
                    alert("Delete failed");
                }
            }
			setConfirming(false);
		}
	}
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
			className="note-title"
			type="text"
			value={title}
			onChange={(e) => setTitle(e.target.value)}
		/>
	
		<div className="buttons">
		
			<button onClick={doExit}>
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
			
			{confirming && (
				<button onClick={doCancel}>Cancel</button>
			)}
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

export default NoteEdit;
