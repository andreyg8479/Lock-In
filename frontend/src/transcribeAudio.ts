import { env, pipeline } from "@huggingface/transformers";
import type { AutomaticSpeechRecognitionPipeline } from "@huggingface/transformers";

/** Smallest Whisper variant in Transformers.js (English); first run downloads ~75MB to browser cache. */
export const WHISPER_TINY_EN = "Xenova/whisper-tiny.en";

export type TranscribeProgress = (message: string) => void;

let transcriberPromise: Promise<AutomaticSpeechRecognitionPipeline> | null = null;

function getTranscriber(onProgress?: TranscribeProgress) {
	if (!transcriberPromise) {
		env.useBrowserCache = true;
		transcriberPromise = pipeline(
			"automatic-speech-recognition",
			WHISPER_TINY_EN,
			{
				progress_callback: (e: { status?: string; file?: string }) => {
					if (e?.status === "progress" && e.file) {
						onProgress?.(`Loading model: ${e.file}`);
					} else if (e?.status) {
						onProgress?.(e.status);
					}
				},
			},
		) as Promise<AutomaticSpeechRecognitionPipeline>;
	}
	return transcriberPromise;
}

/**
 * Transcribes an MP3 (or other format the browser can decode) using Whisper tiny EN.
 * Heavy: loads ONNX + model on first call; reuses the pipeline afterward.
 */
export async function transcribeAudioFile(
	file: File,
	onProgress?: TranscribeProgress,
): Promise<string> {
	const transcriber = await getTranscriber(onProgress);
	onProgress?.("Transcribing…");
	const url = URL.createObjectURL(file);
	try {
		const raw = await transcriber(url, {
			chunk_length_s: 30,
			stride_length_s: 5,
		});
		const out = Array.isArray(raw) ? raw[0] : raw;
		return (out?.text ?? "").trim();
	} finally {
		URL.revokeObjectURL(url);
	}
}

/** For tests: clear cached pipeline. */
export function __resetTranscriberForTests(): void {
	transcriberPromise = null;
}
