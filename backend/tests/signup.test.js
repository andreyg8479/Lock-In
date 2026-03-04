// backend/tests/signup.test.js
const request = require("supertest");

const CRYPTO_ITERATIONS = 310000;

// Mock Supabase before requiring server so the real app uses the mock
const mockInsert = jest.fn();
const mockFrom = jest.fn(() => ({ insert: mockInsert }));
const mockCreateClient = jest.fn(() => ({ from: mockFrom }));

jest.mock("@supabase/supabase-js", () => ({
  createClient: (...args) => mockCreateClient(...args),
}));

const { app } = require("../server");

beforeEach(() => {
  jest.clearAllMocks();
});

test("signup succeeds and returns ok:true", async () => {
  mockInsert.mockResolvedValue({ data: [{}], error: null });
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
    const res = await request(app).post("/api/signup").send({}).expect(400);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error).toMatch(/username|required/i);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  test("returns 400 when username is missing", async () => {
    mockInsert.mockResolvedValue({ data: [{}], error: null });
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