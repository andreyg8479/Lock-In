import { Request, Response } from "express";
import { send2faCode, verify2faCode } from "../email/emailService";
import { supabase } from "../supabaseClient";

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

export async function handleGet2faStatus(req: Request, res: Response) {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
        return res.status(400).json({ error: "Email is required" });
    }

    const { data, error } = await supabase
        .from("users")
        .select("two_fa_enabled")
        .eq("email", email)
        .maybeSingle();

    if (error) {
        return res.status(500).json({ error: error.message });
    }
    if (!data) {
        return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({ twoFaEnabled: data.two_fa_enabled });
}

export async function handleEnable2fa(req: Request, res: Response) {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
        return res.status(400).json({ error: "Email is required" });
    }

    const { error } = await supabase
        .from("users")
        .update({ two_fa_enabled: true } as any)
        .eq("email", email);

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ ok: true });
}

export async function handleDisable2fa(req: Request, res: Response) {
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

    const { error } = await supabase
        .from("users")
        .update({ two_fa_enabled: false } as any)
        .eq("email", email);

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ ok: true });
}
