import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./SignUp.css"; // reusing the css because that makes sense to me
import { generatePassword } from "./generatePassword";

const ChangeMasterPassword: React.FC = () => {
	const navigate = useNavigate();

	const [oldPassword, setOldPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (!oldPassword || !newPassword || !confirmPassword) {
			alert("All fields are required.");
			return;
		}

		if (newPassword !== confirmPassword) {
			alert("Passwords don't match!");
			return;
		}

		if (newPassword.length < 8) {
			alert("Password must be at least 8 characters.");
			return;
		}

		alert("Password updated successfully.");

		navigate("/main");
	};

	return (
		<div className="auth-page">
			<div className="auth-card">
				<h2 className="auth-title">Change Master Password</h2>
				<p className="auth-subtitle">Update your credentials securely</p>

				<form className="auth-form">
					<label className="auth-label">
						<span>Old Password</span>
						<input
							type="password"
							value={oldPassword}
							onChange={(e) => setOldPassword(e.target.value)}
							placeholder="Enter current password"
							required
							className="auth-input"
						/>
					</label>

					<label className="auth-label">
						<span>New Password</span>
						<input
							type="password"
							value={newPassword}
							onChange={(e) => setNewPassword(e.target.value)}
							placeholder="Create a new password"
							required
							className="auth-input"
						/>
					</label>

					<label className="auth-label">
						<span>Confirm New Password</span>
						<input
							type="password"
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							placeholder="Re-enter new password"
							required
							className="auth-input"
						/>
					</label>

					<button
						type="button"
						onClick={() => {
							const p = generatePassword();
							setNewPassword(p);
							setConfirmPassword(p);
							alert("New password is:    " + p);
						}}
						className="auth-button"
					>
						Generate Password
					</button>

					<button
						type="button"
						onClick={handleSubmit as any}
						className="auth-button"
					>
						Update Password
					</button>
				</form>

				<div className="auth-login-footer">
					<div className="Login">
						<Link to="/main">(Home)</Link>
					</div>
				</div>
			</div>
		</div>
	);
};

export default ChangeMasterPassword;