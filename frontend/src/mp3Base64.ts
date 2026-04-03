
/** Input must be the same base64 string stored in DecryptedNote.note_text for note_type 'audio'. */
export function base64ToMp3Blob(noteTextBase64: string): Blob {
	const binary = atob(noteTextBase64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return new Blob([bytes], { type: 'audio/mpeg' });
}

export function base64ToMp3File(noteTextBase64: string, filename: string): File {
	return new File([base64ToMp3Blob(noteTextBase64)], filename, { type: 'audio/mpeg' });
}
