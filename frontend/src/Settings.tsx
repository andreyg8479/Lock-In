
import { useState, useMemo } from 'react'
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
 setCtrl
 } from "./SettingsMem";
import { useNavigate } from "react-router-dom";
import './Settings.css'

export const THEME_SELECT_ID = "theme";
export const HIDEBIND_KEY_INPUT_ID = "hide-keybind-key";
export const PREF_TEXT_SIZE_INPUT_ID = "pref-text-size";

const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0 ||
  navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;

function Settings() {

	const navigate = useNavigate();
	
	const [prefSize, setSetPrefSize] = useState(getPrefSize());
	
	const [key, setSetKey] = useState(getKey());
	const [shift, setSetShift] = useState(getShift());
	const [alt, setSetAlt] = useState(getAlt());
	const [ctrl, setSetCtrl] = useState(getCtrl());
	
	const [theme, setSetTheme] = useState(getTheme());

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
		
		
		//make sure the inputs are valid, then send them to the the WebSocketConnect
		
		setTheme(theme);
		applyTheme(theme);
		
		document.documentElement.style.fontSize = `${prefSize}px`;
		setPrefSize(prefSize);
		
		setKey(key);
		setAlt(alt);
		setShift(shift);
		setCtrl(ctrl);
		
		alert("Settings Updated Successfully");
	
	}
	
	function remove2FA() {
		if (false) { //not logged into the server
			alert("No Connection");
			return;
		}
		
		if (false) { //dont have 2fa set up
			alert("2FA is already not on this account");
			return;
		}
		
		const pass = prompt("Enter Your Password");
		const realpass = ""; //get the password from the server
		
		if (realpass != pass) {
			alert("Password Incorrect");
			return;
		}
		
		
		//do 2fa here
		
		//if it passes, remove 2fa for the user
		
		alert("2FA sucessfully removed");
	}
	
	
	function add2FA() {
		if (false) { //not logged into the server
			alert("No Connection");
			return;
		}
		
		if (false) { //has have 2fa set up
			alert("2FA is already on this account");
			return;
		}
		
		const email = prompt("Enter Your Email");
		const pattern = /@.+\./;
		if (!pattern.test(email)) {
			alert("Invalid Email");
			return;
		}
		
		
		//add 2fa to the account
		
		alert("2FA sucessfully added");
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
2FA:
				<button className="danger-button" onClick={add2FA}>
					Add 2FA
				</button>
				<button className="danger-button" onClick={remove2FA}>
					Remove 2FA
				</button>
			</div>
			
		</div>
	</div>
  )
}

export default Settings
