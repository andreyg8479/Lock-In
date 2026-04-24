/**
 * Tests for the device tracking helper that wires the new-device login email
 * into the login flow. Mocks out Supabase and the email service so the paths
 * through recordDeviceAndMaybeNotify can be exercised in isolation.
 *
 * Jest only allows jest.mock() factories to reference variables whose names
 * start with "mock", so every shared fixture below is prefixed accordingly.
 */

const mockSendNewDeviceLoginEmail = jest.fn();

const mockSelectResult = { current: { data: null, error: null } };
const mockInsertResult = { current: { data: null, error: null } };
const mockUpdateResult = { current: { data: null, error: null } };

const mockSelectEqChain = {
    eq: jest.fn(() => mockSelectEqChain),
    maybeSingle: jest.fn(() => Promise.resolve(mockSelectResult.current)),
};

const mockUpdateEqChain = {
    eq: jest.fn(() => Promise.resolve(mockUpdateResult.current)),
};

const mockTableBuilder = {
    select: jest.fn(() => mockSelectEqChain),
    insert: jest.fn(() => Promise.resolve(mockInsertResult.current)),
    update: jest.fn(() => mockUpdateEqChain),
};

jest.mock("../src/supabaseClient", () => ({
    supabase: {
        from: jest.fn(() => mockTableBuilder),
    },
}));

jest.mock("../src/email/emailService", () => ({
    sendNewDeviceLoginEmail: (...args) => mockSendNewDeviceLoginEmail(...args),
}));

const { recordDeviceAndMaybeNotify, computeDeviceHash } = require("../src/devices/deviceTracker");
const { supabase } = require("../src/supabaseClient");

function makeReq(headers = {}) {
    return { headers };
}

beforeEach(() => {
    jest.clearAllMocks();
    mockSelectResult.current = { data: null, error: null };
    mockInsertResult.current = { data: null, error: null };
    mockUpdateResult.current = { data: null, error: null };
});

test("computeDeviceHash is stable and distinguishes inputs", () => {
    const a = computeDeviceHash("Mozilla/5.0 Chrome", "en-US");
    const b = computeDeviceHash("Mozilla/5.0 Chrome", "en-US");
    const c = computeDeviceHash("Mozilla/5.0 Chrome", "fr-FR");
    const d = computeDeviceHash("Mozilla/5.0 Firefox", "en-US");
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).not.toBe(d);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
});

test("new device path: inserts row and sends email once", async () => {
    mockSelectResult.current = { data: null, error: null };
    mockInsertResult.current = { data: null, error: null };
    mockSendNewDeviceLoginEmail.mockResolvedValue({ ok: true });

    await recordDeviceAndMaybeNotify({
        userId: "user-1",
        email: "user@example.com",
        req: makeReq({
            "user-agent": "Mozilla/5.0 (Macintosh) Chrome/120",
            "accept-language": "en-US",
        }),
    });

    expect(supabase.from).toHaveBeenCalledWith("user_devices");
    expect(mockTableBuilder.select).toHaveBeenCalledTimes(1);
    expect(mockTableBuilder.insert).toHaveBeenCalledTimes(1);
    expect(mockTableBuilder.update).not.toHaveBeenCalled();

    const insertArg = mockTableBuilder.insert.mock.calls[0][0];
    expect(Array.isArray(insertArg)).toBe(true);
    expect(insertArg[0]).toEqual(
        expect.objectContaining({
            user_id: "user-1",
            user_agent: "Mozilla/5.0 (Macintosh) Chrome/120",
            device_hash: expect.stringMatching(/^[0-9a-f]{64}$/),
        })
    );

    expect(mockSendNewDeviceLoginEmail).toHaveBeenCalledTimes(1);
    expect(mockSendNewDeviceLoginEmail).toHaveBeenCalledWith(
        expect.objectContaining({
            email: "user@example.com",
            device: "Mozilla/5.0 (Macintosh) Chrome/120",
            time: expect.any(String),
        })
    );
});

test("known device path: updates last_seen_at and does NOT send email", async () => {
    mockSelectResult.current = { data: { id: "dev-row-1" }, error: null };
    mockUpdateResult.current = { data: null, error: null };

    await recordDeviceAndMaybeNotify({
        userId: "user-1",
        email: "user@example.com",
        req: makeReq({ "user-agent": "Mozilla/5.0", "accept-language": "en-US" }),
    });

    expect(mockTableBuilder.select).toHaveBeenCalledTimes(1);
    expect(mockTableBuilder.update).toHaveBeenCalledTimes(1);
    expect(mockTableBuilder.insert).not.toHaveBeenCalled();

    const updateArg = mockTableBuilder.update.mock.calls[0][0];
    expect(updateArg).toEqual(expect.objectContaining({ last_seen_at: expect.any(String) }));
    expect(mockUpdateEqChain.eq).toHaveBeenCalledWith("id", "dev-row-1");

    expect(mockSendNewDeviceLoginEmail).not.toHaveBeenCalled();
});

test("missing user_devices table: logs warning, skips email, does not throw", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    mockSelectResult.current = {
        data: null,
        error: { code: "42P01", message: "relation \"user_devices\" does not exist" },
    };

    await expect(
        recordDeviceAndMaybeNotify({
            userId: "user-1",
            email: "user@example.com",
            req: makeReq({ "user-agent": "Mozilla/5.0", "accept-language": "en-US" }),
        })
    ).resolves.toBeUndefined();

    expect(mockTableBuilder.insert).not.toHaveBeenCalled();
    expect(mockTableBuilder.update).not.toHaveBeenCalled();
    expect(mockSendNewDeviceLoginEmail).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
});

test("email send failure does not cause the function to throw", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    mockSelectResult.current = { data: null, error: null };
    mockInsertResult.current = { data: null, error: null };
    mockSendNewDeviceLoginEmail.mockRejectedValue(new Error("resend down"));

    await expect(
        recordDeviceAndMaybeNotify({
            userId: "user-1",
            email: "user@example.com",
            req: makeReq({ "user-agent": "Mozilla/5.0", "accept-language": "en-US" }),
        })
    ).resolves.toBeUndefined();

    expect(mockTableBuilder.insert).toHaveBeenCalledTimes(1);
    expect(mockSendNewDeviceLoginEmail).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
});

test("email send returning ok: false does not throw", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    mockSelectResult.current = { data: null, error: null };
    mockInsertResult.current = { data: null, error: null };
    mockSendNewDeviceLoginEmail.mockResolvedValue({ ok: false, error: "quota" });

    await expect(
        recordDeviceAndMaybeNotify({
            userId: "user-1",
            email: "user@example.com",
            req: makeReq({ "user-agent": "Mozilla/5.0", "accept-language": "en-US" }),
        })
    ).resolves.toBeUndefined();

    expect(mockSendNewDeviceLoginEmail).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
});

test("insert unique-violation race is swallowed and no email is sent", async () => {
    mockSelectResult.current = { data: null, error: null };
    mockInsertResult.current = { data: null, error: { code: "23505", message: "duplicate key" } };

    await recordDeviceAndMaybeNotify({
        userId: "user-1",
        email: "user@example.com",
        req: makeReq({ "user-agent": "Mozilla/5.0", "accept-language": "en-US" }),
    });

    expect(mockTableBuilder.insert).toHaveBeenCalledTimes(1);
    expect(mockSendNewDeviceLoginEmail).not.toHaveBeenCalled();
});
