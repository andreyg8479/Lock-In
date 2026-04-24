/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from "vitest";
import { getReminderTime, setReminderTime } from "./SettingsMem";

describe("SettingsMem reminder interval", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("stores and returns the reminder interval value", () => {
		expect(getReminderTime()).toBe(0);

		setReminderTime(30);
		expect(getReminderTime()).toBe(30);
	});
});
