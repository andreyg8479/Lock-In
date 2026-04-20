import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "lockin-dev-secret-change-in-production";
const JWT_EXPIRY = "24h";

export interface JwtPayload {
    userId: string;
    email: string;
}

export function signToken(payload: JwtPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token: string): JwtPayload {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
}
