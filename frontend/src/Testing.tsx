
import { useEffect } from 'react' //useState can also be added here but idk if its needed
import { connectSocket, sendMessage, setAuthToken } from "./WebSocketConnect";

function Testing() {
  
	useEffect(() => {
		
		connectSocket((data) => {
			console.log("Got data");
			console.log(data);
		});
		
	}, [])
	
	function clicked() {
		sendMessage("Test Message");
		setAuthToken("Testing Token");
	}

  return (
	<div>
		<button onClick={clicked}>
		Send Hello
      </button>
	</div>
  )
}

export default Testing
