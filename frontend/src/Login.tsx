import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Login.css";

import { setUserId, setAuthToken } from "./WebSocketConnect";

import type { SignupCryptoArtifacts } from "./crypto/lockinCrypto";
import { handleLogin } from "./crypto/lockinCrypto";
import { requestLogin } from "./api";

const Login: React.FC = () => {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const navigate = useNavigate();

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		try {
			// Step 1: send an HTTP request to the server to get the crypto metadata
			// Only the email is sent, as the attempted password should never leave the client
			const response = await requestLogin({ email });

			// Step 2: Map the server response to the artifacts structure
			
			// Validate that all necessary crypto artifacts are present
			const requiredFields = [
				"kdf", "iterations", "salt", "cipher", "iv", 
				"aes_key_length", "gcm_iv_length", "wrapped_master_key", "version"
			];
			const missing = requiredFields.filter(field => !response[field]);
			if (missing.length > 0) {
				throw new Error(`User data corrupted (missing definitions for: ${missing.join(", ")}). Please sign up again.`);
			}

			const artifacts: SignupCryptoArtifacts = {
				kdf: response.kdf,
				kdfIterations: response.iterations,
				saltB64: response.salt,
				cipher: response.cipher,
				ivB64: response.iv,
				aesKeyLength: response.aes_key_length,
				gcmIVLength: response.gcm_iv_length,
				wrappedMasterKeyB64: response.wrapped_master_key,
				v: response.version
			};

			// Step 3: Attempt to unwrap the master key using the metadata
			const result = await handleLogin({
				email: response.email,
				username: response.username,
				attemptedPassword: password,
				artifacts: artifacts
			});

			if (result.ok) {
				// Save the vault key or session token here if needed
				//setUserId(result.userID);
				setAuthToken(result.payload.vaultKey);
				// For now just navigate
				navigate("/");
			} else {
				alert(result.payload.errorMessage);
			}
		} catch (error: any) {
			console.error("Login failed:", error);
			alert(error.message || "Login failed");
		}
	};

	return (
		<div className="auth-page">
			<div className="auth-card">
				<h2 className="auth-title">Login</h2>
				<p className="auth-subtitle">Welcome back to LockIn</p>

				<form className="auth-form" onSubmit={handleSubmit}>
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
							placeholder="Enter your password"
							required
							className="auth-input"
						/>
					</label>

					<button type="submit" className="auth-button">
						Login
					</button>
				</form>
                <div className="SignUp">
                <Link to="/SignUp">(Sign Up)</Link>
                </div>
			</div>
		</div>
	);
};

export default Login;
