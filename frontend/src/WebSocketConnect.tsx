


let socket : WebSocket | null = null;


export function connectSocket(onMessage: (data: string) => void) {

	//hopfully connects to the server
	socket = new WebSocket('ws://localhost:8080')
	
	socket.onopen = () => {
		console.log("Connected to server")
	};
	
	socket.onmessage = (event) => {
		onMessage(event.data);
	};
	
	socket.onclose = () => {
		console.log("Connection closed")
	};
}

export function sendMessage(message: string) {

	if (!socket) {
		console.log("Socket does not exist");
		return;
	}
	
	if (socket.readyState !== WebSocket.OPEN) {
		console.log("Socket not open yet");
		console.log("Socket state:", socket?.readyState);
		return;
	}
	
	socket.send(message);
}
	
	