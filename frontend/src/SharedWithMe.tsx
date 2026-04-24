import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import {
	listIncomingShares,
	listOutgoingShares,
	deleteShare,
	type IncomingShareSummary,
	type OutgoingShareSummary,
} from "./api";

/** Combined inbox/outbox for shares — incoming notes at the top, outgoing
 *  with revoke buttons below. */
export default function SharedWithMe() {
	const { token } = useAuth();
	const navigate = useNavigate();
	const [incoming, setIncoming] = useState<IncomingShareSummary[]>([]);
	const [outgoing, setOutgoing] = useState<OutgoingShareSummary[]>([]);
	const [loading, setLoading] = useState(true);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	const refresh = async () => {
		if (!token) return;
		setLoading(true);
		try {
			const [incResp, outResp] = await Promise.all([
				listIncomingShares(token),
				listOutgoingShares(token),
			]);
			setIncoming(incResp.shares);
			setOutgoing(outResp.shares);
		} catch (e: any) {
			setErrorMsg(e?.message || "Failed to load shares");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (!token) {
			navigate("/Login?returnTo=%2FSharedWithMe");
			return;
		}
		void refresh();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [token]);

	const onRevoke = async (shareId: string) => {
		if (!token) return;
		if (!confirm("Revoke this share? The recipient will immediately lose access.")) return;
		try {
			await deleteShare(shareId, token);
			setOutgoing((prev) => prev.filter((s) => s.id !== shareId));
		} catch (e: any) {
			alert(`Failed to revoke: ${e?.message || e}`);
		}
	};

	if (loading) return <div style={{ padding: "2rem" }}>Loading…</div>;
	if (errorMsg) return <div style={{ padding: "2rem", color: "#c0392b" }}>{errorMsg}</div>;

	return (
		<div style={{ maxWidth: 900, margin: "2rem auto", padding: "1rem" }}>
			<h2>Shared with me</h2>
			{incoming.length === 0 ? (
				<p>No notes have been shared with you.</p>
			) : (
				<ul>
					{incoming.map((s) => (
						<li key={s.id} style={{ margin: "0.5rem 0" }}>
							<Link to={`/shared/${s.id}`}>
								{s.sender_username} · {s.note_type} ·{" "}
								{new Date(s.created_at).toLocaleString()}
							</Link>
							{s.expires_at && (
								<span style={{ color: "#888", marginLeft: 8 }}>
									(expires {new Date(s.expires_at).toLocaleString()})
								</span>
							)}
						</li>
					))}
				</ul>
			)}

			<h2 style={{ marginTop: "2rem" }}>Shared by me</h2>
			{outgoing.length === 0 ? (
				<p>You haven't shared any notes.</p>
			) : (
				<ul>
					{outgoing.map((s) => (
						<li key={s.id} style={{ margin: "0.5rem 0" }}>
							To <strong>{s.recipient_username}</strong> ({s.recipient_email}) ·{" "}
							{s.note_type} · {new Date(s.created_at).toLocaleString()}
							{s.expires_at && (
								<span style={{ color: "#888", marginLeft: 8 }}>
									(expires {new Date(s.expires_at).toLocaleString()})
								</span>
							)}
							<button
								type="button"
								onClick={() => onRevoke(s.id)}
								style={{ marginLeft: 8 }}
							>
								Revoke
							</button>
						</li>
					))}
				</ul>
			)}

			<div style={{ marginTop: "1.5rem" }}>
				<button type="button" onClick={() => navigate("/main")}>
					Back
				</button>
			</div>
		</div>
	);
}
