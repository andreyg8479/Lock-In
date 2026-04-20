import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./SignUp.css"; // reusing the css because that makes sense to me
import { generatePassword } from "./generatePassword";
import { useAuth } from "./AuthContext";
import { rewrapVaultKey } from "./crypto/lockinCrypto";
import type { SignupCryptoArtifacts } from "./crypto/lockinCrypto";
import { requestLogin, changeMasterPasswordApi, send2fa, get2faStatus } from "./api";

const ChangeMasterPassword: React.FC = () => {
	const navigate = useNavigate();
	const { username, email, token, setToken } = useAuth();

	const [oldPassword, setOldPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [step, setStep] = useState<"form" | "2fa">("form");
	const [twoFaCode, setTwoFaCode] = useState("");
	// Stash the rewrap result while waiting for 2FA
	const [pendingPayload, setPendingPayload] = useState<{
		newSaltB64: string;
		newIvB64: string;
		newWrappedMasterKeyB64: string;
		newAuthHashB64: string;
		newIterations: number;
	} | null>(null);

	const handleSubmit = async (event?: React.FormEvent<HTMLFormElement>) => {
		if (event) event.preventDefault();

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

		if (!email || !username || !token) {
			alert("You must be logged in to change your password.");
			return;
		}

		setLoading(true);
		try {
			// Fetch current artifacts from server
			const response = await requestLogin({ email });

			const currentArtifacts: SignupCryptoArtifacts = {
				kdf: response.kdf,
				kdfIterations: response.iterations,
				saltB64: response.salt,
				cipher: response.cipher,
				ivB64: response.iv,
				aesKeyLength: response.aes_key_length,
				gcmIVLength: response.gcm_iv_length,
				wrappedMasterKeyB64: response.wrapped_master_key,
				v: response.version,
			};

			// Re-wrap the vault key (verifies old password + wraps with new)
			const result = await rewrapVaultKey(
				oldPassword,
				newPassword,
				username,
				email,
				currentArtifacts
			);

			if (!result.ok) {
				alert(result.payload.errorMessage);
				return;
			}

			// Check if 2FA is needed
			const { twoFaEnabled } = await get2faStatus({ email });
			if (twoFaEnabled) {
				// Stash the payload and ask for 2FA code
				setPendingPayload(result.payload);
				await send2fa({ email });
				setStep("2fa");
				return;
			}

			// No 2FA — submit directly
			const changeResult = await changeMasterPasswordApi(result.payload, token);
			setToken(changeResult.token);
			alert("Password updated successfully.");
			navigate("/main");
		} catch (error: any) {
			console.error("Password change failed:", error);
			alert(error.message || "Password change failed.");
		} finally {
			setLoading(false);
		}
	};

	const handleVerify2faAndChange = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!pendingPayload || !token || !email) return;

		setLoading(true);
		try {
			const changeResult = await changeMasterPasswordApi(
				{ ...pendingPayload, twoFaCode },
				token
			);
			setToken(changeResult.token);
			alert("Password updated successfully.");
			navigate("/main");
		} catch (error: any) {
			console.error("Password change failed:", error);
			alert(error.message || "Password change failed.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="auth-page">
			<div className="auth-card">
				<h2 className="auth-title">Change Master Password</h2>
				<p className="auth-subtitle">Update your credentials securely</p>

				{step === "form" && (
				<form className="auth-form" onSubmit={handleSubmit}>
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
						type="submit"
						className="auth-button"
						disabled={loading}
					>
						{loading ? "Updating..." : "Update Password"}
					</button>
				</form>
				)}

				{step === "2fa" && (
				<form className="auth-form" onSubmit={handleVerify2faAndChange}>
					<p>A verification code has been sent to <strong>{email}</strong></p>
					<label className="auth-label">
						<span>2FA Code</span>
						<input
							type="text"
							value={twoFaCode}
							onChange={(e) => setTwoFaCode(e.target.value)}
							placeholder="Enter 2FA code"
							required
							className="auth-input"
						/>
					</label>
					<button type="submit" className="auth-button" disabled={loading}>
						{loading ? "Verifying..." : "Confirm Password Change"}
					</button>
				</form>
				)}

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