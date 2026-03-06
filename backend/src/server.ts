// server.ts
import express from "express"
import path from "path"
import http from "http"
import dotenv from "dotenv"
import { WebSocketServer, WebSocket } from "ws";
import { createClient } from "@supabase/supabase-js" 
import cors from "cors" // CORS resolution to accept HTTP requests on 8080 from 5173

// For Supabase connection
dotenv.config();
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_KEY;

// Check if environment variables are set
if (!url || !key) {
	throw new Error("SUPABASE_URL and SUPABASE_KEY must be set in environment variables");
}

const supabase = createClient(url, key);

// Note: This WS stuff is legacy code because we switched to a RESTful API
const PORT = process.env.PORT || 8080;

import { handleSignup, handleLogin, deleteAccount } from "./controllers/AuthController";
import { getAllNoteNames, getNote, uploadNote, deleteNote, updateNote } from "./controllers/VaultController";

// RESTful API routes will be defined using Express, and WebSocket will be used for real-time features if needed
export const app = express();
app.use(cors({
	origin: "http://localhost:5173", // this may need to be changed to sm more scalable in the future
	methods: ["GET", "POST", "PUT", "DELETE"],
	credentials: true
}));
app.use(express.json())

app.post("/api/auth/signup", handleSignup);
app.post("/api/auth/login", handleLogin);

app.post("/api/vault/fileNames", getAllNoteNames); // Changed to post to accept body easily
app.get("/api/vault/file", getNote);
app.post("/api/vault/file", uploadNote);
app.delete("/api/vault/file", deleteNote);
app.put("/api/vault/file", updateNote); // Legacy support
app.put("/api/vault/file/:noteId", updateNote); // New support for ID-based updates

app.delete("/api/auth/account", deleteAccount);

// this is to serve the react front end
const frontendPath = path.resolve(__dirname, "../../frontend/dist");
console.log("Serving frontend from:", frontendPath);

app.use(express.static(frontendPath));

// API routes (must be before catch-all so they are reachable)
app.use(express.json());

function validateSignupBody(body: any) {
  const { username, email, saltB64, iterations, wrapIvB64, wrappedMasterKeyB64 } = body ?? {};
  if (!username || typeof username !== "string" || !username.trim())
    return { ok: false, error: "Username is required" };
  if (!email || typeof email !== "string" || !email.trim())
    return { ok: false, error: "Email is required" };
  if (!saltB64 || typeof saltB64 !== "string")
    return { ok: false, error: "saltB64 is required" };
  const iter = Number(iterations);
  if (!Number.isInteger(iter) || iter < 100000)
    return { ok: false, error: "iterations must be a valid integer (at least 100000)" };
  if (!wrapIvB64 || typeof wrapIvB64 !== "string")
    return { ok: false, error: "wrapIvB64 is required" };
  if (!wrappedMasterKeyB64 || typeof wrappedMasterKeyB64 !== "string")
    return { ok: false, error: "wrappedMasterKeyB64 is required" };
  return { ok: true };
}

/* app.post('/api/signup', async (req, res) => {
  const validation = validateSignupBody(req.body);
  if (!validation.ok) return res.status(400).json({ error: validation.error });

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
}); */

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
  socket.on("message", async (message) => {
	
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
				case "GetNote":			
					
					
					
				break;
				case "Override":
					//delete old note from database
					//at users data at recieved.note_name store recieved.note_data
					
					if (recieved.name_change) {
						
						//in users nodes names list remove recieved.old_name and add recieved.note_name
						
					}
					
					//update node last update time 
				break;
                case "NewNote":
					
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
	console.log(`Server started on port ${PORT}`);
});
