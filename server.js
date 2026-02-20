
const WebSocket = require("ws");

const PORT = process.env.PORT || 8080;

const wss = new WebSocket.Server({ port: PORT });

console.log(`Server running at ws://localhost:${PORT}`);


const State = Object.freeze({ //this can be replaced with an actual enum if we switch to typescript
  STANDARD: 'STANDARD', //for most requests (create note, fetch names, ect)
  VERIFYING: 'VERIFYING', //When verifying password
  KEY_SETUP: 'KEY_SETUP', //For setting up verification key
});


//Runs when a browser connects, basicly this is any individual client
wss.on("connection", (socket) => {
  console.log("Client connected");
  
  let SM = State.STANDARD; //State Machine
  
  //socket.send(); //use this to send stuff to the client
  
  //This runs when this client sends a message (CURRENTLY STRINGS)
  socket.on("message", (message) => {
    console.log("Received:", message.toString());
	
	const recieved = JSON.parse(message.toString());
	
	switch (SM) { //handle the request based on the state
		case State.STANDARD:
			//code
			break;
		case State.VERIFYING:
			//code
			break;
		case State.KEY_SETUP:
			//Client Has Asked to setup key verification
			

			/* We sent this to the client last, should put this wherever that is
			
			const unencKey = generateUnencryptedKey()
			socket.send(JSON.stringify({
				key: unencKey
			})););
			//Store unencKey in the database
			
			*/
			
			//expecting the encrypted version back
			let encKey = recieved.key;
			
			//Store encKey in the database
			
			
			break; //End of KEY_SETUP
		default:
			console.log("ERROR: Someone is in an undefined state");	
		
	}
	
  });
  
  
  
  
  socket.on("close", () => {
    console.log("Client disconnected");
  });
});


function generateUnencryptedKey() {
  const charCount = 32;
  let key = "";
  for (let i = 0; i < charCount; i++) {
	  key = key + String.fromCharCode(Math.floor(Math.random() * 65536)); //gives random character
  }
  return key;
}