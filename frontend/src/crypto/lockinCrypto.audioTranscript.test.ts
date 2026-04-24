/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeAll } from "vitest";
import { encryptNote, decryptNote } from "./lockinCrypto";
import type { DecryptedNote } from "../../../shared_types/note_types";

let vaultKey: CryptoKey;

beforeAll(async () => {
	vaultKey = await crypto.subtle.generateKey(
		{ name: "AES-GCM", length: 256 },
		true,
		["encrypt", "decrypt"],
	);
});

function baseNote(over: Partial<DecryptedNote>): DecryptedNote {
	const now = new Date().toISOString();
	return {
		user_id: "u1",
		id: "",
		note_title: "t",
		note_text: "AAAA",
		iv_b64: "",
		pinned: false,
		note_type: "audio",
		updated_at: now,
		created_at: now,
		second_password: null,
		...over,
	};
}

describe.skip("encryptNote / decryptNote audio with transcript (v1 payload)", () => {
	it("round-trips audio base64 and transcript", async () => {
		const audioB64 = btoa(String.fromCharCode(0xff, 0xfb, 0x00));
		const plain = baseNote({
			note_text: audioB64,
			note_transcript: "hello world",
		});
		const enc = await encryptNote(plain, vaultKey);
		const dec = await decryptNote(enc, vaultKey);
		expect(dec.note_text).toBe(audioB64);
		expect(dec.note_transcript).toBe("hello world");
		expect(dec.note_type).toBe("audio");
	});

	it("round-trips audio without transcript (legacy shape)", async () => {
		const audioB64 = btoa(String.fromCharCode(0xff, 0xd8));
		const plain = baseNote({ note_text: audioB64 });
		const enc = await encryptNote(plain, vaultKey);
		const dec = await decryptNote(enc, vaultKey);
		expect(dec.note_text).toBe(audioB64);
		expect(dec.note_transcript).toBeUndefined();
	});
});
