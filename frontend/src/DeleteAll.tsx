import { useState } from 'react'
import { useNavigate } from "react-router-dom";
import { requestDeleteAccount } from './api';
import './DeleteAll.css'
import { useAuth } from './AuthContext';

function DeleteAll() {

	const navigate = useNavigate();
	const [confirming, setConfirming] = useState(false);
	const { username } = useAuth();
	
	const handleBack = () => {
		navigate("/");
	  };

	  const handleDelete = async () => {
		if (!confirming) {
			setConfirming(true);
		} else {

			try {
				await requestDeleteAccount({ username }); // Call backend API
				alert("Account deleted successfully");
				navigate("/"); // Redirect to home/login
			} catch (error) {
				console.error("Delete failed:", error);
				alert("Failed to delete account");
			}
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
