import { describe, it, expect } from "vitest";
import { generatePassword } from "./generatePassword";

const ALLOWED =
	"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789~!@#$%^&*?-_+=";
const allowedSet = new Set(ALLOWED.split(""));

describe("generatePassword", () => {
	it("produces 100 passwords with length 16, allowed charset, and unique characters", () => {
		for (let i = 0; i < 100; i++) {
			const p = generatePassword();
			expect(p.length).toBe(16);
			expect(new Set(p).size).toBe(16);
			for (const ch of p) {
				expect(allowedSet.has(ch)).toBe(true);
			}
		}
	});
});
