
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from "react-router-dom";

import "./App.css";
import Testing from "./Testing";
import NoteEdit from "./NoteEdit";
import NoteList from "./NoteList";
import Login from "./Login";
import SignUp from "./SignUp";
import DeleteAll from "./DeleteAll";
import Settings from "./Settings";



//Debug lets you go to your page
function PagesList() {
	return (
		<div>
			<div>
				<h1>Debug Select Page Menu</h1>
				<Link to="/Home">(Home)</Link>
				<Link to="/NoteEdit"> (NoteEdit)   </Link>
				<Link to="/NoteList"> (NoteList)   </Link>
				<Link to="/SignUp">(SignUp)</Link>
				<Link to="/Login"> (Login)   </Link>
				<Link to="/DeleteAll"> (DeleteAll)   </Link>
				<Link to="/Settings"> (Settings)   </Link>
				<Link to="/testing">(Testing)</Link>
			</div>	
		</div>	
	);
}


function Home() {
	const navigate = useNavigate();
	return (
		<div className="auth-landing">
			<button type="button" onClick={() => navigate("/SignUp")}>
				Sign up
			</button>
			<button type="button" onClick={() => navigate("/Login")}>
				Log in
			</button>
		</div>
	);
}



function App() {

  return (
	<Router>
		<Routes>
			<Route path="/" element={<Home />} />
			<Route path="/main" element={<PagesList />} />
			<Route path="/debug" element={<PagesList />} />
			<Route path="/Home" element={<Home />} />
			<Route path="/SignUp" element={<SignUp />} />
			<Route path="/Login" element={<Login />} />
			<Route path="/NoteEdit" element={<NoteEdit />} />
			<Route path="/NoteList" element={<NoteList />} />
			<Route path="/DeleteAll" element={<DeleteAll />} />
			<Route path="/Settings" element={<Settings />} />
			<Route path="/testing" element={<Testing />} />
		</Routes>
	</Router>
  )
}

export default App
