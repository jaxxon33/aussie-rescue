import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vygrkolzzdjdmekrtlru.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5Z3Jrb2x6emRqZG1la3J0bHJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMzM5MDYsImV4cCI6MjA4NzcwOTkwNn0.aVqri9KoltBUcaMhYfmEt42pcxg4EwTRc5_JjhqPqG8'

export const supabase = createClient(supabaseUrl, supabaseKey)
