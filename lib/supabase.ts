// Supabase client — only used if you have your own fork
// The default RAG uses pasal.id's public REST API (no key needed)
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = url && key ? createClient(url, key) : null;
export default supabase;
