
import { useState, useMemo, useEffect } from 'react'
import {
 getTheme, 
 setTheme,
 applyTheme,
 normalizeTheme,
 getPrefSize,
 setPrefSize,
 getKey,
 setKey,
 getAlt,
 setAlt,
 getShift,
 setShift,
 getCtrl,
 setCtrl,
 getReminderTime,
 setReminderTime
 } from "./SettingsMem";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { get2faStatus, send2fa, disable2fa, enable2fa, requestLogin } from "./api";
import { handleLogin } from "./crypto/lockinCrypto";
import type { SignupCryptoArtifacts } from "./crypto/lockinCrypto";
import './Settings.css'

export const THEME_SELECT_ID = "theme";
export const HIDEBIND_KEY_INPUT_ID = "hide-keybind-key";
export const PREF_TEXT_SIZE_INPUT_ID = "pref-text-size";

const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0 ||
  navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;

function Settings() {

	const navigate = useNavigate();
	const { email } = useAuth();
	
	const [prefSize, setSetPrefSize] = useState(getPrefSize());
	
	const [key, setSetKey] = useState(getKey());
	const [shift, setSetShift] = useState(getShift());
	const [alt, setSetAlt] = useState(getAlt());
	const [ctrl, setSetCtrl] = useState(getCtrl());
	
	const [theme, setSetTheme] = useState(getTheme());

	const [twoFaEnabled, setTwoFaEnabled] = useState<boolean | null>(null);
	const [twoFaLoading, setTwoFaLoading] = useState(false);
	const [disableStep, setDisableStep] = useState<"idle" | "awaiting-password" | "awaiting-code">("idle");
	const [disablePassword, setDisablePassword] = useState("");
	const [disableCode, setDisableCode] = useState("");

	const [reminderDays, setReminderDays] = useState(getReminderTime());

	useEffect(() => {
		if (email) {
			get2faStatus({ email }).then((res) => {
				setTwoFaEnabled(res.twoFaEnabled);
			}).catch(() => {
				// Could not fetch status — leave as null
			});
		}
	}, [email]);

	const comboLabel = useMemo(() => {
		const parts: string[] = [];
		if (ctrl)  parts.push(isMac ? '⌃ Ctrl' : 'Ctrl');
		if (shift) parts.push(isMac ? '⇧ Shift' : 'Shift');
		if (alt)   parts.push(isMac ? '⌥ Alt' : 'Alt');
		parts.push(key || '?');
		return parts;
	}, [ctrl, shift, alt, key]);
	
	function homeButton() {
		navigate("/main");
	}
	
	function updateChanges() {
	
		//bounds
		const upper = 64;
		const lower = 4;
		
		if (prefSize < lower || prefSize > upper) {
			alert("Text size must be between " + lower + " and " + upper + ".");
			return;
		}
		
		const code = key.charCodeAt(0);
		if (!(code > 47 && code < 58) && // numeric (0-9)
        !(code > 64 && code < 91)) { // upper alpha (A-Z)
			alert("Your key must be either a letter key or digit key");
			return;
		}
		
		if (reminderDays < 0) {
			alert("The ammount of times opended for a reminder cannot be negative. To not recieve reminders, set it to 0");
			return;
		}
		
		
		//make sure the inputs are valid, then send them to the the WebSocketConnect
		
		setTheme(theme);
		applyTheme(theme);
		
		document.documentElement.style.fontSize = `${prefSize}px`;
		setPrefSize(prefSize);
		
		setKey(key);
		setAlt(alt);
		setShift(shift);
		setCtrl(ctrl);
		
		setReminderTime(reminderDays);
		
		alert("Settings Updated Successfully");
	
	}
	
	async function remove2FA() {
		if (!email) {
			alert("You must be logged in to change 2FA settings.");
			return;
		}

		if (twoFaEnabled === false) {
			alert("2FA is already not on this account");
			return;
		}

		if (disableStep === "idle") {
			setDisableStep("awaiting-password");
			return;
		}

		if (disableStep === "awaiting-password") {
			if (!disablePassword) {
				alert("Please enter your account password to continue.");
				return;
			}

			// Step 1: verify password, then send a confirmation PIN
			setTwoFaLoading(true);
			try {
				const response = await requestLogin({ email });
				const requiredFields = [
					"kdf", "iterations", "salt", "cipher", "iv",
					"aes_key_length", "gcm_iv_length", "wrapped_master_key", "version"
				];
				const missing = requiredFields.filter((field) => !response[field]);
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

				const passwordCheck = await handleLogin({
					email: response.email,
					username: response.username,
					attemptedPassword: disablePassword,
					artifacts
				});

				if (!passwordCheck.ok) {
					throw new Error(passwordCheck.payload.errorMessage);
				}

				await send2fa({ email });
				setDisableStep("awaiting-code");
				setDisablePassword("");
				alert("A verification code has been sent to your email. Enter it below to confirm disabling 2FA.");
			} catch (e: any) {
				alert(e.message || "Failed to send verification code");
			} finally {
				setTwoFaLoading(false);
			}
			return;
		}

		if (disableStep === "awaiting-code") {
			// Step 2: verify the PIN and disable
			if (!disableCode || disableCode.length !== 6) {
				alert("Please enter the 6-character code sent to your email.");
				return;
			}
			setTwoFaLoading(true);
			try {
				await disable2fa({ email, code: disableCode });
				setTwoFaEnabled(false);
				setDisableStep("idle");
				setDisablePassword("");
				setDisableCode("");
				alert("2FA successfully removed");
			} catch (e: any) {
				alert(e.message || "Failed to disable 2FA");
			} finally {
				setTwoFaLoading(false);
			}
		}
	}
	
	
	async function add2FA() {
		if (!email) {
			alert("You must be logged in to change 2FA settings.");
			return;
		}

		if (twoFaEnabled === true) {
			alert("2FA is already on this account");
			return;
		}
		
		setTwoFaLoading(true);
		try {
			await enable2fa({ email });
			setTwoFaEnabled(true);
			setDisableStep("idle");
			setDisablePassword("");
			setDisableCode("");
			alert("2FA successfully added");
		} catch (e: any) {
			alert(e.message || "Failed to enable 2FA");
		} finally {
			setTwoFaLoading(false);
		}
	}

  return (
	<div className="settings-page">
		<div className="top-bar">
			<button className="home-button" onClick={homeButton}>Home</button>
			<h1>Settings</h1>
			<button className="to-default-button" onClick={updateChanges} >Update Changes</button>
		</div>
		
		
		
		
		
		<div className="settings-section">
		
			<div className="settings-row">
Preferred Text Size: 
				<input type="number" id={PREF_TEXT_SIZE_INPUT_ID} value={prefSize} onChange={(e) => setSetPrefSize(Number(e.target.value))}/>
			</div>
			
			<div className="settings-row keybind-row">
				<span className="settings-label">Hide Screen Keybind:</span>
				<div className="keybind-options">
					<label className="keybind-option">
						<input type="checkbox" checked={ctrl} onChange={(e) => setSetCtrl(e.target.checked)}/>
						<span>{isMac ? '⌃ Ctrl' : 'Ctrl'}</span>
					</label>
					<label className="keybind-option">
						<input type="checkbox" checked={shift} onChange={(e) => setSetShift(e.target.checked)}/>
						<span>{isMac ? '⇧ Shift' : 'Shift'}</span>
					</label>
					<label className="keybind-option">
						<input type="checkbox" checked={alt} onChange={(e) => setSetAlt(e.target.checked)}/>
						<span>{isMac ? '⌥ Option' : 'Alt'}</span>
					</label>
					<label className="keybind-option">
						<span>Key:</span>
						<input type="text" id={HIDEBIND_KEY_INPUT_ID} className="key-char-input" maxLength={1} size={1} value={key} onChange={(e) => setSetKey(e.target.value.toUpperCase())} />
					</label>
				</div>

				<div className="keybind-preview" aria-label="Current keybind preview">
					{comboLabel.map((part, i) => (
						<span key={i} className="keycap">
							{part}
						</span>
					))}
				</div>
			</div>
			
			<div className="settings-row">
Theme:
				<select id={THEME_SELECT_ID} value={theme} onChange={(e) => setSetTheme(normalizeTheme(e.target.value))}>
				  <option value="light">Light</option>
				  <option value="dark">Dark</option>
				</select>
			</div>
			
			
			<div className="settings-row">
2FA: {twoFaEnabled === null ? "Loading..." : twoFaEnabled ? "Enabled" : "Disabled"}
				<button className="danger-button" onClick={add2FA} disabled={twoFaLoading || twoFaEnabled === true}>
					Add 2FA
				</button>
				<button className="danger-button" onClick={remove2FA} disabled={twoFaLoading || twoFaEnabled === false}>
					{disableStep === "awaiting-password" ? "Verify Password" : disableStep === "awaiting-code" ? "Confirm Disable" : "Remove 2FA"}
				</button>
				{disableStep === "awaiting-password" && (
					<input
						type="password"
						value={disablePassword}
						onChange={(e) => setDisablePassword(e.target.value)}
						placeholder="Enter account password"
						className="auth-input"
					/>
				)}
				{disableStep === "awaiting-code" && (
					<input
						type="text"
						value={disableCode}
						onChange={(e) => setDisableCode(e.target.value.toUpperCase())}
						placeholder="Enter 6-character code"
						maxLength={6}
						className="auth-input"
					/>
				)}
			</div>
			
			<div className="reminder-row">
Remind me to change my password every X logins (0 Will Not Remind You): 
				<input type="number" value={reminderDays} onChange={(e) => {
				setReminderDays(Number(e.target.value)); 
				}}/>
			</div>
			
		</div>
	</div>
  )
}

export default Settings
