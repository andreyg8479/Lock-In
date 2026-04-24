
import { useState } from 'react'
import { useNavigate } from "react-router-dom";

function PasswordMemorizer() {

	const navigate = useNavigate();

	const [top, setTop] = useState("");
	const [bottom, setBottom] = useState("");
	const [hidden, setHidden] = useState(false);
	const [bottomColor, setBottomColor] = useState("white");

	function homeButton() {
		navigate("/main");
	}

	function bottomChanged(newBottom: string) {
	
		setBottom(newBottom);
	
		if (newBottom == "") {
			return;
		}
		
		if (top == "") {
			return;
		}
		
		const trimTop = top.substring(0, newBottom.length);
		
		console.log(top);
		console.log(newBottom);
		console.log(trimTop);
		
		if (newBottom != trimTop) {
			alert("Incorrect!");
			setBottomColor("red");
			setBottom("");
			return;
		}
		
		if (newBottom.length == top.length) {
			setBottom("");
			setBottomColor("green");
			return;
		}
		
		setBottomColor("white");
	}
	
  return (
	<div style={{ padding: "20px", maxWidth: "400px", margin: "auto" }}>
		<h2 style={{ textAlign: "center" }}> Password Memorizer </h2>
		
		<div style={{ marginBottom: "10px" }}>
			<input
				style={{ width: "100%", padding: "8px" }}
				type={hidden ? "password" : "text"}
				value={top}
				onChange={(e) => setTop(e.target.value)}
				placeholder = "Enter Password"
			/>
		</div>
		
		<button style={{ width: "100%", marginBottom: "15px", padding: "8px" }} onClick={() => setHidden(!hidden)}>
			{hidden ? "Show Above" : "Hide Above"}
		</button>
		
		<div style={{ marginBottom: "15px" }}>
			<input
				style={{ width: "100%", padding: "8px", backgroundColor: bottomColor }}
				type="password"
				
				value={bottom}
				onChange={(e) => {bottomChanged(e.target.value);}}
				placeholder = "Try to retype here"
			/>
		</div>
		
		<button style={{ width: "100%", padding: "8px" }} onClick={homeButton}>Home</button>
	</div>
  )
}

export default PasswordMemorizer
