import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";

import "./App.css";
import NoteEdit from "./NoteEdit";
import NoteList from "./NoteList";
import Login from "./Login";
import SignUp from "./SignUp";
import DeleteAll from "./DeleteAll";
import Settings from "./Settings";
import ChangeMasterPassword from "./ChangeMasterPassword";
import PasswordMemorizer from "./PasswordMemorizer";
import ImportNote from "./ImportNote";
import About from "./About";
import SharedNoteView from "./SharedNoteView";
import SharedWithMe from "./SharedWithMe";
import Home from "./Home";





function PagesList() {
	return (
		<div>
			<div>
				<h1>Main Menu</h1>
				<Link to="/Home">(Home)</Link>
				<Link to="/NoteEdit"> (NoteEdit)   </Link>
				<Link to="/NoteList"> (NoteList)   </Link>
				<Link to="/SignUp">(SignUp)</Link>
				<Link to="/Login"> (Login)   </Link>
				<Link to="/DeleteAll"> (DeleteAll)   </Link>
				<Link to="/Settings"> (Settings)   </Link>
				<Link to="/ChangeMasterPassword"> (ChangeMasterPassword)   </Link>
				<Link to="/PasswordMemorizer"> (PasswordMemorizer)   </Link>
				<Link to="/ImportNote"> (ImportNote)   </Link>
				<Link to="/About"> (About)   </Link>
				<Link to="/SharedWithMe"> (SharedWithMe)   </Link>
			</div>
		</div>
	);
}


function App() {

  return (
	<Router>
		<Routes>
			<Route path="/" element={<Home />} />
			<Route path="/main" element={<Home />} />
			<Route path="/debug" element={<PagesList />} />
			<Route path="/Home" element={<Home />} />
			<Route path="/SignUp" element={<SignUp />} />
			<Route path="/Login" element={<Login />} />
			<Route path="/NoteEdit" element={<NoteEdit />} />
			<Route path="/NoteList" element={<NoteList />} />
			<Route path="/DeleteAll" element={<DeleteAll />} />
			<Route path="/Settings" element={<Settings />} />
			<Route path="/ChangeMasterPassword" element={<ChangeMasterPassword />} />
			<Route path="/PasswordMemorizer" element={<PasswordMemorizer />} />
			<Route path="/ImportNote" element={<ImportNote />} />
			<Route path="/About" element={<About />} />
			<Route path="/shared/:id" element={<SharedNoteView />} />
			<Route path="/SharedWithMe" element={<SharedWithMe />} />
		</Routes>
	</Router>
  )
}

export default App
