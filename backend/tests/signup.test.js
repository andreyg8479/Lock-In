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


function createSignupApp() {
  const app = express();
  app.use(express.json());

  const { createClient } = require("@supabase/supabase-js");
  const supabase = createClient("http://test", "test-key");

  app.post("/api/signup", async (req, res) => {
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