import { Request, Response } from "express";
import { supabase } from "../supabaseClient";

export async function getAllNoteNames(req: Request, res: Response) {

    // Assuming the user ID is supplied in the request body
    if (!req.body.userID) {
        return res.status(400).json({ error: "User ID is required" });
    }

    const { data: notes, error } = await supabase
        .from('notes')
        .select('id, note_title, pinned, created_at')
        .eq('user_id', req.body.userID)
        .order('created_at', { ascending: false });

    if (error) {
        return res.status(400).json({ error: error.message });
    }

    if (!notes) {
        return res.status(404).json({ error: "No notes found" });
    }

    return res.status(200).json({ notes });
}

export async function getNote(req: Request, res: Response) {

    const { data: notes, error: noteError } = await supabase
                           .from('notes')
                           .select('*')                // get all columns in the row
                           .eq('note_title', req.body.noteName)
                           .order('created_at', { ascending: false })
           
    // generic error
    if (noteError) {
        return res.status(400).json({ error: noteError.message });
    }

    return res.status(200).json({ notes });
}

export async function uploadNote(req: Request, res: Response) {

    const { data, error } = await supabase.from('notes').insert([{ 
        note_title: req.body.name, 
        note_text: req.body.data, 
        pinned: req.body.pinned, 
        created_at: new Date().toISOString() }]);

    // generic error
    if (error) {
        return res.status(400).json({ error: error.message });
    }

    // otherwise note uploaded successfully
     return res.status(201).json({ ok: true });
    
}

export async function updateNote(req: Request, res: Response) {
    const { noteId } = req.params;
    const { name, data: content, pinned } = req.body;

    // Build the updates object dynamically
    const updates: any = {
        updated_at: new Date().toISOString()
    };

    if (name !== undefined) updates.note_title = name;
    if (content !== undefined) updates.note_text = content;
    if (pinned !== undefined) updates.pinned = pinned;

    let query = supabase.from('notes').update(updates);

    if (noteId) {
        // If we have an ID from the URL, use it
        query = query.eq('id', noteId);
    } else if (name) {
        // Legacy fallback: update by name
        query = query.eq('note_title', name);
    } else {
        return res.status(400).json({ error: "Note ID or Name required for update" });
    }

    const { data, error } = await query;

    if (error) {
        return res.status(400).json({ error: error.message });
    }

    // note updated successfully
    return res.status(201).json({ ok: true });

}

export async function deleteNote(req: Request, res: Response) {
    return res.status(501).json({ error: "Not implemented" });
}