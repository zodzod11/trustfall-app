/** Minimal Json alias (mirrors Supabase) — avoids importing from generated DB types here. */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]
