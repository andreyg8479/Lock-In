import { Request } from "express";

/**
 * Gets the authenticated user ID from the request (e.g. from body or headers).
 * Returns null if not present.
 */
export function getUserId(req: Request): string | null {
    const userID = req.body?.userID ?? req.body?.user_id ?? req.headers["x-user-id"];
    return typeof userID === "string" ? userID : null;
}
