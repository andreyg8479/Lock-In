import { Request, Response } from "express";
import { send2faCode, verify2faCode } from "../email/emailService";

export async function handleSend2fa(req: Request, res: Response) {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
        return res.status(400).json({ error: "Email is required" });
    }

    const result = await send2faCode(email);

    if (!result.ok) {
        return res.status(500).json({ error: result.error });
    }

    return res.status(200).json({ ok: true });
}

export async function handleVerify2fa(req: Request, res: Response) {
    const { email, code } = req.body;

    if (!email || typeof email !== "string") {
        return res.status(400).json({ error: "Email is required" });
    }
    if (!code || typeof code !== "string") {
        return res.status(400).json({ error: "Code is required" });
    }

    const result = verify2faCode(email, code);

    if (!result.ok) {
        return res.status(401).json({ error: result.error });
    }

    return res.status(200).json({ ok: true });
}
