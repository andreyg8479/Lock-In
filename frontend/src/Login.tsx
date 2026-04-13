import React, { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Login.css";

import { useAuth } from "./AuthContext";

import type { SignupCryptoArtifacts } from "./crypto/lockinCrypto";
import { handleLogin } from "./crypto/lockinCrypto";
import { requestLogin, send2fa, verify2fa } from "./api";

export const LOGIN_EMAIL_INPUT_ID = "login-email";

const Login: React.FC = () => {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [twoFaCode, setTwoFaCode] = useState("");
	const [step, setStep] = useState<"credentials" | "2fa">("credentials");
	const [loading, setLoading] = useState(false);
	const navigate = useNavigate();
	const { setUserId, setVaultKey, setUsername, setEmail: setAuthEmail } = useAuth();

	// Store successful password verification results for use after 2FA
	const loginResultRef = useRef<{ vaultKey: CryptoKey } | null>(null);
	const loginResponseRef = useRef<any>(null);
	const twoFaEnabledRef = useRef<boolean>(true);

	const verifyPasswordAgainstServer = async () => {
		if (!email || !password) {
			throw new Error("Email and password are required");
		}

		const response = await requestLogin({ email });

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

		const result = await handleLogin({
			email: response.email,
			username: response.username,
			attemptedPassword: password,
			artifacts: artifacts
		});

		if (!result.ok) {
			throw new Error(result.payload.errorMessage);
		}

		return { response, loginResult: result.payload };
	};

	const handleRequestCode = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!email || !password) return;

		setLoading(true);
		try {
			const { response, loginResult } = await verifyPasswordAgainstServer();

			loginResultRef.current = loginResult;
			loginResponseRef.current = response;
			twoFaEnabledRef.current = response.two_fa_enabled !== false;

			if (response.two_fa_enabled === false) {
				// 2FA disabled — skip straight to login
				setUserId(response.id);
				setVaultKey(loginResult.vaultKey);
				setUsername(response.username);
				setAuthEmail(email);
				navigate("/main");
			} else {
				// 2FA enabled — send code and go to verification step
				await send2fa({ email });
				setStep("2fa");
			}
		} catch (error: any) {
			console.error("Login failed:", error);
			alert(error.message || "Login failed");
		} finally {
			setLoading(false);
		}
	};

	const handleLoginWithout2fa = async () => {
		if (!email || !password) return;

		setLoading(true);
		try {
			const { response, loginResult } = await verifyPasswordAgainstServer();

			setUserId(response.id);
			setVaultKey(loginResult.vaultKey);
			setUsername(response.username);
			setAuthEmail(email);
			navigate("/main");
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
			setAuthEmail(email);
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
							id={LOGIN_EMAIL_INPUT_ID}
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
					<button
						type="button"
						className="auth-button auth-button-secondary"
						disabled={loading}
						onClick={() => void handleLoginWithout2fa()}
					>
						Sign in without 2FA
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

				<div className="auth-login-footer">
					<div className="SignUp">
						<Link to="/SignUp">(Sign Up)</Link>
					</div>
					<div className="SignUp">
						<Link to="/Home">(Home)</Link>
					</div>
				</div>
			</div>
		</div>
	);
};

export default Login;
