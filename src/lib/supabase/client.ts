import { createClient } from "@supabase/supabase-js";

// Supabase Environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://aacfpisskwwzryaknssj.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhY2ZwaXNza3d3enJ5YWtuc3NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ0MjMwNzcsImV4cCI6MjEwOTk5OTA3N30.xjPHs1Vpl9CwbWSI9Z5umHrLW6nHcwg52RocqVmC32A";

export const isSupabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
