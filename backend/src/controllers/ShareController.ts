import { Request, Response } from "express";
import { supabase } from "../supabaseClient";
import { sendNoteSharedEmail } from "../email/emailService";

/**
 * GET /api/users/lookup?email=...
 *
 * Authenticated-only. Used by the sender UI to resolve a recipient email
 * into a user id + public key before constructing a share.
 *
 * The endpoint reveals whether an email is registered — acceptable since it
 * only works for signed-in users, and it gives a much better UX than a
 * silent success (the sender finds out immediately if they mistyped).
 */
export async function lookupUserByEmail(req: Request, res: Response) {
    try {
        const rawEmail = (req.query.email as string | undefined) ?? "";
        const email = rawEmail.trim().toLowerCase();
        if (!email) return res.status(400).json({ error: "email is required" });

        const { data: rows, error } = await supabase
            .from("users")
            .select(
                "id, username, email, public_key, asymmetric_key_algorithm, asymmetric_key_length, asymmetric_hash"
            )
            .eq("email", email);

        if (error) return res.status(500).json({ error: error.message });
        if (!rows || rows.length === 0) return res.status(404).json({ notFound: true });

        const user = rows[0];
        if (!user.public_key) {
            // Recipient exists but hasn't logged in since the sharing rollout
            // and therefore hasn't backfilled their RSA key.
            return res.status(409).json({
                notReady: true,
                username: user.username,
            });
        }

        return res.status(200).json({
            id: user.id,
            username: user.username,
            publicKeySpkiB64: user.public_key,
            asymmetricKeyAlgorithm: user.asymmetric_key_algorithm || "RSA-OAEP",
            asymmetricKeyLength: user.asymmetric_key_length || 2048,
            asymmetricHash: user.asymmetric_hash || "SHA-256",
        });
    } catch (e) {
        console.error("lookupUserByEmail error:", e);
        return res.status(500).json({ error: "Internal server error" });
    }
}

/**
 * POST /api/share
 *
 * Body: {
 *   recipientId: string,
 *   sourceNoteId?: string,            // informational only
 *   noteType: 'text'|'audio'|'image'|'video',
 *   note_title: string,               // ciphertext base64 (packed iv+ct, per existing convention)
 *   note_text: string,                // ciphertext base64
 *   iv_text_b64: string,              // IV for note_text
 *   encrypted_share_key_b64: string,  // per-share AES key RSA-OAEP-encrypted to recipient pubkey
 *   expiresAt?: string                // ISO timestamp
 * }
 */
export async function createShare(req: Request, res: Response) {
    try {
        const ownerId = req.user?.userId;
        if (!ownerId) return res.status(401).json({ error: "Unauthorized" });

        const {
            recipientId,
            sourceNoteId,
            noteType,
            note_title,
            note_text,
            iv_text_b64,
            encrypted_share_key_b64,
            expiresAt,
        } = req.body ?? {};

        if (
            !recipientId ||
            !noteType ||
            !note_title ||
            !note_text ||
            !iv_text_b64 ||
            !encrypted_share_key_b64
        ) {
            return res.status(400).json({ error: "Missing required share fields" });
        }
        if (!["text", "audio", "image", "video"].includes(noteType)) {
            return res.status(400).json({ error: "Invalid noteType" });
        }
        if (recipientId === ownerId) {
            return res.status(400).json({ error: "Cannot share a note with yourself" });
        }

        // Verify recipient exists and grab their email for the notification
        const { data: recipientRows, error: recipientErr } = await supabase
            .from("users")
            .select("id, email, username")
            .eq("id", recipientId);
        if (recipientErr) return res.status(500).json({ error: recipientErr.message });
        if (!recipientRows || recipientRows.length === 0) {
            return res.status(404).json({ error: "Recipient not found" });
        }
        const recipient = recipientRows[0];

        // Sender username for the email subject
        const { data: senderRows } = await supabase
            .from("users")
            .select("username")
            .eq("id", ownerId);
        const senderUsername = senderRows?.[0]?.username ?? "A LockIn user";

        const insert: Record<string, any> = {
            owner_id: ownerId,
            recipient_id: recipientId,
            source_note_id: sourceNoteId || null,
            note_title,
            note_text,
            iv_text_b64,
            note_type: noteType,
            encrypted_share_key_b64,
            expires_at: expiresAt || null,
        };

        const { data: inserted, error: insertErr } = await supabase
            .from("shared_notes")
            .insert([insert])
            .select("id, created_at")
            .single();

        if (insertErr) return res.status(500).json({ error: insertErr.message });

        // Best-effort notification — do not fail the share if email bounces.
        void sendNoteSharedEmail({
            recipientEmail: recipient.email,
            senderUsername,
            shareId: inserted!.id as string,
            expiresAt: expiresAt || undefined,
        }).catch((e) => console.error("sendNoteSharedEmail failed:", e));

        return res.status(201).json({ ok: true, shareId: inserted!.id });
    } catch (e) {
        console.error("createShare error:", e);
        return res.status(500).json({ error: "Internal server error" });
    }
}

function isExpired(row: { expires_at: string | null }): boolean {
    if (!row.expires_at) return false;
    const t = Date.parse(row.expires_at);
    return Number.isFinite(t) && t <= Date.now();
}

