import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./SignUp.css";

const ImportNote: React.FC = () => {
	const [sendingCode, setSendingCode] = useState("");

	return (
		<div className="auth-page">
			<div className="auth-card">
				<h2 className="auth-title">Import Note</h2>
				<p className="auth-subtitle">
					Use a one-time sending code to import a note from another user
				</p>

				<form className="auth-form">
					<label className="auth-label">
						<span>One-Time Sending Code</span>
						<input
							type="text"
							value={sendingCode}
							onChange={(e) => setSendingCode(e.target.value)}
							placeholder="Enter code"
							className="auth-input"
						/>
					</label>

					<button type="button" className="auth-button">
						Import Note
					</button>
				</form>

				<div className="auth-login-footer">
					<div className="Login">
						<Link to="/Home">(Home)</Link>
					</div>
				</div>
			</div>
		</div>
	);
};

export default ImportNote;
