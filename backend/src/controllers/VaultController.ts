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
                                                       
                           return res.status(201).json({ ok: true });		
				
}

export async function uploadNote(req: Request, res: Response) {

    const { data, error } = await supabase.from('notes').insert([{ 
        note_title: req.body.name, 
        note_text: req.body.data, 
        pinned: req.body.pinned, 
        date: new Date().toISOString() }]);

        return res.status(201).json({ ok: true });
    
}

export async function updateNote(req: Request, res: Response) {
    
}

export async function deleteNote(req: Request, res: Response) {


    const { note_title } = req.body;
	
	const { data, error } = await supabase
	.from('notes')
	.delete()
	.eq('note_title', note_title); 

	return res.status(201).json({ ok: true });
    
}

