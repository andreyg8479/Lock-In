import { Request, Response } from "express";
import { supabase } from "../supabaseClient";

export async function getAllNoteNames(req: Request, res: Response) {
    const { userID } = req.body; 

    // Assuming the user ID is supplied in the request body
    if (!userID) {
        return res.status(400).json({ error: "User ID is required" });
    }

    const { data: notes, error } = await supabase
        .from('notes')
        .select('id, user_id, note_title, iv_b64, pinned, note_type, created_at, updated_at, second_password')
        .eq('user_id', userID)
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

    // Expecting noteId and userID in the request body for specific retrieval
    const { noteId, userID } = req.body;

    if (!noteId || !userID) {
         return res.status(400).json({ error: "Both noteId and userID are required" });
    }

    const { data: notes, error: noteError } = await supabase
                           .from('notes')
                           .select('*')                // get all columns in the row
                           .eq('id', noteId)
                           .eq('user_id', userID)      // Ensure we only get the note for this user
                           .order('updated_at', { ascending: false }); // get latest version if duplicates exist
           
    // generic error
    if (noteError) {
        return res.status(400).json({ error: noteError.message });
    }
    
    // note to get not found
    if (!notes) {
        return res.status(404).json({ error: "Note not found" });
    }

    // otherwise note found successfully
    return res.status(201).json({ note: notes });		
				
}

export async function uploadNote(req: Request, res: Response) {

    const { data, error } = await supabase
        .from('notes')
        .insert([{
            note_title: req.body.note_title,
            note_text: req.body.note_text,
            iv_b64: req.body.iv_b64,
            pinned: req.body.pinned,
            note_type: req.body.note_type || 'text',
            user_id: req.body.user_id,
            second_password: req.body.second_password ?? null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }])
        .select('id')
        .single();

    if (error) {
        const code = (error as any).code;
        // 23505 is Postgres "unique_violation" – treat concurrent duplicate inserts as idempotent
        if (code === "23505") {
            return res.status(200).json({ ok: true, duplicated: true });
        }
        return res.status(400).json({ error: error.message });
    }

    // otherwise note uploaded successfully, return the DB-generated id
    return res.status(201).json({ ok: true, id: data.id });
    
}

// handles any update to the note 
export async function updateNote(req: Request, res: Response) {

    const { data, error } = await supabase
        .from('notes')
        .update({
            note_title: req.body.note_title,
            note_text: req.body.note_text,
            iv_b64: req.body.iv_b64,
            pinned: req.body.pinned,
            note_type: req.body.note_type || 'text',
            second_password: req.body.second_password ?? null,
            updated_at: new Date().toISOString()
        })
        .eq('id', req.body.id)
        .eq('user_id', req.body.user_id);

    if (error) {
        return res.status(400).json({ error: error.message });
    }

    return res.status(201).json({ ok: true });

}

/**
 * Sets second_password to null for a single note
 */
export async function clearNoteSecondPassword(req: Request, res: Response) {
    const noteId = req.body.noteId ?? req.body.id;
    const userId = req.body.user_id ?? req.body.userID;

    if (!noteId || !userId) {
        return res.status(400).json({ error: "noteId and user_id are required" });
    }

    const { data, error } = await supabase
        .from("notes")
        .update({
            second_password: null,
            updated_at: new Date().toISOString(),
        })
        .eq("id", noteId)
        .eq("user_id", userId)
        .select("id");

    if (error) {
        return res.status(400).json({ error: error.message });
    }

    if (!data || data.length === 0) {
        return res.status(404).json({ error: "Note not found or not owned by this user" });
    }

    return res.status(200).json({ ok: true });
}

export async function deleteNote(req: Request, res: Response) {

    const { note_title, user_id } = req.body;
    if (!user_id) {
        return res.status(400).json({ error: "user_id is required" });
    }
	
	const { data, error } = await supabase
	.from('notes')
	.delete()
	.eq('note_title', note_title)
    .eq('user_id', user_id); 

    // generic error
    if (error) {
        return res.status(400).json({ error: error.message });
    }

    // otherwise note deleted successfully
	return res.status(201).json({ ok: true });
    
}