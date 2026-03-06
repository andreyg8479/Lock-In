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
        .select('id, note_title, pinned, created_at')
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

    // Expecting both noteName and userID in the request body for specific retrieval
    const { noteName, userID } = req.body;

    if (!noteName || !userID) {
         return res.status(400).json({ error: "Both noteName and userID are required" });
    }

    const { data: notes, error: noteError } = await supabase
                           .from('notes')
                           .select('*')                // get all columns in the row
                           .eq('note_title', noteName)
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

    const { data, error } = await supabase.from('notes').insert([{ 
        note_title: req.body.name, 
        note_text: req.body.data, 
        pinned: req.body.pinned,
        user_id: req.body.user_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }]);

    // generic error
    if (error) {
        return res.status(400).json({ error: error.message });
    }

    // otherwise note uploaded successfully
     return res.status(201).json({ ok: true });
    
}

// handles any update to the note 
export async function updateNote(req: Request, res: Response) {

    const { data, error } = await supabase.from('notes').update({
        note_title: req.body.name,
        note_text: req.body.data,
        pinned: req.body.pinned,
        updated_at: new Date().toISOString()
    }).eq('note_title', req.body.name);

    if (error) {
        return res.status(400).json({ error: error.message });
    }

    return res.status(201).json({ ok: true });

}

export async function deleteNote(req: Request, res: Response) {

    const { note_title } = req.body;
	
	const { data, error } = await supabase
	.from('notes')
	.delete()
	.eq('note_title', note_title); 

    // generic error
    if (error) {
        return res.status(400).json({ error: error.message });
    }

    // otherwise note deleted successfully
	return res.status(201).json({ ok: true });
    
}