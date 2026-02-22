import { useEffect } from 'react' //useState can also be added here but idk if its needed
import { connectSocket, sendMessage } from "./WebSocketConnect";
import './App.css'

function App() {
  
	useEffect(() => {
		
		connectSocket((data) => {
			console.log("Got data");
			console.log(data);
		});
		
	}, [])

  return (
	<div>
		<button onClick={() => sendMessage("Hello Server!")}>
		Send Hello
      </button>
	</div>
  )
}

export default App
