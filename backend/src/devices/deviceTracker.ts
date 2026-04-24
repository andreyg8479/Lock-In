/**
 * Device tracking for new-device sign-in notifications.
 *
 * Fingerprints each sign-in server-side from the request's User-Agent and
 * Accept-Language headers, records it per user, and emails the user the
 * first time a given (user, fingerprint) pair is seen.
 *
 * Required Supabase migration:
 *
 *   create table if not exists public.user_devices (
 *     id uuid primary key default gen_random_uuid(),
 *     user_id uuid not null references public.users(id) on delete cascade,
 *     device_hash text not null,
 *     user_agent text,
 *     first_seen_at timestamptz not null default now(),
 *     last_seen_at timestamptz not null default now(),
 *     unique (user_id, device_hash)
 *   );
 *   create index if not exists user_devices_user_id_idx on public.user_devices(user_id);
 *
 * If the migration has not been applied yet, this module degrades gracefully
 * (logs a warning and skips the notification) so login is not broken.
 */

import crypto from "crypto";
import { Request } from "express";
import { supabase } from "../supabaseClient";
import { sendNewDeviceLoginEmail } from "../email/emailService";

const USER_AGENT_DISPLAY_MAX = 200;

/**
 * Returns true for Postgres/PostgREST errors raised when the `user_devices`
 * table hasn't been created yet. The SQLSTATE code for "undefined_table" is
 * 42P01; PostgREST often surfaces the English message instead of (or in
 * addition to) the code.
 */
function isMissingTableError(error: any): boolean {
    if (!error) return false;
    if (error.code === "42P01") return true;
    const msg: string = (error.message || "") + " " + (error.details || "");
    return /relation\s+\S+\s+does not exist/i.test(msg);
}

/**
 * Stable SHA-256 fingerprint of the client. Same UA + Accept-Language pair
 * always produces the same hex digest.
 */
export function computeDeviceHash(
    userAgent: string | undefined,
    acceptLanguage: string | undefined
): string {
    const ua = (userAgent ?? "").trim();
    const lang = (acceptLanguage ?? "").trim();
    return crypto.createHash("sha256").update(`${ua}|${lang}`).digest("hex");
}

export type RecordDeviceParams = {
    userId: string;
    email: string;
    req: Pick<Request, "headers">;
};

/**
 * Upserts the device fingerprint for this user. On first sight of a given
 * fingerprint, fires a "new device signed in" email (not awaited) and
 * resolves as soon as the DB write has settled.
 *
 * Never throws: every error path logs a warning and returns so the caller
 * (the login flow) is never blocked.
 */
export async function recordDeviceAndMaybeNotify(
    params: RecordDeviceParams
): Promise<void> {
    const { userId, email, req } = params;
    try {
        const headers = req.headers ?? {};
        const ua = typeof headers["user-agent"] === "string" ? (headers["user-agent"] as string) : undefined;
        const acceptLanguage =
            typeof headers["accept-language"] === "string" ? (headers["accept-language"] as string) : undefined;

        const deviceHash = computeDeviceHash(ua, acceptLanguage);

        const { data: existing, error: selectError } = await supabase
            .from("user_devices")
            .select("id")
            .eq("user_id", userId)
            .eq("device_hash", deviceHash)
            .maybeSingle();

        if (selectError) {
            if (isMissingTableError(selectError)) {
                console.warn(
                    "recordDeviceAndMaybeNotify: user_devices table missing; " +
                        "skipping new-device notification. Apply the device-tracking migration.",
                    selectError.message
                );
                return;
            }
            console.warn("recordDeviceAndMaybeNotify: select failed:", selectError.message);
            return;
        }

        const now = new Date();

        if (existing) {
            const { error: updateError } = await supabase
                .from("user_devices")
                .update({ last_seen_at: now.toISOString() } as any)
                .eq("id", existing.id);
            if (updateError) {
                console.warn("recordDeviceAndMaybeNotify: update failed:", updateError.message);
            }
            return;
        }

        const { error: insertError } = await supabase.from("user_devices").insert([
            {
                user_id: userId,
                device_hash: deviceHash,
                user_agent: ua ?? null,
                first_seen_at: now.toISOString(),
                last_seen_at: now.toISOString(),
            } as any,
        ]);

        if (insertError) {
            // 23505 = unique_violation. Lost an insert race to a concurrent
            // login from the same device; that means the device is already
            // known, so suppress the email.
            if ((insertError as any).code === "23505") {
                return;
            }
            if (isMissingTableError(insertError)) {
                console.warn(
                    "recordDeviceAndMaybeNotify: user_devices table missing on insert; " +
                        "skipping new-device notification.",
                    insertError.message
                );
                return;
            }
            console.warn("recordDeviceAndMaybeNotify: insert failed:", insertError.message);
            return;
        }

        const device = (ua && ua.slice(0, USER_AGENT_DISPLAY_MAX)) || "Unknown device";
        const time = now.toUTCString();

        try {
            const result = await sendNewDeviceLoginEmail({ email, device, time });
            if (!result.ok) {
                console.warn("recordDeviceAndMaybeNotify: email send failed:", result.error);
            }
        } catch (e) {
            console.warn("recordDeviceAndMaybeNotify: email send threw:", e);
        }
    } catch (e) {
        console.warn("recordDeviceAndMaybeNotify: unexpected error:", e);
    }
}
