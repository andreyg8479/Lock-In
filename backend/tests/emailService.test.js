const mockSend = jest.fn();

jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: mockSend,
    },
  })),
}));

const { sendNewDeviceLoginEmail } = require("../src/email/emailService");

beforeEach(() => {
  jest.clearAllMocks();
});

test("sends a new-device login notification email", async () => {
  mockSend.mockResolvedValue({ error: null });

  const result = await sendNewDeviceLoginEmail({
    email: "user@example.com",
    device: "Chrome on Windows",
    time: "2026-04-19T23:30:00Z",
  });

  expect(result).toEqual({ ok: true });
  expect(mockSend).toHaveBeenCalledTimes(1);
  expect(mockSend).toHaveBeenCalledWith(
    expect.objectContaining({
      to: "user@example.com",
      subject: "New sign-in to your LockIn account",
      html: expect.stringContaining("Chrome on Windows"),
    })
  );
});
