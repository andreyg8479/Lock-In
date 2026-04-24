import { useState } from "react";
import { useAuth } from "./AuthContext";
import type { DecryptedNote } from "../../shared_types/note_types";
import { createShareBundle, importPublicKeyB64 } from "./crypto/lockinCrypto";
import { lookupUserByEmail, createShare } from "./api";
import "./ShareNoteDialog.css";

type Props = {
	note: DecryptedNote;
	onClose: () => void;
};

type Step = "input" | "confirm" | "sending" | "done";

/** Modal for sharing the currently-open note with a single recipient. The
 *  note is re-encrypted client-side under a fresh per-share AES key, and
 *  that key is RSA-OAEP-sealed to the recipient's public key — the server
 *  never sees plaintext. */
export default function ShareNoteDialog({ note, onClose }: Props) {
	const { token, email: myEmail } = useAuth();
	const [recipientEmail, setRecipientEmail] = useState("");
	const [expiresAt, setExpiresAt] = useState(""); // datetime-local value
	const [recipient, setRecipient] = useState<{
		id: string;
		username: string;
		publicKeySpkiB64: string;
	} | null>(null);
	const [step, setStep] = useState<Step>("input");
	const [errorMsg, setErrorMsg] = useState<string | null>(null);
	const [successLink, setSuccessLink] = useState<string | null>(null);

	const onLookup = async () => {
		setErrorMsg(null);
		if (!token) {
			setErrorMsg("You must be logged in.");
			return;
		}
		const normalized = recipientEmail.trim().toLowerCase();
		if (!normalized) {
			setErrorMsg("Enter a recipient email.");
			return;
		}
		if (myEmail && normalized === myEmail.trim().toLowerCase()) {
			setErrorMsg("You can't share a note with yourself.");
			return;
		}
		try {
			const result = await lookupUserByEmail(normalized, token);
			if ("notFound" in result) {
				setErrorMsg("No LockIn account is registered with that email.");
				return;
			}
			if ("notReady" in result) {
				setErrorMsg(
					`${result.username} needs to sign in once to enable sharing before you can share with them.`
				);
				return;
			}
			setRecipient({
				id: result.id,
				username: result.username,
				publicKeySpkiB64: result.publicKeySpkiB64,
			});
			setStep("confirm");
		} catch (e: any) {
			setErrorMsg(e?.message || "Failed to look up recipient.");
		}
	};

	const onConfirmSend = async () => {
		if (!token || !recipient) return;
		setStep("sending");
		setErrorMsg(null);
		try {
			const pub = await importPublicKeyB64(recipient.publicKeySpkiB64);
			const bundle = await createShareBundle(note, pub);

			const expiresIso = expiresAt ? new Date(expiresAt).toISOString() : undefined;
			if (expiresIso && Date.parse(expiresIso) <= Date.now()) {
				setErrorMsg("Expiration must be in the future.");
				setStep("confirm");
				return;
			}

			const result = await createShare(
				{
					recipientId: recipient.id,
					sourceNoteId: note.id || undefined,
					noteType: bundle.note_type,
					note_title: bundle.note_title,
					note_text: bundle.note_text,
					iv_text_b64: bundle.iv_text_b64,
					encrypted_share_key_b64: bundle.encrypted_share_key_b64,
					expiresAt: expiresIso,
				},
				token
			);
			setSuccessLink(`${window.location.origin}/shared/${result.shareId}`);
			setStep("done");
		} catch (e: any) {
			setErrorMsg(e?.message || "Failed to send share.");
			setStep("confirm");
		}
	};

	return (
		<div className="share-dialog-backdrop" role="dialog" aria-modal="true">
			<div className="share-dialog">
				<h3>Share note</h3>
				<p className="share-dialog-subtitle">
					Send a frozen, end-to-end encrypted copy of this note.
				</p>

				{step === "input" && (
					<>
						<label className="share-dialog-label">
							<span>Recipient email</span>
							<input
								type="email"
								value={recipientEmail}
								onChange={(e) => setRecipientEmail(e.target.value)}
								placeholder="friend@example.com"
								autoFocus
							/>
						</label>
						<label className="share-dialog-label">
							<span>Expires (optional)</span>
							<input
								type="datetime-local"
								value={expiresAt}
								onChange={(e) => setExpiresAt(e.target.value)}
							/>
						</label>
						{errorMsg && <p className="share-dialog-error">{errorMsg}</p>}
						<div className="share-dialog-buttons">
							<button type="button" onClick={onClose}>
								Cancel
							</button>
							<button type="button" onClick={onLookup}>
								Next
							</button>
						</div>
					</>
				)}

				{step === "confirm" && recipient && (
					<>
						<p>
							You are about to share this note with{" "}
							<strong>{recipient.username}</strong> ({recipientEmail}).
						</p>
						{expiresAt && (
							<p>
								This share will expire on{" "}
								<strong>{new Date(expiresAt).toLocaleString()}</strong>.
							</p>
						)}
						{errorMsg && <p className="share-dialog-error">{errorMsg}</p>}
						<div className="share-dialog-buttons">
							<button type="button" onClick={() => setStep("input")}>
								Back
							</button>
							<button type="button" onClick={onConfirmSend}>
								Send
							</button>
						</div>
					</>
				)}

				{step === "sending" && <p>Encrypting and sending…</p>}

				{step === "done" && (
					<>
						<p>Share created. The recipient has been emailed a link.</p>
						{successLink && (
							<p>
								Link:{" "}
								<a href={successLink} target="_blank" rel="noreferrer">
									{successLink}
								</a>
							</p>
						)}
						<div className="share-dialog-buttons">
							<button type="button" onClick={onClose}>
								Close
							</button>
						</div>
					</>
				)}
			</div>
		</div>
	);
}
