import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

if (!url || !serviceKey) {
  throw new Error("SUPABASE_URL and SUPABASE_KEY must be set");
}

// Note: the service key used here is kept private and never exposed to github.
export const supabase = createClient(url, serviceKey);