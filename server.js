
const WebSocket = require("ws");

const PORT = process.env.PORT || 8080;

const wss = new WebSocket.Server({ port: PORT });

console.log(`Server running at ws://localhost:${PORT}`);

// TODO actually get libary in github

//Runs when a browser connects, basicly this is any individual client
wss.on("connection", (socket) => {
  console.log("Client connected");
  
  //socket.send(); //use this to send stuff to the client
  
  //This runs when this client sends a message (CURRENTLY STRINGS)
  socket.on("message", (message) => {
    console.log("Received:", message.toString());
	
  });
  
  
  
  
  socket.on("close", () => {
    console.log("Client disconnected");
  });
});