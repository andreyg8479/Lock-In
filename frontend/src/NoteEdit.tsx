import { useEffect } from 'react' //useState can also be added here but idk if its needed
import { connectSocket, sendMessage } from "./WebSocketConnect";
import './NoteEdit.css'

function NotePage() {
  
	useEffect(() => {
		
		connectSocket((data) => {
			console.log("Got data");
			console.log(data);
		});
		
	}, [])

  return (
	<div className="note-page">
		<div className="buttons">
		
			<button onClick={() => sendMessage("Cancel")}>
			Cancel
			</button>
			
			<button onClick={() => sendMessage("Save")}>
			Cancel
			</button>
			
		</div>
		
		<textarea
		
			className="note-text"
			placeholder="Write note here"
		
		/>
	</div>
  )
}

export default NotePage;
