import { Request, Response } from "express";
import { supabase } from "../supabaseClient";

export async function getAllNoteNames(req: Request, res: Response) {

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

    const { data, error } = await supabase.from('notes').update({
        note_title: req.body.name,
        note_text: req.body.data,
        pinned: req.body.pinned,
        date: new Date().toISOString()
    }).eq('note_title', req.body.name);

    // otherwise note updated successfully
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

    // note to delete not found
    if (!data) {
        return res.status(404).json({ error: "Note not found" });
    }

    // otherwise note deleted successfully
	return res.status(201).json({ ok: true });
    
}