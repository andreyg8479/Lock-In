import React, { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Login.css";

import { useAuth } from "./AuthContext";

import type { SignupCryptoArtifacts } from "./crypto/lockinCrypto";
import { handleLogin } from "./crypto/lockinCrypto";
import { requestLogin, send2fa, verify2fa } from "./api";

const Login: React.FC = () => {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [twoFaCode, setTwoFaCode] = useState("");
	const [step, setStep] = useState<"credentials" | "2fa">("credentials");
	const [loading, setLoading] = useState(false);
	const navigate = useNavigate();
	const { setUserId, setVaultKey, setUsername } = useAuth();

	// Store successful password verification results for use after 2FA
	const loginResultRef = useRef<{ vaultKey: CryptoKey } | null>(null);
	const loginResponseRef = useRef<any>(null);

	const handleRequestCode = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!email || !password) return;

		setLoading(true);
		try {
			// Step 1: Fetch crypto metadata from server
			const response = await requestLogin({ email });

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

			// Step 2: Attempt to unwrap the master key to verify password FIRST
			const result = await handleLogin({
				email: response.email,
				username: response.username,
				attemptedPassword: password,
				artifacts: artifacts
			});

			if (!result.ok) {
				throw new Error(result.payload.errorMessage);
			}

			// Password is correct — store results for use after 2FA
			loginResultRef.current = result.payload;
			loginResponseRef.current = response;

			// Step 3: Only now send the 2FA code
			await send2fa({ email });
			setStep("2fa");
		} catch (error: any) {
			console.error("Login failed:", error);
			alert(error.message || "Login failed");
		} finally {
			setLoading(false);
		}
	};

	const handleVerifyAndLogin = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!twoFaCode) return;

		setLoading(true);
		try {
			// Verify the 2FA code server-side
			await verify2fa({ email, code: twoFaCode });

			// Use the already-verified login results from the password step
			const response = loginResponseRef.current;
			const loginResult = loginResultRef.current;

			if (!response || !loginResult) {
				throw new Error("Session expired. Please try logging in again.");
			}

			setUserId(response.id);
			setVaultKey(loginResult.vaultKey);
			setUsername(response.username);
			navigate("/main");
		} catch (error: any) {
			console.error("Login failed:", error);
			alert(error.message || "Login failed");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="auth-page">
			<div className="auth-card">
				<h2 className="auth-title">Login</h2>
				<p className="auth-subtitle">Welcome back to LockIn</p>

				{step === "credentials" && (
				<form className="auth-form" onSubmit={handleRequestCode}>
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

					<button type="submit" className="auth-button" disabled={loading}>
						{loading ? "Verifying..." : "Login"}
					</button>
				</form>
				)}

				{step === "2fa" && (
				<form className="auth-form" onSubmit={handleVerifyAndLogin}>
					<p>A verification code has been sent to <strong>{email}</strong></p>
					<label className="auth-label">
						<span>Verification Code</span>
						<input
							type="text"
							value={twoFaCode}
							onChange={(e) => setTwoFaCode(e.target.value.toUpperCase())}
							placeholder="Enter 6-character code"
							maxLength={6}
							required
							className="auth-input"
							autoFocus
						/>
					</label>

					<button type="submit" className="auth-button" disabled={loading}>
						{loading ? "Verifying..." : "Verify & Login"}
					</button>
					<button
						type="button"
						className="auth-button"
						onClick={() => { setStep("credentials"); setTwoFaCode(""); loginResultRef.current = null; loginResponseRef.current = null; }}
					>
						Back
					</button>
				</form>
				)}

                <div className="SignUp">
                <Link to="/SignUp">(Sign Up)</Link>
                </div>
			</div>
		</div>
	);
};

export default Login;
