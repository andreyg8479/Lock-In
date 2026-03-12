let socket : WebSocket | null = null;
let currentListener: ((data: any) => void) | null = null;
let userId: string | null = null;
let authToken: CryptoKey | null = null;
let username: string | null = null;

export function connectSocket(onMessage: (data: any) => void) {


//Cards on the table, this entire class is part of the old system

//Most of what is here is no longer used

//HOWEVER, its persistance across our different pages proved to be
//really useful for remembering stuff between them, so a lot of that
//still happens here

//please do not try to remove this 




	currentListener = onMessage;

	if (socket) return;

	//hopfully connects to the server
	socket = new WebSocket('ws://localhost:8080')
	
	socket.onopen = () => {
		console.log("Connected to server")
	};
	
	socket.onmessage = (event) => {
	
		let data: any;
		
		//for JSON
		try {
			data = JSON.parse(event.data);
		} catch {
			data = event.data;
		}
		
		if (currentListener) {
			currentListener(data);
		}
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


export function checkSocket() {

	if (!socket) {
		return false;
	}
	
	if (socket.readyState !== WebSocket.OPEN) {
		return false;
	}
	
	return true;
}

export function getUserId() {
    return userId;
}

export function getAuthToken() {
    return authToken;
}

export function getUsername() {
    return username;
}

export function setUserId(id: string) {
    userId = id;
}

export function setAuthToken(token: CryptoKey) {
    authToken = token;
}

export function setUsername(name: string) {
    username = name;
}



