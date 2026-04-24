/**
 * @vitest-environment node
 */
import { describe, it, expect } from "vitest";
import {
	generateRsaKeyPair,
	exportPublicKeyB64,
	importPublicKeyB64,
	wrapPrivateKeyWithVaultKey,
	unwrapPrivateKeyWithVaultKey,
	rsaEncryptToPublicKey,
	rsaDecryptWithPrivateKey,
	createShareBundle,
	openShareBundle,
} from "./lockinCrypto";
import type { DecryptedNote } from "../../../shared_types/note_types";

async function makeVaultKey(): Promise<CryptoKey> {
	return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
		"encrypt",
		"decrypt",
	]);
}

function baseNote(over: Partial<DecryptedNote>): DecryptedNote {
	const now = new Date().toISOString();
	return {
		user_id: "u1",
		id: "",
		note_title: "hello",
		note_text: "world",
		iv_b64: "",
		pinned: false,
		note_type: "text",
		updated_at: now,
		created_at: now,
		second_password: null,
		...over,
	};
}

describe("RSA keypair helpers", () => {
	it("round-trips a public key through SPKI base64", async () => {
		const pair = await generateRsaKeyPair();
		const b64 = await exportPublicKeyB64(pair.publicKey);
		const imported = await importPublicKeyB64(b64);
		const ct = await rsaEncryptToPublicKey(new Uint8Array([1, 2, 3, 4, 5]), imported);
		const pt = await rsaDecryptWithPrivateKey(ct, pair.privateKey);
		expect(Array.from(pt)).toEqual([1, 2, 3, 4, 5]);
	});

	it("round-trips a private key through vault-key wrapping", async () => {
		const vaultKey = await makeVaultKey();
		const pair = await generateRsaKeyPair();
		const wrapped = await wrapPrivateKeyWithVaultKey(pair.privateKey, vaultKey);
		const unwrapped = await unwrapPrivateKeyWithVaultKey(
			wrapped.encryptedPrivateKeyB64,
			wrapped.ivB64,
			vaultKey
		);
		// Encrypt to pub, decrypt with the unwrapped private — proves identity.
		const ct = await rsaEncryptToPublicKey(new Uint8Array([9, 8, 7]), pair.publicKey);
		const pt = await rsaDecryptWithPrivateKey(ct, unwrapped);
		expect(Array.from(pt)).toEqual([9, 8, 7]);
	});

	it("rejects unwrap with the wrong vault key", async () => {
		const v1 = await makeVaultKey();
		const v2 = await makeVaultKey();
		const pair = await generateRsaKeyPair();
		const wrapped = await wrapPrivateKeyWithVaultKey(pair.privateKey, v1);
		await expect(
			unwrapPrivateKeyWithVaultKey(wrapped.encryptedPrivateKeyB64, wrapped.ivB64, v2)
		).rejects.toBeDefined();
	});
});

describe("createShareBundle / openShareBundle", () => {
	it("round-trips a text note", async () => {
		const pair = await generateRsaKeyPair();
		const note = baseNote({ note_title: "My plan", note_text: "Hi there!" });
		const bundle = await createShareBundle(note, pair.publicKey);
		const opened = await openShareBundle(bundle, pair.privateKey);
		expect(opened.note_title).toBe("My plan");
		expect(opened.note_text).toBe("Hi there!");
		expect(opened.note_type).toBe("text");
	});

	it("round-trips an audio note with transcript", async () => {
		const pair = await generateRsaKeyPair();
		const audioB64 = btoa(String.fromCharCode(0xff, 0xfb, 0x00));
		const note = baseNote({
			note_type: "audio",
			note_title: "voice memo",
			note_text: audioB64,
			note_transcript: "hello transcript",
		});
		const bundle = await createShareBundle(note, pair.publicKey);
		const opened = await openShareBundle(bundle, pair.privateKey);
		expect(opened.note_type).toBe("audio");
		expect(opened.note_text).toBe(audioB64);
		expect(opened.note_transcript).toBe("hello transcript");
	});

	it("round-trips an image note (raw bytes preserved)", async () => {
		const pair = await generateRsaKeyPair();
		const imgB64 = btoa(String.fromCharCode(137, 80, 78, 71, 13, 10, 26, 10));
		const note = baseNote({
			note_type: "image",
			note_title: "pic",
			note_text: imgB64,
		});
		const bundle = await createShareBundle(note, pair.publicKey);
		const opened = await openShareBundle(bundle, pair.privateKey);
		expect(opened.note_text).toBe(imgB64);
		expect(opened.note_type).toBe("image");
	});

	it("another user's private key cannot open the bundle", async () => {
		const alice = await generateRsaKeyPair();
		const eve = await generateRsaKeyPair();
		const note = baseNote({ note_text: "secret" });
		const bundle = await createShareBundle(note, alice.publicKey);
		await expect(openShareBundle(bundle, eve.privateKey)).rejects.toBeDefined();
	});
});
