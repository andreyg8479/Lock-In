/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Settings, { THEME_SELECT_ID, HIDEBIND_KEY_INPUT_ID } from "./Settings";

function renderSettings() {
	return render(
		<MemoryRouter>
			<Settings />
		</MemoryRouter>,
	);
}

describe("Settings theme", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("updates the selected theme when the theme control is changed", () => {
		renderSettings();
		const select = screen.getByRole("combobox") as HTMLSelectElement;
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
