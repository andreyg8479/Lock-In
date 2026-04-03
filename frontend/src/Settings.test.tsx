/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { cleanup, render, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Settings, {
	HIDEBIND_KEY_INPUT_ID,
	PREF_TEXT_SIZE_INPUT_ID,
	THEME_SELECT_ID,
} from "./Settings";

function renderSettings() {
	return render(
		<MemoryRouter>
			<Settings />
		</MemoryRouter>,
	);
}

afterEach(() => {
	cleanup();
});

describe("Settings text size", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("updates the preferred text size when the number input is changed", () => {
		renderSettings();
		const input = document.getElementById(
			PREF_TEXT_SIZE_INPUT_ID,
		) as HTMLInputElement;
		expect(input.id).toBe(PREF_TEXT_SIZE_INPUT_ID);
		expect(input.value).toBe("16");

		fireEvent.change(input, { target: { value: "20" } });
		expect(input.value).toBe("20");
	});
});

describe("Settings theme", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("updates the selected theme when the theme control is changed", () => {
		renderSettings();
		const select = document.getElementById(
			THEME_SELECT_ID,
		) as HTMLSelectElement;
		expect(select.id).toBe(THEME_SELECT_ID);
		expect(select.value).toBe("light");

		fireEvent.change(select, { target: { value: "dark" } });
		expect(select.value).toBe("dark");

		fireEvent.change(select, { target: { value: "light" } });
		expect(select.value).toBe("light");
	});
});

describe("Settings hide keybind", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("updates the key character when the key input is changed", () => {
		renderSettings();
		const keyInput = document.getElementById(
			HIDEBIND_KEY_INPUT_ID,
		) as HTMLInputElement;
		expect(keyInput.value).toBe("M");

		fireEvent.change(keyInput, { target: { value: "z" } });
		expect(keyInput.value).toBe("Z");
	});
});
