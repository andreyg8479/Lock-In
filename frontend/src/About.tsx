import { useNavigate } from "react-router-dom";
import "./Settings.css";
import "./About.css";

function About() {
	const navigate = useNavigate();

	return (
		<div className="about-page">
			<div className="top-bar">
				<button type="button" className="home-button" onClick={() => navigate("/main")}>
					Home
				</button>
				<h1>About Lock-In security</h1>
				<div className="top-bar-spacer" aria-hidden="true" />
			</div>

			<div className="about-scroll">
				<p className="about-lead">
					Lock-In is built so your vault contents and note titles are encrypted on your device before they ever reach
					our servers. The architecture follows common password-manager practice: industry-standard algorithms, a
					high-iteration key derivation, and a master vault key that stays inside your session—not in plaintext on
					the network.
				</p>

				<section className="about-section" aria-labelledby="about-crypto">
					<h2 id="about-crypto">Cryptography in the app</h2>
					<ul className="about-list">
						<li>
							<strong>Key derivation (PBKDF2).</strong> Your account password is stretched with{" "}
							<strong>PBKDF2</strong> using <strong>SHA-256</strong> and a large iteration count
							(currently <strong>310,000</strong> rounds), with a unique random salt per account. That slows
							offline guessing if someone ever obtained your stored material.
						</li>
						<li>
							<strong>Symmetric encryption (AES-GCM).</strong> Notes, note titles, optional second passwords, and
							the wrapped vault key use <strong>AES-256-GCM</strong> via the browser&apos;s{" "}
							<strong>Web Crypto API</strong>. GCM provides confidentiality and authentication: tampering is
							detected when decrypting.
						</li>
						<li>
							<strong>Vault key wrapping.</strong> A random 256-bit vault key encrypts your data. That key is
							encrypted with keys derived from your password and additional data that binds the wrap to your
							username and email, so blobs are not portable across accounts.
						</li>
						<li>
							<strong>Server authentication hash.</strong> The server stores a derived authentication hash (not
							your password and not the raw vault key) so it can verify logins without learning your master
							secret or your decrypted notes.
						</li>
						<li>
							<strong>Randomness.</strong> Salts and IVs are generated with a cryptographically secure random
							source (<code>crypto.getRandomValues</code>). Note content and titles use fresh IVs so patterns
							are not reused in ways that weaken encryption.
						</li>
					</ul>
				</section>

				<section className="about-section" aria-labelledby="about-trust">
					<h2 id="about-trust">Why you can trust this design</h2>
					<ul className="about-list">
						<li>
							<strong>Client-side encryption.</strong> The sensitive payload is encrypted in your browser; the
							service is not designed to read your note plaintext or your master password.
						</li>
						<li>
							<strong>Standard, well-studied building blocks.</strong> PBKDF2, SHA-256, and AES-GCM are widely
							audited choices. Using the platform Web Crypto implementation keeps operations in well-tested
							browser code paths.
						</li>
						<li>
							<strong>Defense in depth.</strong> You can add <strong>two-factor authentication (2FA)</strong> in
							Settings so a stolen password alone is not enough to access the account, depending on your threat
							model.
						</li>
						<li>
							<strong>Honest limits.</strong> Trust also depends on your device being free of malware, you
							choosing a strong master password, and keeping your session secure. No cloud vault removes the
							need for good habits—but Lock-In is built so we are not a trusted party for your note contents in
							the way a plaintext cloud provider would be.
						</li>
					</ul>
				</section>
			</div>
		</div>
	);
}

export default About;
