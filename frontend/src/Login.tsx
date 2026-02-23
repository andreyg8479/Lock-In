import React, { useState } from "react";
import "./Login.css";

const Login: React.FC = () => {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		// TODO: replace with real login call to backend
		console.log("Logging in with:", { email, password });
	};

	return (
		<div className="auth-page">
			<div className="auth-card">
				<h2 className="auth-title">Login</h2>
				<p className="auth-subtitle">Welcome back to LockIn</p>

				<form className="auth-form" onSubmit={handleSubmit}>
					<label className="auth-label">
						<span>Email</span>
						<input
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="you@example.com"
							required
							className="auth-input"
						/>
					</label>

					<label className="auth-label">
						<span>Password</span>
						<input
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							placeholder="Enter your password"
							required
							className="auth-input"
						/>
					</label>

					<button type="submit" className="auth-button">
						Login
					</button>
				</form>
			</div>
		</div>
	);
};

export default Login;
