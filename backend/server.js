const express = require("express");
const path = require("path"); //for file paths
const http = require("http"); // for http which I apparently need to connect to react

// temporary check for duplicate usernames
const usersByUsername = new Map();
// replace with DB eventually

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
  res.sendFile(path.join(frontendPath, "index.html"), (err) => {
    if (err) console.error("Error sending file:", err);
  });
});

// this creates an http server
const server = http.createServer(app);

const wss = new WebSocket.Server({ server });

const State = Object.freeze({
  //this can be replaced with an actual enum if we switch to typescript
  STANDARD: "STANDARD", //for most requests (create note, fetch names, ect)
  VERIFYING: "VERIFYING", //When verifying password
  KEY_SETUP: "KEY_SETUP", //For setting up verification key
});

//Runs when a browser connects, basicly this is any individual client
wss.on("connection", (socket) => {
  console.log("Client connected");

  socket.send("Hello Client");

  let SM = State.STANDARD; //State Machine

  //socket.send(); //use this to send stuff to the client

  //This runs when this client sends a message (CURRENTLY STRINGS)
  socket.on("message", (message) => {
    console.log("Received:", message.toString());

    let recieved;

    try {
      recieved = JSON.parse(message.toString());
    } catch (e) {
      socket.send(JSON.stringify({ type: "ERROR", message: "Incorrect JSON" }));
      return;
    }

    switch (
      SM //handle the request based on the state
    ) {
      case State.STANDARD:
        if (recieved.type === "PING") {
          socket.send(JSON.stringify({ type: "PONG" }));
        }

        // temporary console client (cli-register.js)
        if (recieved.type === "REGISTER_REQUEST") {
          const username = String(recieved.username ?? "").trim();
          const password = String(recieved.password ?? "");

          if (!username) {
            socket.send(
              JSON.stringify({
                type: "REGISTER_ERROR",
                message: "Username required",
              }),
            );
            break;
          }
          if (password.length < 8) {
            socket.send(
              JSON.stringify({
                type: "REGISTER_ERROR",
                message: "Password must be at least 8 characters",
              }),
            );
            break;
          }
          if (usersByUsername.has(username)) {
            socket.send(
              JSON.stringify({
                type: "REGISTER_ERROR",
                message: "Username already exists",
              }),
            );
            break;
          }

          const userId = `u_${Date.now()}`;
          usersByUsername.set(username, { userId, username, password }); // TEMP

          console.warn(
            "[CONSOLE WARNING] Password recovery not implemented; forgetting it may be unrecoverable.",
          );

          socket.send(JSON.stringify({ type: "REGISTER_OK", userId }));
          break;
        }

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

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`WebSocket running at ws://localhost:${PORT}`);
});

function generateUnencryptedKey() {
  const charCount = 32;
  let key = "";
  for (let i = 0; i < charCount; i++) {
    key = key + String.fromCharCode(Math.floor(Math.random() * 65536)); //gives random character
  }
  return key;
}
