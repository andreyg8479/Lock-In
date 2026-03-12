
import { useEffect, useState } from 'react' //useState can also be added here but idk if its needed
import { connectSocket } from "./WebSocketConnect";
import { useNavigate } from "react-router-dom";
import './Settings.css'

function Settings() {

	const navigate = useNavigate();
	
	
	
	const [prefSize, setPrefSize] = useState(16);
	
	const [key, setKey] = useState("M");
	const [shift, setShift] = useState(false);
	const [alt, setAlt] = useState(true);
	
	const [theme, setTheme] = useState("light");
  
  
  
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
	
		//bounds
		const upper = 64;
		const lower = 4;
		
		if (prefSize < lower || prefSize > upper) {
			alert("Text size must be between ", lower, " and ", upper, ".");
			return;
		}
		
		code = key.charCodeAt(0);
		if (!(code > 47 && code < 58) && // numeric (0-9)
        !(code > 64 && code < 91)) { // upper alpha (A-Z)
			alert("Your key must be either a letter key or digit key");
			return;
		}
		
		
		//make sure the inputs are valid, then send them to the the WebSocketConnect
		
		alert("Settings Updated Successfully");
	
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
				<input type="number" id="pref-text-size" value={prefSize} onChange={(e) => setPrefSize(Number(e.target.value))}/>
			</div>
			
			<div className="settings-row">
Hide Screen Keybind: 							&emsp;&emsp;&emsp;
				<div id="thing"> Require Shift: <input type="checkbox" id="shift" checked={shift} onChange={(e) => setShift(e.target.checked)}/> </div>
				<div id="thing"> Require Alt: <input type="checkbox" id="alt" checked={alt} onChange={(e) => setAlt(e.target.checked)}/> </div>
				<div id="thing"> Key: <input type="text" id="charInput" maxLength="1" size="1" value ={key} onChange={(e) => setKey(e.target.value.toUpperCase())} /> </div>
			</div>
			
			<div className="settings-row">
Theme:
				<select id="theme" value={theme} onChange={(e) => setTheme(e.target.value)}>
				  <option value="light">Light</option>
				  <option value="dark">Dark</option>
				</select>
			</div>
			
		</div>
	</div>
  )
}

export default Settings
