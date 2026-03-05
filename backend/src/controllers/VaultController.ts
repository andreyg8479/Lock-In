import { Request, Response } from "express";
import { supabase } from "../supabaseClient";

export async function getAllNoteNames(req: Request, res: Response) {

    const { data, error } = await supabase
        .from('notes')
        .select('note_title')
        .order('date', { ascending: false });

    // generic error
    if (error) {
        return res.status(400).json({ error: error.message });
    }

    return res.status(201).json({ note_titles: data });		


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
    
    // otherwise note found successfully
    return res.status(201).json({ note: notes });		
				
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

    // note updated successfully
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