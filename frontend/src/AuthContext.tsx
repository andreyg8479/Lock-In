import { createContext, useContext, useState, type ReactNode } from "react";

type AuthState = {
	userId: string | null;
	vaultKey: CryptoKey | null;
	username: string | null;
	email: string | null;
	setUserId: (id: string) => void;
	setVaultKey: (key: CryptoKey) => void;
	setUsername: (name: string) => void;
	setEmail: (email: string) => void;
	logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [userId, setUserId] = useState<string | null>(null);
	const [vaultKey, setVaultKey] = useState<CryptoKey | null>(null);
	const [username, setUsername] = useState<string | null>(null);
	const [email, setEmail] = useState<string | null>(null);

	const logout = () => {
		setUserId(null);
		setVaultKey(null);
		setUsername(null);
		setEmail(null);
	};

	return (
		<AuthContext.Provider value={{ userId, vaultKey, username, email, setUserId, setVaultKey, setUsername, setEmail, logout }}>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth(): AuthState {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
	return ctx;
}
