import { Request, Response } from "express";

/*

    req.body: JSON body
    req.params: URL params
    req.query: query string
    req.headers: headers

*/

export async function handleSignup(req: Request, res: Response) {
    console.log("handleSignup reached!");
}

export async function handleLogin(req: Request, res: Response) {
    console.log("handleSignup reached!");
}