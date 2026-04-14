
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
	<div>
		<h2> Password Memorizer </h2>
		
		<div>
			<input
				value={top}
				onChange={(e) => setTop(e.target.value)}
				placeholder = "Enter Password"
			/>
		</div>
		
		<button onClick={() => setHidden(!hidden)}>
			{hidden ? "Show Above" : "Hide Above"}
		</button>
		
		<div>
			<input
				type="password"
				value={bottom}
				onChange={(e) => setBottom(e.target.value)}
				placeholder = "Try to retype here"
			/>
		</div>
		
		<button onClick={homeButton}>Home</button>
	</div>
  )
}

export default PasswordMemorizer
