import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
 setLastHome,
 getLastHome,
 getReminderTime
 } from "./SettingsMem";

import "./Home.css";

function isHomePath(pathname: string): boolean {
	return pathname === "/" || pathname === "/Home" || pathname === "/main";
}

function desktopNavClass(active: boolean): string {
	const base =
		"font-manrope tracking-tight font-bold headline-md hover:bg-[#222a3d] transition-colors scale-95 duration-100";
	return active
		? `${base} text-[#bbc3ff] border-b-2 border-[#bbc3ff] pb-1`
		: `${base} text-[#434656] hover:text-[#bbc3ff]`;
}

function mobileTabClass(active: boolean): string {
	return `flex flex-col items-center ${active ? "text-[#bbc3ff]" : "text-[#434656]"}`;
}

/**
 * Port of `frontend2/homepage` — structure and Tailwind classes preserved for identical aesthetic.
 * Anchor tags are React Router `Link` components to the same paths.
 */
function Home() {
	const { pathname } = useLocation();

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
	
	
	//interval logic
	
	
	const date1 = new Date(getLastHome());
	const date2 = new Date();

	const diffTime = Math.abs(date2 - date1);

	//millisecons to days
	const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
	
	if (diffDays >= getReminderTime()) {
	
		setLastHome(date2.toLocaleDateString());
	
	}
	

	return (
		<div className="home-vault-page bg-background text-on-background min-h-screen selection:bg-primary-container selection:text-on-primary-container" data-route="home">
			{/* Top Navigation — unchanged from mock */}
			<header className="bg-[#0b1326] text-[#bbc3ff] fixed top-0 z-50 flex justify-between items-center w-full px-8 py-4 h-16 transition-colors duration-200">
				<div className="text-xl font-bold tracking-tighter text-[#bbc3ff] flex items-center gap-2">
					<span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
						security
					</span>
					The Sentinel
				</div>
				<nav className="hidden md:flex items-center space-y-0 space-x-8">
					<Link className={desktopNavClass(isHomePath(pathname))} to="/">
						Home
					</Link>
					<Link className={desktopNavClass(pathname === "/NoteList")} to="/NoteList">
						Note List
					</Link>
					<Link className={desktopNavClass(pathname === "/NoteEdit")} to="/NoteEdit">
						New Note
					</Link>
					<Link className={desktopNavClass(pathname === "/Settings")} to="/Settings">
						Settings
					</Link>
				</nav>
				<div className="flex items-center gap-4">
					<button type="button" aria-label="Dark Mode" className="p-2 hover:bg-[#222a3d] rounded-md transition-colors">
						<span className="material-symbols-outlined text-[#bbc3ff]">dark_mode</span>
					</button>
					<Link
						to="/SignUp"
						aria-label="Sign Up"
						className="hidden md:block bg-[#222a3d] px-4 py-1.5 rounded-md text-sm font-bold border border-outline-variant/20 hover:bg-[#2d3449] transition-all"
					>
						Sign up
					</Link>
					<Link
						to="/Login"
						aria-label="Log In"
						className="primary-gradient text-on-primary-fixed px-4 py-1.5 rounded-md text-sm font-bold hover:opacity-90 transition-all shadow-lg"
					>
						Log in
					</Link>
				</div>
			</header>

			<main className="pt-16">
				<section className="relative min-h-[921px] flex flex-col justify-center items-center px-6 overflow-hidden">
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
							<p className="text-on-surface-variant text-lg lg:text-xl max-w-xl mb-12 font-body leading-relaxed">
								The world&apos;s most secure digital vault for your sensitive notes. Forged in the midnight Navy of deep-security architecture, ensuring your data remains invisible to the world.
							</p>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<Link
									className="primary-gradient text-on-primary-fixed p-6 rounded-xl flex flex-col justify-between group hover:scale-[1.02] transition-transform shadow-2xl"
									to="/SignUp"
								>
									<span className="material-symbols-outlined text-3xl mb-4" style={{ fontVariationSettings: "'FILL' 1" }}>
										person_add
									</span>
									<div>
										<h3 className="text-xl font-bold headline tracking-tight">Sign Up/Login</h3>
										<p className="text-on-primary-fixed/70 text-sm">Join the ecosystem of silence.</p>
									</div>
								</Link>
								<Link
									className="bg-surface-container-high hover:bg-surface-container-highest p-6 rounded-xl flex flex-col justify-between group hover:scale-[1.02] transition-transform border border-outline-variant/10"
									to="/NoteList"
								>
									<span className="material-symbols-outlined text-3xl text-primary mb-4">description</span>
									<div>
										<h3 className="text-xl font-bold headline tracking-tight">Go To Note List</h3>
										<p className="text-on-surface-variant text-sm">Manage your encrypted records.</p>
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
										<h3 className="text-xl font-bold headline tracking-tight">Make New Note</h3>
										<p className="text-on-surface-variant text-sm">Seal a new thought today.</p>
									</div>
								</Link>
								<Link
									className="bg-surface-container-high hover:bg-surface-container-highest p-6 rounded-xl flex flex-col justify-between group hover:scale-[1.02] transition-transform border border-outline-variant/10"
									to="/Settings"
								>
									<span className="material-symbols-outlined text-3xl text-secondary mb-4">settings</span>
									<div>
										<h3 className="text-xl font-bold headline tracking-tight">Vault Settings</h3>
										<p className="text-on-surface-variant text-sm">Configure security protocols.</p>
									</div>
								</Link>
							</div>
							<div className="mt-8 flex flex-wrap justify-center lg:justify-start gap-4">
								<Link className="text-primary font-bold hover:underline flex items-center gap-2 p-2" to="/Login">
									Return to Vault <span className="material-symbols-outlined">arrow_forward</span>
								</Link>
								<Link className="text-error font-medium hover:bg-error/10 px-4 py-2 rounded-md flex items-center gap-2 transition-colors" to="/DeleteAll">
									<span className="material-symbols-outlined text-sm">delete_forever</span>
									Delete All Data
								</Link>
							</div>
						</div>
						<div className="lg:col-span-5 hidden lg:block">
							<div className="relative group">
								<div className="glass-panel p-8 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden">
									<div className="flex items-center gap-4 mb-8">
										<div className="w-12 h-12 rounded-full bg-primary-container/20 flex items-center justify-center">
											<span className="material-symbols-outlined text-primary">fingerprint</span>
										</div>
										<div>
											<h4 className="text-on-surface font-bold">Biometric Authenticated</h4>
											<p className="text-on-surface-variant text-xs">Access Level: Maximum</p>
										</div>
									</div>
									<div className="space-y-4">
										<div className="h-4 bg-surface-container-highest w-3/4 rounded-full" />
										<div className="h-4 bg-surface-container-highest w-full rounded-full opacity-60" />
										<div className="h-4 bg-surface-container-highest w-1/2 rounded-full opacity-30" />
									</div>
									<div className="mt-12 p-4 bg-tertiary/10 rounded-xl border border-tertiary/20 flex items-center gap-3">
										<span className="material-symbols-outlined text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>
											shield
										</span>
										<span className="text-tertiary text-sm font-bold">SHA-256 Protocol Enabled</span>
									</div>
								</div>
								<div className="absolute -top-6 -right-6 w-24 h-24 bg-[#3ce36a] opacity-20 blur-xl rounded-full" />
							</div>
						</div>
					</div>
				</section>

				<section className="bg-surface-container-low py-24">
					<div className="max-w-6xl mx-auto px-6 text-center">
						<h2 className="text-3xl font-bold headline tracking-tight mb-16">Engineered for absolute privacy</h2>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-12">
							<div className="flex flex-col items-center">
								<div className="mb-6 w-16 h-16 bg-surface-container flex items-center justify-center rounded-2xl shadow-xl">
									<span className="material-symbols-outlined text-primary text-3xl">key</span>
								</div>
								<h3 className="text-xl font-bold mb-3">Zero-Knowledge</h3>
								<p className="text-on-surface-variant leading-relaxed">
									Even we can&apos;t see your data. Everything is encrypted client-side before it ever leaves your device.
								</p>
							</div>
							<div className="flex flex-col items-center">
								<div className="mb-6 w-16 h-16 bg-surface-container flex items-center justify-center rounded-2xl shadow-xl">
									<span className="material-symbols-outlined text-tertiary text-3xl">cloud_done</span>
								</div>
								<h3 className="text-xl font-bold mb-3">Seamless Sync</h3>
								<p className="text-on-surface-variant leading-relaxed">
									Your vault stays up to date across all your authenticated devices without compromising security.
								</p>
							</div>
							<div className="flex flex-col items-center">
								<div className="mb-6 w-16 h-16 bg-surface-container flex items-center justify-center rounded-2xl shadow-xl">
									<span className="material-symbols-outlined text-secondary text-3xl">timer_3</span>
								</div>
								<h3 className="text-xl font-bold mb-3">Self-Destruct</h3>
								<p className="text-on-surface-variant leading-relaxed">
									Set timers for sensitive entries to purge themselves permanently from existence.
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
					<nav className="flex flex-wrap justify-center gap-8 text-sm font-medium text-on-surface-variant">
						<a className="hover:text-primary transition-colors" href="#">
							Privacy Policy
						</a>
						<a className="hover:text-primary transition-colors" href="#">
							Security Audit
						</a>
						<a className="hover:text-primary transition-colors" href="#">
							Terms of Vault
						</a>
						<a className="hover:text-primary transition-colors" href="#">
							Contact Intelligence
						</a>
					</nav>
					<div className="text-on-surface-variant text-sm font-label">© 2024 The Sentinel Group. All data encrypted.</div>
				</div>
			</footer>

			<div className="md:hidden fixed bottom-0 left-0 right-0 glass-panel h-16 flex justify-around items-center z-50">
				<Link className={mobileTabClass(isHomePath(pathname))} to="/">
					<span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
						home
					</span>
					<span className="text-[10px] font-bold">Home</span>
				</Link>
				<Link className={mobileTabClass(pathname === "/NoteList")} to="/NoteList">
					<span className="material-symbols-outlined">description</span>
					<span className="text-[10px] font-bold">List</span>
				</Link>
				<Link className={mobileTabClass(pathname === "/NoteEdit")} to="/NoteEdit">
					<div className="bg-primary text-on-primary-fixed w-10 h-10 rounded-xl flex items-center justify-center -translate-y-4 shadow-lg">
						<span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
							add
						</span>
					</div>
				</Link>
				<Link className={mobileTabClass(pathname === "/Settings")} to="/Settings">
					<span className="material-symbols-outlined">settings</span>
					<span className="text-[10px] font-bold">Settings</span>
				</Link>
			</div>
		</div>
	);
}

export default Home;
