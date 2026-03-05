
import { useEffect, useState } from 'react' //useState can also be added here but idk if its needed
import { connectSocket, sendMessage } from "./WebSocketConnect";
import { useNavigate } from "react-router-dom";
import './DeleteAll.css'

function DeleteAll() {

	const navigate = useNavigate();
	const [confirming, setConfirming] = useState(false);
  
	useEffect(() => {
		
		connectSocket((data) => {
			console.log("Got data");
			console.log(data);
		});
		
	}, [])
	
	const handleBack = () => {
		navigate("/");
	  };

	  const handleDelete = () => {
		if (!confirming) {
			setConfirming(true);
		} else {
			sendMessage("Delete All");
			alert("Delete everything triggered");
			setConfirming(false);
		}
	  };

  return (
	<div className="delete-page">
		<div className="delete-container">
			<h1>Delete All My Data</h1>
			<p>Warning: this will delete all of your data permanantly, you will never be able to recover your notes</p>
			<div className="buttons">
				<button className="back" onClick={handleBack}>
					Back
				</button>

				<button className="delete" onClick={handleDelete}>
					{confirming ? "Are you sure?" : "Delete Everything"}
				</button>
			</div>
		</div>
    </div>
  )
}

export default DeleteAll
