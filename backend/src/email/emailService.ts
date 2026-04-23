import { Resend } from "resend";
import crypto from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);

const DEFAULT_MAIL_FROM = "LockIn <onboarding@resend.dev>";

function mailFrom(): string {
    const from = process.env.MAIL_FROM?.trim();
    return from || DEFAULT_MAIL_FROM;
}

export type SendEmailParams = {
    to: string;
    subject: string;
    html: string;
};

/**
 * Generic transactional send. Returns `{ ok: false, error }` on failure (does not throw for API errors).
 */
export async function sendEmail(params: SendEmailParams): Promise<{ ok: boolean; error?: string }> {
    const { to, subject, html } = params;
    if (!to || typeof to !== "string") {
        return { ok: false, error: "Invalid recipient" };
    }
    const { error } = await resend.emails.send({
        from: mailFrom(),
        to,
        subject,
        html
    });
    if (error) {
        return { ok: false, error: error.message };
    }
    return { ok: true };
}

export type SendNewDeviceLoginEmailParams = {
    /** Account holder address to notify */
    email: string;
    /** Device description (e.g. user agent or label) when available */
    device: string;
    /** When the sign-in occurred, as a string for display (e.g. locale-formatted or ISO) */
    time: string;
};

/**
 * Notify the user that a new device signed in.
 */
export async function sendNewDeviceLoginEmail(
    params: SendNewDeviceLoginEmailParams
): Promise<{ ok: boolean; error?: string }> {
    const { email, device, time } = params;
    return sendEmail({
        to: email,
        subject: "New sign-in to your LockIn account",
        html:
            `<p>A new device just signed in to your LockIn account.</p>` +
            `<ul>` +
            `<li><strong>Device:</strong> ${device}</li>` +
            `<li><strong>Time:</strong> ${time}</li>` +
            `</ul>` +
            `<p>If this was you, you can ignore this message. If you do not recognize this activity, ` +
            `secure your account by changing your password and reviewing your sessions.</p>`
    });
}


export async function sendPasswordChangeReminderEmail(
    email: string
): Promise<{ ok: boolean; error?: string }> {
    return sendEmail({
        to: email,
        subject: "Time to change your LockIn master password",
        html:
            `<p>Based on the password rotation reminder you configured in LockIn, it is time to ` +
            `change your <strong>master password</strong>.</p>` +
            `<p>Sign in to the app, open <strong>Change Master Password</strong>, and set a new password. ` +
            `Regular rotation helps protect your vault if a password is ever exposed.</p>` +
            `<p>If you have already changed your password since this message was sent, you can ignore it.</p>`
    });
}

const TWO_FA_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const TWO_FA_LENGTH = 6;
const CODE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 5;

type PendingCode = {
    code: string;
    expiresAt: number;
    attempts: number;
};

// In-memory store — keyed by email
const pendingCodes = new Map<string, PendingCode>();

function generateSecure2faCode(): string {
    const bytes = crypto.randomBytes(TWO_FA_LENGTH);
    let code = "";
    for (let i = 0; i < TWO_FA_LENGTH; i++) {
        code += TWO_FA_CHARS[bytes[i] % TWO_FA_CHARS.length];
    }
    return code;
}

export async function send2faCode(email: string): Promise<{ ok: boolean; error?: string }> {
    const code = generateSecure2faCode();

    pendingCodes.set(email, {
        code,
        expiresAt: Date.now() + CODE_EXPIRY_MS,
        attempts: 0
    });

    const result = await sendEmail({
        to: email,
        subject: "Your LockIn 2FA Code",
        html: `<p>Your verification code is: <strong>${code}</strong></p><p>This code expires in 5 minutes.</p>`
    });

    if (!result.ok) {
        pendingCodes.delete(email);
        return { ok: false, error: result.error };
    }

    return { ok: true };
}

export function verify2faCode(email: string, attemptedCode: string): { ok: boolean; error?: string } {
    const entry = pendingCodes.get(email);

    if (!entry) {
        return { ok: false, error: "No 2FA code was requested for this email" };
    }

    if (Date.now() > entry.expiresAt) {
        pendingCodes.delete(email);
        return { ok: false, error: "2FA code has expired" };
    }

    entry.attempts += 1;
    if (entry.attempts > MAX_ATTEMPTS) {
        pendingCodes.delete(email);
        return { ok: false, error: "Too many attempts. Please request a new code." };
    }

    // Constant-time comparison to prevent timing attacks
    const codeBuffer = Buffer.from(entry.code);
    const attemptBuffer = Buffer.from(attemptedCode.toUpperCase());

    if (codeBuffer.length !== attemptBuffer.length || !crypto.timingSafeEqual(codeBuffer, attemptBuffer)) {
        return { ok: false, error: "Incorrect code" };
    }

    // Code verified — clean up
    pendingCodes.delete(email);
    return { ok: true };
}
