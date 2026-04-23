// server.ts
import express from "express"
import path from "path"
import http from "http"
import dotenv from "dotenv"
import { createClient } from "@supabase/supabase-js" 
import cors from "cors"

// For Supabase connection
dotenv.config();
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_KEY;

// Check if environment variables are set
if (!url || !key) {
	throw new Error("SUPABASE_URL and SUPABASE_KEY must be set in environment variables");
}

const supabase = createClient(url, key);

const PORT = process.env.PORT || 8080;

import { handleSignup, handleLogin, deleteAccount, createSession, changeMasterPassword, sendPasswordChangeReminder } from "./controllers/AuthController";
import { getAllNoteNames, getNote, uploadNote, deleteNote, updateNote } from "./controllers/VaultController";
import { handleSend2fa, handleVerify2fa, handleGet2faStatus, handleEnable2fa, handleDisable2fa } from "./controllers/TwoFAController";
import { requireAuth } from "./middleware/authMiddleware";

// RESTful API routes
export const app = express();
app.use(cors({
	origin: "http://localhost:5173", // this may need to be changed to sm more scalable in the future
	methods: ["GET", "POST", "PUT", "DELETE"],
	credentials: true
}));
app.use(express.json({ limit: '15mb' }))

app.post("/api/auth/signup", handleSignup);
app.post("/api/auth/login", handleLogin);
app.post("/api/auth/session", createSession);
app.put("/api/auth/master-password", requireAuth, changeMasterPassword);
app.post("/api/auth/password-reminder/notify", requireAuth, sendPasswordChangeReminder);
app.post("/api/auth/2fa/send", handleSend2fa);
app.post("/api/auth/2fa/verify", handleVerify2fa);
app.post("/api/auth/2fa/status", handleGet2faStatus);
app.post("/api/auth/2fa/enable", handleEnable2fa);
app.post("/api/auth/2fa/disable", handleDisable2fa);

app.post("/api/vault/fileNames", getAllNoteNames); // Changed to post to accept body easily
app.post("/api/vault/get", getNote);
app.post("/api/vault/file", uploadNote);
app.delete("/api/vault/file", deleteNote);
app.put("/api/vault/file", updateNote);
app.put("/api/vault/file/:noteId", updateNote);

app.delete("/api/auth/account", deleteAccount);

// this is to serve the react front end
const frontendPath = path.resolve(__dirname, "../../frontend/dist");
console.log("Serving frontend from:", frontendPath);

app.use(express.static(frontendPath));

// API routes (must be before catch-all so they are reachable)
app.use(express.json({ limit: '15mb' }));

function validateSignupBody(body: any) {
  const { username, email, saltB64, iterations, wrapIvB64, wrappedMasterKeyB64 } = body ?? {};
  if (!username || typeof username !== "string" || !username.trim())
    return { ok: false, error: "Username is required" };
  if (!email || typeof email !== "string" || !email.trim())
    return { ok: false, error: "Email is required" };
  if (!saltB64 || typeof saltB64 !== "string")
    return { ok: false, error: "saltB64 is required" };
  const iter = Number(iterations);
  if (!Number.isInteger(iter) || iter < 100000)
    return { ok: false, error: "iterations must be a valid integer (at least 100000)" };
  if (!wrapIvB64 || typeof wrapIvB64 !== "string")
    return { ok: false, error: "wrapIvB64 is required" };
  if (!wrappedMasterKeyB64 || typeof wrappedMasterKeyB64 !== "string")
    return { ok: false, error: "wrappedMasterKeyB64 is required" };
  return { ok: true };
}

/* app.post('/api/signup', async (req, res) => {
  const validation = validateSignupBody(req.body);
  if (!validation.ok) return res.status(400).json({ error: validation.error });

  const {
    username,
    email,
    saltB64,
    iterations,
    wrapIvB64,
    wrappedMasterKeyB64
  } = req.body;

  const { data, error } = await supabase
    .from('users')
    .insert([{
      username,
      email,
      salt: saltB64,
      iterations,
      iv: wrapIvB64,
      wrapped_master_key: wrappedMasterKeyB64
    }]);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.json({ ok: true });
}); */

//this is some kind of backup router
app.use((req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"), err => {
    if (err) console.error("Error sending file:", err);
  });
});



const server = http.createServer(app);

server.listen(PORT, () => {
	console.log(`Server started on port ${PORT}`);
});
