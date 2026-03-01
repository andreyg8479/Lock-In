// backend/tests/signup.test.js
const express = require("express");
const request = require("supertest");

const CRYPTO_ITERATIONS = 310000;

// Mock Supabase because we don't have DB implemented rn
const mockInsert = jest.fn();
const mockFrom = jest.fn(() => ({ insert: mockInsert }));
const mockCreateClient = jest.fn(() => ({ from: mockFrom }));

jest.mock("@supabase/supabase-js", () => ({
  createClient: (...args) => mockCreateClient(...args),
}));


function validateSignupBody(body) {
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

function createSignupApp() {
  const app = express();
  app.use(express.json());

  const { createClient } = require("@supabase/supabase-js");
  const supabase = createClient("http://test", "test-key");

  app.post("/api/signup", async (req, res) => {
    const validation = validateSignupBody(req.body);
    if (!validation.ok) return res.status(400).json({ error: validation.error });

    const {
      username,
      email,
      saltB64,
      iterations,
      wrapIvB64,
      wrappedMasterKeyB64,
    } = req.body;

    const { data, error } = await supabase
      .from("users")
      .insert([
        {
          username,
          email,
          salt: saltB64,
          iterations,
          iv: wrapIvB64,
          wrapped_master_key: wrappedMasterKeyB64,
        },
      ]);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ ok: true });
  });

  return app;
}

beforeEach(() => {
  jest.clearAllMocks();
});

test("signup succeeds and returns ok:true", async () => {
  mockInsert.mockResolvedValue({ data: [{}], error: null });

  const app = createSignupApp();
  const body = {
    username: "yousef",
    email: "yousef@example.com",
    saltB64: "base64-salt",
    iterations: CRYPTO_ITERATIONS,
    wrapIvB64: "base64-iv",
    wrappedMasterKeyB64: "base64-wrapped-key",
  };

  const res = await request(app).post("/api/signup").send(body).expect(200);

  expect(res.body).toEqual({ ok: true });
});

test("signup returns 400 when Supabase errors", async () => {
  mockInsert.mockResolvedValueOnce({
    data: null,
    error: { message: "duplicate key value" },
  });

  const app = createSignupApp();

  const res = await request(app)
    .post("/api/signup")
    .send({
      username: "yousef",
      email: "yousef@example.com",
      saltB64: "base64-salt",
      iterations: CRYPTO_ITERATIONS,
      wrapIvB64: "base64-iv",
      wrappedMasterKeyB64: "base64-wrapped-key",
    })
    .expect(400);

  expect(res.body.error).toMatch(/duplicate key/i);
});

describe("signup validation", () => {
  test("returns 400 when body is empty", async () => {
    mockInsert.mockResolvedValue({ data: [{}], error: null });
    const app = createSignupApp();
    const res = await request(app).post("/api/signup").send({}).expect(400);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error).toMatch(/username|required/i);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  test("returns 400 when username is missing", async () => {
    mockInsert.mockResolvedValue({ data: [{}], error: null });
    const app = createSignupApp();
    const body = {
      email: "yousef@example.com",
      saltB64: "base64-salt",
      iterations: CRYPTO_ITERATIONS,
      wrapIvB64: "base64-iv",
      wrappedMasterKeyB64: "base64-wrapped-key",
    };
    const res = await request(app).post("/api/signup").send(body).expect(400);
    expect(res.body.error).toMatch(/username|required/i);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  test("returns 400 when username is empty string", async () => {
    mockInsert.mockResolvedValue({ data: [{}], error: null });
    const app = createSignupApp();
    const body = {
      username: "",
      email: "yousef@example.com",
      saltB64: "base64-salt",
      iterations: CRYPTO_ITERATIONS,
      wrapIvB64: "base64-iv",
      wrappedMasterKeyB64: "base64-wrapped-key",
    };
    const res = await request(app).post("/api/signup").send(body).expect(400);
    expect(res.body.error).toMatch(/username|required/i);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  test("returns 400 when email is missing", async () => {
    mockInsert.mockResolvedValue({ data: [{}], error: null });
    const app = createSignupApp();
    const body = {
      username: "yousef",
      saltB64: "base64-salt",
      iterations: CRYPTO_ITERATIONS,
      wrapIvB64: "base64-iv",
      wrappedMasterKeyB64: "base64-wrapped-key",
    };
    const res = await request(app).post("/api/signup").send(body).expect(400);
    expect(res.body.error).toMatch(/email|required/i);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  test("returns 400 when email is empty string", async () => {
    mockInsert.mockResolvedValue({ data: [{}], error: null });
    const app = createSignupApp();
    const body = {
      username: "yousef",
      email: "",
      saltB64: "base64-salt",
      iterations: CRYPTO_ITERATIONS,
      wrapIvB64: "base64-iv",
      wrappedMasterKeyB64: "base64-wrapped-key",
    };
    const res = await request(app).post("/api/signup").send(body).expect(400);
    expect(res.body.error).toMatch(/email|required/i);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  test("returns 400 when saltB64 is missing", async () => {
    mockInsert.mockResolvedValue({ data: [{}], error: null });
    const app = createSignupApp();
    const body = {
      username: "yousef",
      email: "yousef@example.com",
      iterations: CRYPTO_ITERATIONS,
      wrapIvB64: "base64-iv",
      wrappedMasterKeyB64: "base64-wrapped-key",
    };
    const res = await request(app).post("/api/signup").send(body).expect(400);
    expect(res.body.error).toMatch(/saltB64|required/i);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  test("returns 400 when iterations is missing", async () => {
    mockInsert.mockResolvedValue({ data: [{}], error: null });
    const app = createSignupApp();
    const body = {
      username: "yousef",
      email: "yousef@example.com",
      saltB64: "base64-salt",
      wrapIvB64: "base64-iv",
      wrappedMasterKeyB64: "base64-wrapped-key",
    };
    const res = await request(app).post("/api/signup").send(body).expect(400);
    expect(res.body.error).toMatch(/iterations/i);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  test("returns 400 when iterations is too low", async () => {
    mockInsert.mockResolvedValue({ data: [{}], error: null });
    const app = createSignupApp();
    const body = {
      username: "yousef",
      email: "yousef@example.com",
      saltB64: "base64-salt",
      iterations: 50000,
      wrapIvB64: "base64-iv",
      wrappedMasterKeyB64: "base64-wrapped-key",
    };
    const res = await request(app).post("/api/signup").send(body).expect(400);
    expect(res.body.error).toMatch(/iterations|100000/i);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  test("returns 400 when wrapIvB64 is missing", async () => {
    mockInsert.mockResolvedValue({ data: [{}], error: null });
    const app = createSignupApp();
    const body = {
      username: "yousef",
      email: "yousef@example.com",
      saltB64: "base64-salt",
      iterations: CRYPTO_ITERATIONS,
      wrappedMasterKeyB64: "base64-wrapped-key",
    };
    const res = await request(app).post("/api/signup").send(body).expect(400);
    expect(res.body.error).toMatch(/wrapIvB64|required/i);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  test("returns 400 when wrappedMasterKeyB64 is missing", async () => {
    mockInsert.mockResolvedValue({ data: [{}], error: null });
    const app = createSignupApp();
    const body = {
      username: "yousef",
      email: "yousef@example.com",
      saltB64: "base64-salt",
      iterations: CRYPTO_ITERATIONS,
      wrapIvB64: "base64-iv",
    };
    const res = await request(app).post("/api/signup").send(body).expect(400);
    expect(res.body.error).toMatch(/wrappedMasterKeyB64|required/i);
    expect(mockInsert).not.toHaveBeenCalled();
  });
});