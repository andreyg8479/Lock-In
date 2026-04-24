import { Request, Response, NextFunction } from "express";
import { verifyToken, type JwtPayload } from "../utils/jwt";

// Extend Express Request to carry the authenticated user
declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}

/**
 * Minimum allowed JWT `iat` (issued-at, seconds). Tokens issued before this
 * cutoff are rejected — used to force all users to re-login after a
 * breaking change (e.g. the RSA key-pair rollout for note sharing).
 *
 * Format: unix seconds. Unset or 0 disables the check.
 */
function getIatCutoffSeconds(): number {
    const raw = process.env.JWT_IAT_CUTOFF;
    if (!raw) return 0;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/**
 * Middleware that requires a valid JWT in the Authorization header.
 * On success, sets req.user = { userId, email }.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
        res.status(401).json({ error: "Missing or invalid Authorization header" });
        return;
    }

    const token = header.slice(7); // strip "Bearer "

    try {
        const payload = verifyToken(token);
        const cutoff = getIatCutoffSeconds();
        if (cutoff > 0) {
            const iat = (payload as any).iat as number | undefined;
            if (typeof iat !== "number" || iat < cutoff) {
                res.status(401).json({ error: "session_expired" });
                return;
            }
        }
        req.user = payload;
        next();
    } catch {
        res.status(401).json({ error: "Invalid or expired token" });
    }
}
