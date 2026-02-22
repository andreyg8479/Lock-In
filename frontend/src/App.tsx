
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom"; //this is for making things their own page

import { useEffect } from 'react' //useState can also be added here but idk if its needed
import { connectSocket } from "./WebSocketConnect"; //can also add sendMessage
import './App.css'
import Testing from "./Testing";
import NoteEdit from "./NoteEdit";



//Debug lets you go to your page
function PagesList() {
	return (
		<div>
			<h1>Debug Select Page Menu</h1>
			<Link to="/testing">(Testing)</Link>
			<Link to="/noteEdit"> (NoteEdit)   </Link>
		</div>	
	);
}



function App() {
  
	useEffect(() => {
		
		connectSocket((data) => {
			console.log("Got data");
			console.log(data);
		});
		
	}, [])

  return (
	<Router>
		<Routes>
			<Route path="/" element={<PagesList />} />
			<Route path="/noteEdit" element={<NoteEdit />} />
			<Route path="/testing" element={<Testing />} />
		</Routes>
	</Router>
  )
}

export default App
