// server.ts
import express from "express"
import path from "path"
import http from "http"
import dotenv from "dotenv"
import { WebSocketServer, WebSocket } from "ws";
import { createClient } from "@supabase/supabase-js" 

// For Supabase connection
dotenv.config();
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_KEY;

// Check if environment variables are set
if (!url || !key) {
	throw new Error("SUPABASE_URL and SUPABASE_KEY must be set in environment variables");
}

const supabase = createClient(url, key);

// const express = require("express");
// const path = require("path"); //for file paths
// const http = require("http"); // for http which I apparently need to connect to react

// For database connection
// require('dotenv').config();
// const { createClient } = require('@supabase/supabase-js');

// This is old websocket logic for REALTIME / Live sync features with the client
// We need to switch to a RESTful framework for the server-client API.

// const WebSocket = require("ws");
const PORT = process.env.PORT || 8080;

// react stuff
const app = express();

// this is to serve the react front end
const frontendPath = path.resolve(__dirname, "../../frontend/dist");
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
const wss = new WebSocketServer({ server });

// this is boilerplate to get the current SM stuff to work with typescript
// but ideally this gets phased about by the REST API
enum State {
	STANDARD = "STANDARD",
	VERIFYING = "VERIFYING",
	KEY_SETUP = "KEY_SETUP"
}

/* const State = Object.freeze({ //this can be replaced with an actual enum if we switch to typescript
  STANDARD: 'STANDARD', //for most requests (create note, fetch names, ect)
  VERIFYING: 'VERIFYING', //When verifying password
  KEY_SETUP: 'KEY_SETUP', //For setting up verification key
});

type StateType = "STANDARD" | "VERIFYING" | "KEY_SETUP";
let SM: StateType = "STANDARD"; */

//Runs when a browser connects, basicly this is any individual client
wss.on("connection", (socket) => {
  console.log("Client connected");
  
  socket.send("Hello Client");

  // let SM = State.STANDARD; //State Machine
  const state = {
	SM: State.STANDARD as State
  };
  
  //socket.send(); //use this to send stuff to the client
  
  //This runs when this client sends a message (CURRENTLY STRINGS)
  socket.on("message", (message) => {
	
	try {
	const recieved = JSON.parse(message.toString());
	
	switch (state.SM) { //handle the request based on the state
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
				case "Override":
					//delete old note from database
					//at users data at recieved.note_name store recieved.note_data
					
					if (recieved.name_change) {
						
						//in users nodes names list remove recieved.old_name and add recieved.note_name
						
					}
					
					//update node last update time 
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