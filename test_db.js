import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(url, key);

async function test() {
  const { data: profiles, error } = await supabase.from('perfis').select('*').limit(10);
  console.log('PERFIS LIMIT 10:', profiles, error);
}
test();
