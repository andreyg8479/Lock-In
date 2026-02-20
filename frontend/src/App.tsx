import { useEffect, useState } from 'react'
import './App.css'

function App() {
	const [messages, setMessages] = useState<string[]>([])
  
	useEffect(() => {
		//hopfully connects to the server
		const ws = new WebSocket('ws://localhost:8080')
		
		ws.onopen = () => {
			console.log("Connected to server")
		};
		
		ws.onmessage = (event) => {
			setMessages(prev => [...prev, event.data])
			//ws.send("Got your message"); //this isnt json dont send like this
		}
		
		ws.onclose = () => {
			console.log("Connection closed")
		}
		
		return () => ws.close() // clean up stuff
	}, [])

  return (
	<div>
		<h1>WebSocket Messages Experiment</h1>
		<ul>
			{messages.map((msg, idx) => (
				<li key={idx}>{msg}</li>
			))}
		</ul>
	</div>
  )
}

export default App
