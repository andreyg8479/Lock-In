// backend/tests/signup.test.js
const request = require("supertest");

const CRYPTO_ITERATIONS = 310000;

// Mock Supabase since the real database is not available
jest.mock("@supabase/supabase-js", () => {
  const insert = jest.fn().mockResolvedValue({ data: [{}], error: null });
  const from = jest.fn(() => ({ insert }));
  const createClient = jest.fn(() => ({ from }));
  return { createClient };
});

const { app } = require("../server");

test("signup succeeds and returns ok:true", async () => {
  const body = {
    username: "yousef",
    email: "yousef@example.com",
    saltB64: "base64-salt",
    iterations: CRYPTO_ITERATIONS,
    wrapIvB64: "base64-iv",
    wrappedMasterKeyB64: "base64-wrapped-key",
  };

  const res = await request(app)
    .post("/api/signup")
    .send(body)
    .expect(200);

  expect(res.body).toEqual({ ok: true });
});

test("signup returns 400 when Supabase errors", async () => {
  // Reconfigure mock to simulate an error for this test
  const { createClient } = require("@supabase/supabase-js");
  const client = createClient.mock.results[0].value;
  client.from().insert.mockResolvedValueOnce({
    data: null,
    error: { message: "duplicate key value" },
  });

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