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
        req.user = verifyToken(token);
        next();
    } catch {
        res.status(401).json({ error: "Invalid or expired token" });
    }
}
