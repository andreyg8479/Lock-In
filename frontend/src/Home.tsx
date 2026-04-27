import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { getLoginCount, setLoginCount, getReminderTime } from "./SettingsMem";

import "./Home.css";

function isHomePath(pathname: string): boolean {
	return pathname === "/" || pathname === "/Home" || pathname === "/main";
}

function desktopNavClass(active: boolean): string {
	const base =
		"font-manrope tracking-tight font-bold headline-md rounded-md px-0.5 py-0.5 hover:bg-[#222a3d] transition-colors duration-150";
	return active
		? `${base} text-[#bbc3ff] border-b-2 border-[#bbc3ff] pb-1`
		: `${base} text-[#434656] hover:text-[#bbc3ff]`;
}

function mobileTabClass(active: boolean): string {
	return `flex flex-col items-center ${active ? "text-[#bbc3ff]" : "text-[#434656]"}`;
}

/**
 * Landing: vault aesthetic with primary actions and feature summary.
 * Anchor tags are React Router `Link` components to the same paths.
 */
function Home() {
	const { pathname } = useLocation();
	const navigate = useNavigate();
	const { email, token, username, logout } = useAuth();

	useEffect(() => {
		document.documentElement.classList.add("dark");

		const prevBodyClass = document.body.className;
		const prevBodyDisplay = document.body.style.display;
		const prevBodyPlaceItems = document.body.style.placeItems;

		document.body.className =
			"bg-background text-on-background min-h-screen selection:bg-primary-container selection:text-on-primary-container";
		document.body.style.display = "block";
		document.body.style.placeItems = "normal";

		return () => {
			document.documentElement.classList.remove("dark");
			document.body.className = prevBodyClass;
			document.body.style.display = prevBodyDisplay;
			if (prevBodyPlaceItems) {
				document.body.style.placeItems = prevBodyPlaceItems;
			} else {
				document.body.style.removeProperty("place-items");
			}
		};
	}, []);

	useEffect(() => {
		const threshold = getReminderTime();
		if (threshold <= 0) return;
		const next = getLoginCount() + 1;
		setLoginCount(next);
		if (next >= threshold * 2) {
			setLoginCount(0);
			alert("Reminder to Change Your Password");
		}
	}, []);

	const onSignOut = () => {
		logout();
		navigate("/");
	};

	return (
		<div className="home-vault-page bg-background text-on-background min-h-screen selection:bg-primary-container selection:text-on-primary-container" data-route="home">
			<header className="bg-[#0b1326] text-[#bbc3ff] fixed top-0 z-50 flex justify-between items-center w-full px-4 sm:px-8 py-4 h-16 transition-colors duration-200">
				<Link
					to="/"
					className="text-xl font-bold tracking-tighter text-[#bbc3ff] flex items-center gap-2 min-w-0 shrink-0"
					aria-label="Lock-In home"
				>
					<span className="material-symbols-outlined shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
						security
					</span>
					<span className="truncate">Lock-In</span>
				</Link>
				<nav className="hidden md:flex items-center space-y-0 space-x-6 lg:space-x-8" aria-label="Main">
					<Link className={desktopNavClass(isHomePath(pathname))} to="/">
						Home
					</Link>
					<Link className={desktopNavClass(pathname === "/NoteList")} to="/NoteList">
						Note List
					</Link>
					<Link className={desktopNavClass(pathname === "/SharedWithMe")} to="/SharedWithMe">
						Shared with me
					</Link>
					<Link className={desktopNavClass(pathname === "/NoteEdit")} to="/NoteEdit">
						New Note
					</Link>
					<Link className={desktopNavClass(pathname === "/Settings")} to="/Settings">
						Settings
					</Link>
				</nav>
				<div className="flex items-center justify-end gap-2 sm:gap-4 min-w-0">
					{token ? (
						<>
							<span
								className="hidden lg:inline max-w-[180px] truncate text-sm text-[#8b9dc8] font-medium"
								title={email ?? undefined}
							>
								{username || email || "Signed in"}
							</span>
							<Link
								to="/NoteList"
								className="hidden md:inline-flex bg-[#222a3d] px-3 py-1.5 rounded-md text-sm font-bold border border-outline-variant/20 hover:bg-[#2d3449] transition-all text-[#bbc3ff] whitespace-nowrap"
							>
								My vault
							</Link>
							<button
								type="button"
								onClick={onSignOut}
								className="text-sm font-bold text-[#8b9dc8] hover:text-[#bbc3ff] px-2 py-1.5 rounded-md transition-colors"
							>
								Sign out
							</button>
						</>
					) : (
						<>
							<Link
								to="/SignUp"
								aria-label="Sign up"
								className="hidden md:block bg-[#222a3d] px-4 py-1.5 rounded-md text-sm font-bold border border-outline-variant/20 hover:bg-[#2d3449] transition-all whitespace-nowrap"
							>
								Sign up
							</Link>
							<Link
								to="/Login"
								aria-label="Log in"
								className="primary-gradient text-on-primary-fixed px-4 py-1.5 rounded-md text-sm font-bold hover:opacity-90 transition-all shadow-lg whitespace-nowrap"
							>
								Log in
							</Link>
						</>
					)}
				</div>
			</header>

			<main className="pt-16 pb-24 md:pb-0">
				<section className="relative min-h-[min(92vh,960px)] flex flex-col justify-center items-center px-6 overflow-hidden">
					<div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
						<div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary-container rounded-full blur-[120px]" />
						<div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-tertiary-container rounded-full blur-[100px]" />
					</div>
					<div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
						<div className="lg:col-span-7 text-center lg:text-left">
							<div className="inline-flex items-center gap-2 px-3 py-1 bg-surface-container-high border border-outline-variant/30 rounded-full mb-8">
								<span className="material-symbols-outlined text-tertiary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
									verified_user
								</span>
								<span className="text-xs font-bold tracking-widest uppercase text-on-surface-variant">Military Grade Encryption Active</span>
							</div>
							<h1 className="text-5xl lg:text-8xl font-extrabold tracking-tighter leading-tight mb-8">
								<span className="text-on-surface">Welcome to </span>
								<span className="hero-title-gradient">Lock-In</span>
							</h1>
							<p className="text-on-surface-variant text-lg lg:text-xl max-w-xl mb-6 font-body leading-relaxed">
								Your private vault for notes: encrypted on your device before anything leaves it. A calm, focused workspace
								built for high-signal secrets—not surveillance.
							</p>
							<div className="mb-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-on-surface-variant/80 lg:justify-start">
								<span>AES-256</span>
								<span className="text-on-surface-variant/30" aria-hidden>
									·
								</span>
								<span>Client-side only</span>
								<span className="text-on-surface-variant/30" aria-hidden>
									·
								</span>
								<span>Zero knowledge</span>
							</div>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<Link
									className="primary-gradient text-on-primary-fixed p-6 rounded-xl flex flex-col justify-between group hover:scale-[1.02] transition-transform shadow-2xl"
									to={token ? "/NoteList" : "/SignUp"}
								>
									<span className="material-symbols-outlined text-3xl mb-4" style={{ fontVariationSettings: "'FILL' 1" }}>
										{token ? "folder_special" : "person_add"}
									</span>
									<div>
										<h3 className="text-xl font-bold headline tracking-tight">
											{token ? "Open your vault" : "Sign up / log in"}
										</h3>
										<p className="text-on-primary-fixed/70 text-sm">
											{token ? "View and manage encrypted notes." : "Create an account or access your vault."}
										</p>
									</div>
								</Link>
								<Link
									className="bg-surface-container-high hover:bg-surface-container-highest p-6 rounded-xl flex flex-col justify-between group hover:scale-[1.02] transition-transform border border-outline-variant/10"
									to="/NoteList"
								>
									<span className="material-symbols-outlined text-3xl text-primary mb-4">description</span>
									<div>
										<h3 className="text-xl font-bold headline tracking-tight">Go to note list</h3>
										<p className="text-on-surface-variant text-sm">Browse and open your encrypted records.</p>
									</div>
								</Link>
								<Link
									className="bg-surface-container-high hover:bg-surface-container-highest p-6 rounded-xl flex flex-col justify-between group hover:scale-[1.02] transition-transform border border-outline-variant/10"
									to="/NoteEdit"
								>
									<span className="material-symbols-outlined text-3xl text-tertiary mb-4" style={{ fontVariationSettings: "'FILL' 1" }}>
										add_box
									</span>
									<div>
										<h3 className="text-xl font-bold headline tracking-tight">New note</h3>
										<p className="text-on-surface-variant text-sm">Start a fresh encrypted entry.</p>
									</div>
								</Link>
								<Link
									className="bg-surface-container-high hover:bg-surface-container-highest p-6 rounded-xl flex flex-col justify-between group hover:scale-[1.02] transition-transform border border-outline-variant/10"
									to="/Settings"
								>
									<span className="material-symbols-outlined text-3xl text-secondary mb-4">settings</span>
									<div>
										<h3 className="text-xl font-bold headline tracking-tight">Vault settings</h3>
										<p className="text-on-surface-variant text-sm">Password reminders, 2FA, and preferences.</p>
									</div>
								</Link>
							</div>
							<div className="mt-8 flex flex-wrap justify-center lg:justify-start gap-4">
								<Link
									className="text-primary font-bold hover:underline flex items-center gap-2 p-2"
									to={token ? "/NoteList" : "/Login"}
								>
									{token ? "Open vault" : "Log in to vault"}{" "}
									<span className="material-symbols-outlined" aria-hidden>
										arrow_forward
									</span>
								</Link>
								<Link
									className="text-error font-medium hover:bg-error/10 px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
									to="/DeleteAll"
								>
									<span className="material-symbols-outlined text-sm" aria-hidden>
										delete_forever
									</span>
									Delete all data
								</Link>
							</div>
						</div>
						<div className="lg:col-span-5 hidden lg:block">
							<div className="relative group">
								<div className="glass-panel p-8 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden">
									<div className="flex items-center gap-4 mb-8">
										<div className="w-12 h-12 rounded-full bg-primary-container/20 flex items-center justify-center">
											<span className="material-symbols-outlined text-primary" aria-hidden>
												fingerprint
											</span>
										</div>
										<div>
											<p className="text-on-surface font-bold">Biometric ready</p>
											<p className="text-on-surface-variant text-xs">Hardening layers on this device</p>
										</div>
									</div>
									<div className="space-y-4" aria-hidden>
										<div className="h-4 bg-surface-container-highest w-3/4 rounded-full" />
										<div className="h-4 bg-surface-container-highest w-full rounded-full opacity-60" />
										<div className="h-4 bg-surface-container-highest w-1/2 rounded-full opacity-30" />
									</div>
									<div className="mt-12 p-4 bg-tertiary/10 rounded-xl border border-tertiary/20 flex items-center gap-3">
										<span className="material-symbols-outlined text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden>
											shield
										</span>
										<span className="text-tertiary text-sm font-bold">Strong cryptography at rest and in transit</span>
									</div>
								</div>
								<div className="absolute -top-6 -right-6 w-24 h-24 bg-[#3ce36a] opacity-20 blur-xl rounded-full pointer-events-none" aria-hidden />
							</div>
						</div>
					</div>
				</section>

				<section className="bg-surface-container-low py-24">
					<div className="max-w-6xl mx-auto px-6 text-center">
						<h2 className="text-3xl font-bold headline tracking-tight mb-4">Engineered for privacy</h2>
						<p className="text-on-surface-variant max-w-2xl mx-auto mb-16 text-base">
							Principles you can verify in how the app is built—encryption first, your keys on your side of the line.
						</p>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12 text-left sm:text-center">
							<div className="flex flex-col items-center p-6 rounded-2xl bg-surface-container/50 border border-outline-variant/10">
								<div className="mb-6 w-16 h-16 bg-surface-container flex items-center justify-center rounded-2xl shadow-xl">
									<span className="material-symbols-outlined text-primary text-3xl" aria-hidden>
										key
									</span>
								</div>
								<h3 className="text-xl font-bold mb-3">Zero-knowledge</h3>
								<p className="text-on-surface-variant leading-relaxed max-w-sm">
									We don&apos;t read your note bodies. Data is encrypted before it is stored or synced, with keys derived from
									what only you know.
								</p>
							</div>
							<div className="flex flex-col items-center p-6 rounded-2xl bg-surface-container/50 border border-outline-variant/10">
								<div className="mb-6 w-16 h-16 bg-surface-container flex items-center justify-center rounded-2xl shadow-xl">
									<span className="material-symbols-outlined text-tertiary text-3xl" aria-hidden>
										cloud_done
									</span>
								</div>
								<h3 className="text-xl font-bold mb-3">Sync when you do</h3>
								<p className="text-on-surface-variant leading-relaxed max-w-sm">
									After you authenticate, the vault can stay current across your devices without exposing content in plain
									form on the network.
								</p>
							</div>
							<div className="flex flex-col items-center p-6 rounded-2xl bg-surface-container/50 border border-outline-variant/10">
								<div className="mb-6 w-16 h-16 bg-surface-container flex items-center justify-center rounded-2xl shadow-xl">
									<span className="material-symbols-outlined text-secondary text-3xl" aria-hidden>
										timer_3
									</span>
								</div>
								<h3 className="text-xl font-bold mb-3">Self-destruct options</h3>
								<p className="text-on-surface-variant leading-relaxed max-w-sm">
									Use timers and cleanup tools where the product supports them to limit how long sensitive material sticks
									around.
								</p>
							</div>
						</div>
					</div>
				</section>
			</main>

			<footer className="bg-background py-16 px-8 border-t border-outline-variant/10">
				<div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
					<div className="flex items-center gap-2">
						<span className="text-lg font-black text-[#bbc3ff] tracking-tighter">Lock-In</span>
						<span className="text-xs text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded-full ml-2">v2.4.0</span>
					</div>
					<nav className="flex flex-wrap justify-center gap-6 md:gap-8 text-sm font-medium text-on-surface-variant" aria-label="Footer">
						<Link className="hover:text-primary transition-colors" to="/About">
							About
						</Link>
						<a className="hover:text-primary transition-colors" href="#">
							Privacy
						</a>
					</nav>
					<div className="text-on-surface-variant text-sm font-label text-center md:text-right">
						© 2026 Lock-In. All data encrypted in your vault.
					</div>
				</div>
			</footer>

			<div className="md:hidden fixed bottom-0 left-0 right-0 glass-panel h-16 flex justify-around items-center z-50 border-t border-white/5" role="navigation" aria-label="Mobile main">
				<Link className={mobileTabClass(isHomePath(pathname))} to="/">
					<span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden>
						home
					</span>
					<span className="text-[10px] font-bold">Home</span>
				</Link>
				<Link className={mobileTabClass(pathname === "/NoteList")} to="/NoteList">
					<span className="material-symbols-outlined" aria-hidden>
						description
					</span>
					<span className="text-[10px] font-bold">List</span>
				</Link>
				<Link className={mobileTabClass(pathname === "/NoteEdit")} to="/NoteEdit" aria-label="New note">
					<div className="bg-primary text-on-primary-fixed w-10 h-10 rounded-xl flex items-center justify-center -translate-y-4 shadow-lg">
						<span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden>
							add
						</span>
					</div>
				</Link>
				<Link className={mobileTabClass(pathname === "/Settings")} to="/Settings">
					<span className="material-symbols-outlined" aria-hidden>
						settings
					</span>
					<span className="text-[10px] font-bold">Settings</span>
				</Link>
			</div>
		</div>
	);
}

export default Home;
