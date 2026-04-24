import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { getAllNoteNames, getShare, uploadNote } from "./api";
import { getAllNotesClient } from "./client_storage";
import { decryptFilenames, openShareBundle, encryptNote } from "./crypto/lockinCrypto";
import type { DecryptedNote } from "../../shared_types/note_types";
import "./SharedNoteView.css";

type DecryptedShare = {
	note_title: string;
	note_text: string;
	note_transcript?: string;
	note_type: "text" | "audio" | "image" | "video";
};

type ShareMeta = {
	id: string;
	sender_username: string;
	created_at: string;
	expires_at: string | null;
	viewerIsOwner: boolean;
};

/** Read-only viewer for a note that was shared with the signed-in user.
 *  Unauthenticated users are bounced to /Login?returnTo=/shared/:id. */
export default function SharedNoteView() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { token, userId, vaultKey, rsaPrivateKey } = useAuth();

	const [loading, setLoading] = useState(true);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);
	const [decrypted, setDecrypted] = useState<DecryptedShare | null>(null);
	const [meta, setMeta] = useState<ShareMeta | null>(null);
	const [importing, setImporting] = useState(false);

	const getExistingNoteNameSet = async (): Promise<Set<string>> => {
		if (!userId || !vaultKey) return new Set();
		const encryptedNames: string[] = [];

		try {
			const serverResponse = await getAllNoteNames({ userID: userId });
			if (Array.isArray(serverResponse?.notes)) {
				for (const note of serverResponse.notes) {
					if (typeof note?.note_title === "string") {
						encryptedNames.push(note.note_title);
					}
				}
			}
		} catch (e) {
			console.warn("Failed to check server note names before import:", e);
		}

		try {
			const clientNotes = await getAllNotesClient();
			for (const note of clientNotes) {
				if (note.user_id === userId && typeof note.note_title === "string") {
					encryptedNames.push(note.note_title);
				}
			}
		} catch (e) {
			console.warn("Failed to check client note names before import:", e);
		}

		if (encryptedNames.length === 0) return new Set();
		const decryptedNames = await decryptFilenames(encryptedNames, vaultKey);
		return new Set(decryptedNames.map((name) => name.trim().toLowerCase()).filter(Boolean));
	};

	useEffect(() => {
		if (!id) return;
		if (!token) {
			// Not logged in — round-trip through /Login
			navigate(`/Login?returnTo=${encodeURIComponent(`/shared/${id}`)}`);
			return;
		}
		if (!rsaPrivateKey) {
			setErrorMsg(
				"Your encryption keys aren't loaded yet. Please log out and log in again."
			);
			setLoading(false);
			return;
		}

		(async () => {
			try {
				const detail = await getShare(id, token);
				const plain = await openShareBundle(detail.share, rsaPrivateKey);
				setDecrypted(plain);
				setMeta({
					id: detail.share.id,
					sender_username: detail.sender?.username ?? "Unknown sender",
					created_at: detail.share.created_at,
					expires_at: detail.share.expires_at,
					viewerIsOwner: detail.viewerIsOwner,
				});
			} catch (e: any) {
				const msg = String(e?.message || e);
				if (msg.includes("410") || msg.includes("expired")) {
					setErrorMsg("This shared note has expired.");
				} else if (msg.includes("403") || msg.includes("Forbidden")) {
					setErrorMsg("You don't have access to this shared note.");
				} else if (msg.includes("404")) {
					setErrorMsg("This shared note no longer exists.");
				} else {
					setErrorMsg(msg || "Failed to load shared note.");
				}
			} finally {
				setLoading(false);
			}
		})();
	}, [id, token, rsaPrivateKey, navigate]);

	const importToVault = async () => {
		if (!decrypted || !userId || !vaultKey) return;
		setImporting(true);
		try {
			const defaultTitle = `[Shared] ${decrypted.note_title}`;
			let finalTitle = defaultTitle;
			const existingNames = await getExistingNoteNameSet();

			if (existingNames.has(defaultTitle.trim().toLowerCase())) {
				while (true) {
					const renamed = prompt(
						`A note named "${defaultTitle}" already exists.\nEnter a new name for this imported note:`,
						finalTitle
					);
					if (renamed === null) return;
					const candidate = renamed.trim();
					if (!candidate) {
						alert("Note name cannot be empty.");
						continue;
					}
					if (existingNames.has(candidate.toLowerCase())) {
						alert("That note name already exists. Please choose another.");
						continue;
					}
					finalTitle = candidate;
					break;
				}
			}

			const now = new Date().toISOString();
			const note: DecryptedNote = {
				user_id: userId,
				id: "",
				note_title: finalTitle,
				note_text: decrypted.note_text,
				iv_b64: "",
				pinned: false,
				note_type: decrypted.note_type,
				updated_at: now,
				created_at: now,
				second_password: null,
				...(decrypted.note_transcript ? { note_transcript: decrypted.note_transcript } : {}),
			};
			const encrypted = await encryptNote(note, vaultKey);
			await uploadNote(encrypted);
			alert("Saved a copy to your vault.");
			navigate("/NoteList");
		} catch (e: any) {
			alert(`Failed to import: ${e?.message || e}`);
		} finally {
			setImporting(false);
		}
	};

	if (loading) return <div className="shared-note-view"><p>Loading…</p></div>;
	if (errorMsg) {
		return (
			<div className="shared-note-view">
				<p className="shared-note-error">{errorMsg}</p>
				<button type="button" onClick={() => navigate("/main")}>
					Back
				</button>
			</div>
		);
	}
	if (!decrypted || !meta) return null;

	return (
		<div className="shared-note-view">
			<div className="shared-note-meta">
				<h2>{decrypted.note_title}</h2>
				<p>
					Shared by <strong>{meta.sender_username}</strong> on{" "}
					{new Date(meta.created_at).toLocaleString()}
				</p>
				{meta.expires_at && (
					<p>Expires: {new Date(meta.expires_at).toLocaleString()}</p>
				)}
			</div>

			<div className="shared-note-body">
				{decrypted.note_type === "text" && (
					<pre className="shared-note-text">{decrypted.note_text}</pre>
				)}
				{decrypted.note_type === "image" && (
					<img
						alt={decrypted.note_title}
						src={`data:image/*;base64,${decrypted.note_text}`}
						className="shared-note-image"
					/>
				)}
				{decrypted.note_type === "audio" && (
					<>
						<audio
							controls
							src={`data:audio/mpeg;base64,${decrypted.note_text}`}
						/>
						{decrypted.note_transcript && (
							<pre className="shared-note-text">{decrypted.note_transcript}</pre>
						)}
					</>
				)}
				{decrypted.note_type === "video" && (
					<video
						controls
						className="shared-note-video"
						src={`data:video/mp4;base64,${decrypted.note_text}`}
					/>
				)}
			</div>

			<div className="shared-note-actions">
				{!meta.viewerIsOwner && (
					<button type="button" onClick={importToVault} disabled={importing}>
						{importing ? "Importing…" : "Import to my vault"}
					</button>
				)}
				<button type="button" onClick={() => navigate("/main")}>Close</button>
			</div>
		</div>
	);
}
