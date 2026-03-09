
import { useEffect, useState } from 'react' //useState can also be added here but idk if its needed
import { connectSocket } from "./WebSocketConnect";
import { useNavigate } from "react-router-dom";
import './Settings.css'

function Settings() {

	const navigate = useNavigate();
  
	useEffect(() => {
		
		connectSocket((data) => {
			console.log("Got data");
			console.log(data);
		});
		
	}, [])
	
	
	
	
	function loadPage() {
		//Fill the settings with their current values
	}
	
	
	function homeButton() {
		navigate("/");
	}
	
	function updateChanges() {
		navigate("/");
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
Prefered Text Size: 
				<input type="number" id="pref-text-size" />
			</div>
			
			<div className="settings-row">
Hide Screen Keybind: 							&emsp;&emsp;&emsp;
				<div id="thing"> Reqire Shift: <input type="checkbox" id="shift"/> </div>
				<div id="thing"> Reqire Alt: <input type="checkbox" id="alt"/> </div>
				<div id="thing"> Key: <input type="text" id="charInput" maxlength="1" size="1"/> </div>
			</div>
			
			<div className="settings-row">
Theme:
				<select id="theme">
				  <option value="light">Light</option>
				  <option value="dark">Dark</option>
				</select>
			</div>
			
		</div>
	</div>
  )
}

export default Settings
