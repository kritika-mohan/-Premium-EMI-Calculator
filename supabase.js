// supabase.js
// Replace these with your actual Supabase Project URL and Anon Key
const SUPABASE_URL = 'https://vtnhbitxbnjjznfqixil.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0bmhiaXR4Ym5qanpuZnFpeGlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwMzE4NjMsImV4cCI6MjA5NzYwNzg2M30.s4vFJYoGah1qGfF4SJW7apSmmfXiUjAo6anWPo-rqHU';

// We expose the client to the global window object so auth.js and script.js can use it
window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
