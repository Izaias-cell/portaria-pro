import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL || '';
const key = process.env.VITE_SUPABASE_ANON_KEY || '';

console.log('=== DIAGNÓSTICO DE BANCO DE DADOS E SUPABASE ===');
console.log('1. URL do Supabase:', url);
const projectId = url.match(/https:\/\/([^.]+)\.supabase\.(co|net|in)/)?.[1] || 'Não identificado';
console.log('2. Project ID do Supabase:', projectId);
console.log('3. Chave Anon (mascarada):', key ? `${key.slice(0, 10)}...${key.slice(-8)}` : 'NÃO CONFIGURADA');
console.log('Chave Anon Comprimento:', key.length);

const supabase = createClient(url, key);

async function runDiagnostics() {
  console.log('4. Nome da tabela consultada:', 'condominios');
  console.log('5. Consulta REST/SQL executada:', `GET ${url}/rest/v1/condominios?select=*`);
  
  const { data: condos, error: condoError, status, statusText } = await supabase
    .from('condominios')
    .select('*');
    
  console.log('6. Status HTTP retornado:', status, statusText);
  if (condoError) {
    console.log('Erro retornado pela consulta:', condoError);
  } else {
    console.log('6. Resultado bruto retornado (JSON):', JSON.stringify(condos, null, 2));
  }
  
  // Also query perfis to compare behavior
  console.log('\n--- Consulta adicional na tabela "perfis" ---');
  const { data: profiles, error: profileError } = await supabase
    .from('perfis')
    .select('*');
  console.log('Resultado perfis bruto (JSON):', JSON.stringify(profiles, null, 2));
  if (profileError) console.error('Erro perfis:', profileError);
}

runDiagnostics();
