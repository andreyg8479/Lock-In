import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./SignUp.css";

const SignUp: React.FC = () => {
	const navigate = useNavigate();
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		// Simple client-side check – replace with real backend call later
		if (password !== confirmPassword) {
			alert("Passwords do not match.");
			return;
		}

		console.log("Signing up with:", { name, email, password });
		navigate("/noteEdit");
	};

	return (
		<div className="auth-page">
			<div className="auth-card">
				<h2 className="auth-title">Create an account</h2>
				<p className="auth-subtitle">Join LockIn and get started</p>

				<form className="auth-form" onSubmit={handleSubmit}>
					<label className="auth-label">
						<span>Name</span>
						<input
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Your name"
							required
							className="auth-input"
						/>
					</label>

					<label className="auth-label">
						<span>Email</span>
						<input
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="you@example.com"
							required
							className="auth-input"
						/>
					</label>

					<label className="auth-label">
						<span>Password</span>
						<input
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							placeholder="Create a password"
							required
							className="auth-input"
						/>
					</label>

					<label className="auth-label">
						<span>Confirm password</span>
						<input
							type="password"
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							placeholder="Re-enter your password"
							required
							className="auth-input"
						/>
					</label>

					<button type="submit" className="auth-button">
						Sign Up
					</button>
				</form>
                <div className="Login">
                <Link to="/Login">(Login)</Link>
                </div>
			</div>
		</div>
	);
};

export default SignUp;