/**
 * GET /api/share/:id — fetch a single share. Only the owner or recipient
 * may read it. Expired shares return 410 for recipients; the owner can
 * always still see and delete their own expired shares.
 */
export async function getShare(req: Request, res: Response) {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const shareId = req.params.id;
        if (!shareId) return res.status(400).json({ error: "Missing share id" });

        const { data: rows, error } = await supabase
            .from("shared_notes")
            .select(
                "id, owner_id, recipient_id, source_note_id, note_title, note_text, iv_text_b64, note_type, encrypted_share_key_b64, expires_at, created_at"
            )
            .eq("id", shareId);

        if (error) return res.status(500).json({ error: error.message });
        if (!rows || rows.length === 0) return res.status(404).json({ error: "Share not found" });

        const row = rows[0];
        const isOwner = row.owner_id === userId;
        const isRecipient = row.recipient_id === userId;
        if (!isOwner && !isRecipient) return res.status(403).json({ error: "Forbidden" });

        if (!isOwner && isExpired(row)) {
            return res.status(410).json({ error: "Share has expired" });
        }

        // Look up the sender's username for recipient display
        const { data: senderRows } = await supabase
            .from("users")
            .select("username, email")
            .eq("id", row.owner_id);

        return res.status(200).json({
            share: row,
            sender: senderRows?.[0] ?? null,
            viewerIsOwner: isOwner,
        });
    } catch (e) {
        console.error("getShare error:", e);
        return res.status(500).json({ error: "Internal server error" });
    }
}

/**
 * GET /api/share/incoming — list shares addressed to the caller. Expired
 * shares are filtered out.
 */
export async function listIncomingShares(req: Request, res: Response) {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const { data: rows, error } = await supabase
            .from("shared_notes")
            .select(
                "id, owner_id, note_type, expires_at, created_at"
            )
            .eq("recipient_id", userId)
            .order("created_at", { ascending: false });

        if (error) return res.status(500).json({ error: error.message });

        const live = (rows || []).filter((r) => !isExpired(r));

        // Fetch sender usernames in a single query
        const ownerIds = Array.from(new Set(live.map((r) => r.owner_id)));
        let senderMap: Record<string, string> = {};
        if (ownerIds.length > 0) {
            const { data: senders } = await supabase
                .from("users")
                .select("id, username")
                .in("id", ownerIds);
            for (const s of senders || []) senderMap[s.id] = s.username;
        }

        return res.status(200).json({
            shares: live.map((r) => ({
                id: r.id,
                note_type: r.note_type,
                expires_at: r.expires_at,
                created_at: r.created_at,
                sender_username: senderMap[r.owner_id] || "Unknown",
            })),
        });
    } catch (e) {
        console.error("listIncomingShares error:", e);
        return res.status(500).json({ error: "Internal server error" });
    }
}

/**
 * GET /api/share/outgoing — list shares created by the caller.
 */
export async function listOutgoingShares(req: Request, res: Response) {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const { data: rows, error } = await supabase
            .from("shared_notes")
            .select("id, recipient_id, note_type, expires_at, created_at, source_note_id")
            .eq("owner_id", userId)
            .order("created_at", { ascending: false });
        if (error) return res.status(500).json({ error: error.message });

        const recipientIds = Array.from(new Set((rows || []).map((r) => r.recipient_id)));
        let recipientMap: Record<string, { username: string; email: string }> = {};
        if (recipientIds.length > 0) {
            const { data: recipients } = await supabase
                .from("users")
                .select("id, username, email")
                .in("id", recipientIds);
            for (const r of recipients || [])
                recipientMap[r.id] = { username: r.username, email: r.email };
        }

        return res.status(200).json({
            shares: (rows || []).map((r) => ({
                id: r.id,
                note_type: r.note_type,
                expires_at: r.expires_at,
                created_at: r.created_at,
                source_note_id: r.source_note_id,
                recipient_username: recipientMap[r.recipient_id]?.username || "Unknown",
                recipient_email: recipientMap[r.recipient_id]?.email || "",
            })),
        });
    } catch (e) {
        console.error("listOutgoingShares error:", e);
        return res.status(500).json({ error: "Internal server error" });
    }
}

/**
 * DELETE /api/share/:id — owner-only revocation. Recipients cannot delete
 * shares (they just lose interest — they can simply stop viewing).
 */
export async function deleteShare(req: Request, res: Response) {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const shareId = req.params.id;
        if (!shareId) return res.status(400).json({ error: "Missing share id" });

        const { data: rows, error: fetchErr } = await supabase
            .from("shared_notes")
            .select("owner_id")
            .eq("id", shareId);
        if (fetchErr) return res.status(500).json({ error: fetchErr.message });
        if (!rows || rows.length === 0) return res.status(404).json({ error: "Share not found" });
        if (rows[0].owner_id !== userId) return res.status(403).json({ error: "Forbidden" });

        const { error: delErr } = await supabase
            .from("shared_notes")
            .delete()
            .eq("id", shareId);
        if (delErr) return res.status(500).json({ error: delErr.message });

        return res.status(200).json({ ok: true });
    } catch (e) {
        console.error("deleteShare error:", e);
        return res.status(500).json({ error: "Internal server error" });
    }
}
