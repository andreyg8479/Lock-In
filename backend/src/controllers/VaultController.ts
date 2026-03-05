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
        .select('id, note_title, pinned, date')
        .eq('user_id', userID)
        .order('date', { ascending: false });

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
                           .order('date', { ascending: false })
           
    // generic error
    if (noteError) {
        return res.status(400).json({ error: noteError.message });
    }

    // note to get not found
    if (!notes) {
        return res.status(404).json({ error: "Note not found" });
    }
    
    // otherwise note found successfully
    return res.status(201).json({ ok: true });		
				
}

export async function uploadNote(req: Request, res: Response) {

    const { data, error } = await supabase.from('notes').insert([{ 
        note_title: req.body.name, 
        note_text: req.body.data, 
        pinned: req.body.pinned, 
        date: new Date().toISOString() }]);

    // generic error
    if (error) {
        return res.status(400).json({ error: error.message });
    }

    // note to delete not found
    if (!data) {
        return res.status(404).json({ error: "Note not found" });
    }

    // otherwise note uploaded successfully
     return res.status(201).json({ ok: true });
    
}

// handles any update to the note itself, i.e.
// if the request is to pin/unpin, to update note content, to update note name etc
export async function updateNote(req: Request, res: Response) {
    const { noteId } = req.params;
    const { name, data: content, pinned } = req.body;

    // Build the updates object dynamically
    const updates: any = {
        date: new Date().toISOString()
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

    // otherwise note updated successfully
    return res.status(200).json({ ok: true });
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

    // note to delete not found
    if (!data) {
        return res.status(404).json({ error: "Note not found" });
    }

    // otherwise note deleted successfully
	return res.status(201).json({ ok: true });
    
}