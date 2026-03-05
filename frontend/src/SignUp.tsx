import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./SignUp.css";

import type { IncomingSignupData, OutgoingSignupData } from "./crypto/lockinCrypto";
import { generateSignupCredentials } from "./crypto/lockinCrypto";
import { requestSignup } from "./api";

const SignUp: React.FC = () => {
	const navigate = useNavigate();
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		console.log("Signup button clicked!");

		// Check if passwords match and throw placeholder error for now
		if (password !== confirmPassword) {
			console.error("Passwords don't match");
			alert("Passwords don't match!");
			return;
		}
		
		try {

			// Format the GUI element entries as type IncomingSignupData
			const signupInput: IncomingSignupData = {
				username: name,
				email,
				password
			};

			// Step 1: Generate crypto metadata
			const cryptoResult: OutgoingSignupData = await generateSignupCredentials(signupInput);

			// "Discriminated Union Narrowing"
			if (!cryptoResult.ok) {
				alert(cryptoResult.payload.errorMessage);
				return;
			}
			
			// Step 2: Send HTTP request to server
			await requestSignup(cryptoResult.payload);

			// Step 3: Navigate to noteEdit page
			navigate("/noteEdit");

		} catch (e) {
			console.log(String(e));
		}
	};

	return (
		<div className="auth-page">
			<div className="auth-card">
				<h2 className="auth-title">Create an account</h2>
				<p className="auth-subtitle">Join LockIn and get started</p>

				<form className="auth-form">
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

					<button type="button" onClick={handleSubmit as any} className="auth-button">
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
