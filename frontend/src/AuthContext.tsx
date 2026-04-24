import { createContext, useContext, useState, type ReactNode } from "react";

type AuthState = {
	userId: string | null;
	vaultKey: CryptoKey | null;
	username: string | null;
	email: string | null;
	token: string | null;
	/** Unwrapped RSA-OAEP private key for opening incoming shares. Only
	 *  present after login has finished (or after backfill on first login
	 *  for legacy accounts). */
	rsaPrivateKey: CryptoKey | null;
	/** Our own RSA-OAEP public key — cached so we can include it in
	 *  outgoing artifacts without an extra server round-trip. */
	rsaPublicKey: CryptoKey | null;
	setUserId: (id: string) => void;
	setVaultKey: (key: CryptoKey) => void;
	setUsername: (name: string) => void;
	setEmail: (email: string) => void;
	setToken: (token: string) => void;
	setRsaPrivateKey: (key: CryptoKey | null) => void;
	setRsaPublicKey: (key: CryptoKey | null) => void;
	logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [userId, setUserId] = useState<string | null>(null);
	const [vaultKey, setVaultKey] = useState<CryptoKey | null>(null);
	const [username, setUsername] = useState<string | null>(null);
	const [email, setEmail] = useState<string | null>(null);
	const [token, setToken] = useState<string | null>(null);
	const [rsaPrivateKey, setRsaPrivateKey] = useState<CryptoKey | null>(null);
	const [rsaPublicKey, setRsaPublicKey] = useState<CryptoKey | null>(null);

	const logout = () => {
		setUserId(null);
		setVaultKey(null);
		setUsername(null);
		setEmail(null);
		setToken(null);
		setRsaPrivateKey(null);
		setRsaPublicKey(null);
	};

	return (
		<AuthContext.Provider
			value={{
				userId,
				vaultKey,
				username,
				email,
				token,
				rsaPrivateKey,
				rsaPublicKey,
				setUserId,
				setVaultKey,
				setUsername,
				setEmail,
				setToken,
				setRsaPrivateKey,
				setRsaPublicKey,
				logout,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth(): AuthState {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
	return ctx;
}
