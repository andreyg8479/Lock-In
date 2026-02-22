const { createRegistrationStore, handleRegister } = require("../src/registration");

test("rejects empty username", () => {
  const store = createRegistrationStore();
  const r = handleRegister(store, "", "password123");
  expect(r.ok).toBe(false);
  expect(r.error).toMatch(/Username required/);
});

test("rejects short password", () => {
  const store = createRegistrationStore();
  const r = handleRegister(store, "yousef", "short");
  expect(r.ok).toBe(false);
  expect(r.error).toMatch(/at least 8/);
});

test("creates user and rejects duplicates", () => {
  const store = createRegistrationStore();

  const r1 = handleRegister(store, "yousef", "password123");
  expect(r1.ok).toBe(true);
  expect(r1.userId).toBeTruthy();

  const r2 = handleRegister(store, "yousef", "password123");
  expect(r2.ok).toBe(false);
  expect(r2.error).toMatch(/already exists/);
});