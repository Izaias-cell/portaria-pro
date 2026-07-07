import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const tempSupabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

export async function getProfileTableColumns(): Promise<string[]> {
  try {
    const { data, error } = await supabase.from('perfis').select('*').limit(1);
    if (!error && data && data.length > 0) {
      return Object.keys(data[0]);
    }
  } catch (e) {
    console.warn('Erro ao mapear colunas da tabela perfis:', e);
  }
  return [];
}

export function buildProfilePayload(raw: any, cols: string[]): any {
  if (!cols || cols.length === 0) {
    // Fallback minimal payload without condominio to avoid DB errors
    const notesVal = raw.observacoes || raw.notes || '';
    return {
      id: raw.id,
      nome: raw.nome || raw.name || '',
      email: raw.email || '',
      funcao: raw.funcao || raw.role || 'porteiro',
      active: raw.active !== false,
      telefone: raw.telefone || raw.phone || '',
      phone: raw.phone || raw.telefone || '',
      observacoes: notesVal,
      notes: notesVal
    };
  }

  const payload: any = {};
  for (const col of cols) {
    if (col === 'id') payload.id = raw.id;
    if (col === 'nome') payload.nome = raw.nome || raw.name || '';
    if (col === 'name') payload.name = raw.name || raw.nome || '';
    if (col === 'email') payload.email = raw.email || '';
    
    if (col === 'funcao') payload.funcao = raw.funcao || raw.role || 'porteiro';
    if (col === 'role') payload.role = raw.role || raw.funcao || 'porteiro';
    
    // We strictly use condominio_id only if it exists, and condominio is completely removed
    if (col === 'condominio_id') payload.condominio_id = raw.condominio_id || null;
    
    if (col === 'active') payload.active = raw.active !== false;
    if (col === 'ativo') payload.ativo = raw.active !== false;
    
    if (col === 'telefone') payload.telefone = raw.telefone || raw.phone || '';
    if (col === 'phone') payload.phone = raw.phone || raw.telefone || '';
    
    if (col === 'observacoes') payload.observacoes = raw.observacoes || raw.notes || '';
    if (col === 'notes') payload.notes = raw.notes || raw.observacoes || '';
    
    if (col === 'pin') payload.pin = raw.pin || '';
    if (col === 'password') payload.password = raw.password || raw.pin || '';
    if (col === 'senha') payload.senha = raw.senha || raw.pin || '';
  }
  return payload;
}

