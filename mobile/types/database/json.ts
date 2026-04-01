/**
 * JSON value type for jsonb columns (matches @supabase/supabase-js generated Json).
 * Replace with `import type { Json } from './supabase.types'` after codegen if desired.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]
