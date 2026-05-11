import { createClient } from "@supabase/supabase-js";
import { supabaseSecretKey, supabaseUrl } from "./env";

export function supabaseAdmin() {
  const url = supabaseUrl();
  const key = supabaseSecretKey();
  if (!url || !key) throw new Error("Missing Supabase admin environment variables");
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
