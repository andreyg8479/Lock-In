
import { useState } from 'react'
import { useNavigate } from "react-router-dom";

function PasswordMemorizer() {

	const navigate = useNavigate();

	const [top, setTop] = useState("");
	const [bottom, setBottom] = useState("");
	const [hidden, setHidden] = useState(false);

	function homeButton() {
		navigate("/main");
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
				style={{ width: "100%", padding: "8px" }}
				type="password"
				value={bottom}
				onChange={(e) => setBottom(e.target.value)}
				placeholder = "Try to retype here"
			/>
		</div>
		
		<button style={{ width: "100%", padding: "8px" }} onClick={homeButton}>Home</button>
	</div>
  )
}

export default PasswordMemorizer
