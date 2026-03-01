

const express = require("express");
const path = require("path"); //for file paths
const http = require("http"); // for http which I apparently need to connect to react

// For database connection
require('dotenv').config({ path: path.join(__dirname, 'db.env') }); // Load environment variables from .env file

// Database stuff

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const WebSocket = require("ws");

const PORT = process.env.PORT || 8080;


// react stuff
const app = express();
// this is to serve the react front end
const frontendPath = path.resolve(__dirname, "..", "frontend", "dist");
console.log("Serving frontend from:", frontendPath);

app.use(express.static(frontendPath));

//this is some kind of backup router
app.use((req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"), err => {
    if (err) console.error("Error sending file:", err);
  });
});

// this creates an http server
const server = http.createServer(app);


const wss = new WebSocket.Server({ server });


const State = Object.freeze({ //this can be replaced with an actual enum if we switch to typescript
  STANDARD: 'STANDARD', //for most requests (create note, fetch names, ect)
  VERIFYING: 'VERIFYING', //When verifying password
  KEY_SETUP: 'KEY_SETUP', //For setting up verification key
});


//Runs when a browser connects, basicly this is any individual client
wss.on("connection", (socket) => {
  console.log("Client connected");
  
  socket.send("Hello Client");
  
  let SM = State.STANDARD; //State Machine
  let reason = "None"
  
  
  let user;
  
  //socket.send(); //use this to send stuff to the client
  
  //This runs when this client sends a message (CURRENTLY STRINGS)
  socket.on("message", (message) => {
	
	try {
	const recieved = JSON.parse(message.toString());
	
	switch (SM) { //handle the request based on the state
		case State.STANDARD:
			//code
			
			switch (recieved.command) { //STANDARD COMMANDS SWITCH
				case "GetList":
				
					console.log("Sending List")
					
					//get list from database
					
					socket.send(JSON.stringify({
						got: "List",
						listSize: 3,
						listNames: ["First", "Two", "3"],
						listMod: [new Date(), new Date(), new Date()],
						listMade: [new Date(), new Date(), new Date()],
						listPinned: [false, false, false]
					}));
					
				break;
				case "GetNote":
				
					console.log("Sending Note")
					
					//get note from database
					
					socket.send(JSON.stringify({
						got: "NoteForEdit",
						noteData: "This note is awesome! Or at least, I think so...",
						pinned: true
					}));
					
				break;
				case "Override":
					//delete old note from database
					//at users data at recieved.note_name store recieved.note_data
					
					if (recieved.name_change) {
						
						//in users nodes names list remove recieved.old_name and add recieved.note_name
						
					}
					
					//update node last update time 
				break;
				case "SignUp":
					
					username = recieved.username;
					
					if (false) { //if the username already exists in database TODO
						socket.send(JSON.stringify({
							got: "SignUpReturn",
							result: "Error: Username already taken"
						}))
					}
					
					//desginate username in backend TODO
					
					//Now we have to set up the key
					const unencKey = generateUnencryptedKey()
					
					socket.send(JSON.stringify({
						got: "SignUpReturn",
						result: "Key Setup Request",
						key: unencKey
					})););
					
					//Store the unencKey in the Database TODO
					
					SM = STATE.KEY_SETUP;
					
					//were done here, just need the key to be sent back
					
				break;
				case "LogIn":
					
					username = recieved.username;
					
					
				break;
				default:
					console.log("ERROR: Someone is in an undefined standard command");	
			} //end standard swtich
			
			break; // end standard
		case State.VERIFYING:
			//code
			break;
		case State.KEY_SETUP:
			//Client Has Asked to setup key verification
			
			//expecting the encrypted version back
			let encKey = recieved.key;
			
			//Store encKey in the database TODO
			
			
			SM = STATE.STANDARD;
			
			break; //End of KEY_SETUP
		default:
			console.log("ERROR: Someone is in an undefined state");	
		
	}
	
	} catch { //just in case, also for debug maybe
		console.log("Received:", message.toString());
		if (message.toString() == "Test Message") {
			console.log("Sending Back Test");
			socket.send("Returning Test");
		}
	}
	
  });
  
  
  
  
  socket.on("close", () => {
    console.log("Client disconnected");
  });
});



server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`WebSocket running at ws://localhost:${PORT}`);
});

// somewhat temporary stuff, I think the better way will be to have a separate file for database functions
// and then just import them and call them in the switch cases above, but for now this is fine

app.post('/api/signup', async (req, res) => {
  const {
    username,
    email,
    saltB64,
    iterations,
    wrapIvB64,
    wrappedMasterKeyB64
  } = req.body;

  const { data, error } = await supabase
    .from('users')
    .insert([{
      username,
      email,
      salt: saltB64,
      iterations,
      iv: wrapIvB64,
      wrapped_master_key: wrappedMasterKeyB64
    }]);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.json({ ok: true });
});

app.post('/api/delete', async (req, res) => {

	const { username } = req.body;
	
	const { data, error } = await supabase
	.from('users')
	.delete()
	.eq('username', username); 

	if (error) {
		return res.status(400).json({ error: error.message });
	  }
	
	res.json({ ok: true });

});