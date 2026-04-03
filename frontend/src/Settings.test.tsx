/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Settings, { THEME_SELECT_ID } from "./Settings";

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
