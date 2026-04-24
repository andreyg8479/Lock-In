/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "./AuthContext";
import Home from "./Home";

function renderHome() {
	return render(
		<AuthProvider>
			<MemoryRouter>
				<Home />
			</MemoryRouter>
		</AuthProvider>,
	);
}

afterEach(() => {
	cleanup();
});

describe("Home page content", () => {
	it("shows basic usage actions and security information", () => {
		renderHome();

		expect(screen.getByText("Go To Note List")).toBeTruthy();
		expect(screen.getByText("Make New Note")).toBeTruthy();
		expect(screen.getByText("Vault Settings")).toBeTruthy();
		expect(screen.getByText("Military Grade Encryption Active")).toBeTruthy();
		expect(screen.getByText("Zero-Knowledge")).toBeTruthy();
	});
});
