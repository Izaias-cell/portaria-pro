import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(url, key);

async function testInsert() {
  console.log("Trying to insert into condominios...");
  const { data, error } = await supabase
    .from('condominios')
    .insert({ nome: 'BELLE VILLE' })
    .select();

  if (error) {
    console.error("Error inserting into condominios:", error);
  } else {
    console.log("Insert success! Data:", data);
  }
}

testInsert();
