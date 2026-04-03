import { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { supabase } from "../supabaseClient";
import {
  encryptBinaryBytes,
  fromBase64,
  getOptionalImageEncryptionKeyBytes,
} from "../crypto/vaultImageCrypto";

const BUCKET = "image_note";
const SIGNED_URL_TTL_SEC = 3600;

async function uploadEncryptedBytesToPath(
  imagePath: string,
  buffer: Buffer
): Promise<{ error: string | null }> {
  const { error } = await supabase.storage.from(BUCKET).upload(imagePath, buffer, {
    contentType: "application/octet-stream",
    upsert: true,
  });
  return { error: error?.message ?? null };
}

async function removeStorageObject(imagePath: string): Promise<void> {
  await supabase.storage.from(BUCKET).remove([imagePath]);
}

/** Resolve ciphertext + iv from body: vault-encrypted payload or optional server-side encrypt of plaintext. */
async function resolveImagePayload(req: Request): Promise<
  | { ok: true; imageBytes: Buffer; ivB64: string }
  | { ok: false; status: number; error: string }
> {
  const body = req.body ?? {};
  const serverKey = getOptionalImageEncryptionKeyBytes();

  if (typeof body.image_plain_b64 === "string" && body.image_plain_b64.length > 0) {
    if (!serverKey) {
      return {
        ok: false,
        status: 400,
        error: "image_plain_b64 requires IMAGE_ENCRYPTION_MASTER_KEY (32-byte key, base64) to be set",
      };
    }
    try {
      const plain = fromBase64(body.image_plain_b64);
      const { ivB64, ciphertextB64 } = await encryptBinaryBytes(plain, serverKey);
      const imageBytes = Buffer.from(fromBase64(ciphertextB64));
      return { ok: true, imageBytes, ivB64 };
    } catch (e) {
      return { ok: false, status: 400, error: `Encryption failed: ${String(e)}` };
    }
  }

  if (typeof body.image_ciphertext_b64 === "string" && body.image_ciphertext_b64.length > 0) {
    if (typeof body.iv_b64 !== "string" || !body.iv_b64.length) {
      return { ok: false, status: 400, error: "iv_b64 is required with image_ciphertext_b64" };
    }
    try {
      const imageBytes = Buffer.from(fromBase64(body.image_ciphertext_b64));
      return { ok: true, imageBytes, ivB64: body.iv_b64 };
    } catch (e) {
      return { ok: false, status: 400, error: `Invalid base64: ${String(e)}` };
    }
  }

  return {
    ok: false,
    status: 400,
    error: "Provide image_ciphertext_b64 and iv_b64 (vault-encrypted), or image_plain_b64 with IMAGE_ENCRYPTION_MASTER_KEY set",
  };
}

export async function getAllImageNoteNames(req: Request, res: Response) {
  const { userID } = req.body;
  if (!userID) {
    return res.status(400).json({ error: "User ID is required" });
  }

  const { data: notes, error } = await supabase
    .from("image_notes")
    .select("id, user_id, note_title, iv_b64, pinned, note_type, created_at, updated_at, image_path")
    .eq("user_id", userID)
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  if (!notes) {
    return res.status(404).json({ error: "No image notes found" });
  }

  return res.status(200).json({ notes });
}

export async function getImageNote(req: Request, res: Response) {
  const { noteId, userID } = req.body;
  if (!noteId || !userID) {
    return res.status(400).json({ error: "Both noteId and userID are required" });
  }

  const { data: rows, error } = await supabase
    .from("image_notes")
    .select("*")
    .eq("id", noteId)
    .eq("user_id", userID)
    .order("updated_at", { ascending: false });

  if (error) {
    return res.status(400).json({ error: error.message });
  }
  if (!rows || rows.length === 0) {
    return res.status(404).json({ error: "Image note not found" });
  }

  const row = rows[0] as { image_path: string };
  const { data: signed, error: signErr } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(row.image_path, SIGNED_URL_TTL_SEC);

  if (signErr) {
    return res.status(400).json({ error: signErr.message });
  }

  return res.status(200).json({
    note: rows,
    signedUrl: signed?.signedUrl ?? null,
    signedUrlExpiresIn: SIGNED_URL_TTL_SEC,
  });
}

export async function uploadImageNote(req: Request, res: Response) {
  const payload = await resolveImagePayload(req);
  if (!payload.ok) {
    return res.status(payload.status).json({ error: payload.error });
  }

  const { user_id } = req.body;
  if (!user_id) {
    return res.status(400).json({ error: "user_id is required" });
  }
  if (typeof req.body.note_title !== "string") {
    return res.status(400).json({ error: "note_title is required" });
  }

  const noteId = randomUUID();
  const imagePath = `${user_id}/${noteId}`;

  const { error: upErr } = await uploadEncryptedBytesToPath(imagePath, payload.imageBytes);
  if (upErr) {
    return res.status(400).json({ error: upErr });
  }

  const ivToStore = payload.ivB64;
  const { data, error } = await supabase
    .from("image_notes")
    .insert([
      {
        id: noteId,
        note_title: req.body.note_title,
        image_path: imagePath,
        iv_b64: ivToStore,
        pinned: Boolean(req.body.pinned),
        note_type: req.body.note_type ?? "image",
        user_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
    .select("id")
    .single();

  if (error) {
    await removeStorageObject(imagePath);
    const code = (error as { code?: string }).code;
    if (code === "23505") {
      return res.status(200).json({ ok: true, duplicated: true });
    }
    return res.status(400).json({ error: error.message });
  }

  return res.status(201).json({ ok: true, id: data.id });
}

export async function updateImageNote(req: Request, res: Response) {
  const { id, user_id } = req.body;
  if (!id || !user_id) {
    return res.status(400).json({ error: "id and user_id are required" });
  }

  const { data: existing, error: fetchErr } = await supabase
    .from("image_notes")
    .select("image_path")
    .eq("id", id)
    .eq("user_id", user_id)
    .maybeSingle();

  if (fetchErr) {
    return res.status(400).json({ error: fetchErr.message });
  }
  if (!existing) {
    return res.status(404).json({ error: "Image note not found" });
  }

  const imagePath = (existing as { image_path: string }).image_path;
  let nextIv: string | undefined;

  if (
    req.body.image_ciphertext_b64 !== undefined ||
    req.body.image_plain_b64 !== undefined
  ) {
    const payload = await resolveImagePayload(req);
    if (!payload.ok) {
      return res.status(payload.status).json({ error: payload.error });
    }
    const { error: upErr } = await uploadEncryptedBytesToPath(imagePath, payload.imageBytes);
    if (upErr) {
      return res.status(400).json({ error: upErr });
    }
    nextIv = payload.ivB64;
  }

  const updateRow: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (typeof req.body.note_title === "string") updateRow.note_title = req.body.note_title;
  if (nextIv !== undefined) updateRow.iv_b64 = nextIv;
  if (typeof req.body.pinned === "boolean") updateRow.pinned = req.body.pinned;
  if (typeof req.body.note_type === "string") updateRow.note_type = req.body.note_type;

  const { error } = await supabase.from("image_notes").update(updateRow).eq("id", id).eq("user_id", user_id);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(200).json({ ok: true });
}

export async function deleteImageNote(req: Request, res: Response) {
  const { id, user_id } = req.body;
  if (!id || !user_id) {
    return res.status(400).json({ error: "id and user_id are required" });
  }

  const { data: row, error: fetchErr } = await supabase
    .from("image_notes")
    .select("image_path")
    .eq("id", id)
    .eq("user_id", user_id)
    .maybeSingle();

  if (fetchErr) {
    return res.status(400).json({ error: fetchErr.message });
  }
  if (!row) {
    return res.status(404).json({ error: "Image note not found" });
  }

  const imagePath = (row as { image_path: string }).image_path;
  await removeStorageObject(imagePath);

  const { error } = await supabase.from("image_notes").delete().eq("id", id).eq("user_id", user_id);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(200).json({ ok: true });
}
