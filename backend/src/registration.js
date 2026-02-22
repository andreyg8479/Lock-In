function createRegistrationStore() {
  return new Map(); // username to user object
}

function handleRegister(store, usernameRaw, passwordRaw) {
  const username = String(usernameRaw ?? "").trim();
  const password = String(passwordRaw ?? "");

  if (!username) return { ok: false, error: "Username required" };
  if (password.length < 8) return { ok: false, error: "Password must be at least 8 characters" };
  if (store.has(username)) return { ok: false, error: "Username already exists" };

  const userId = `u_${Date.now()}`;
  store.set(username, { userId, username, password }); // currently plaintext for show
  return { ok: true, userId };
}

module.exports = { createRegistrationStore, handleRegister };