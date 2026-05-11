import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SetAllCookies } from "@supabase/ssr";
import { requireSupabasePublicEnv } from "./env";

export function createClient(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  const { url, key } = requireSupabasePublicEnv();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot set cookies directly; middleware refreshes sessions.
        }
      }
    }
  });
}

export async function supabaseServer() {
  const cookieStore = await cookies();
  return createClient(cookieStore);
}
