import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShieldCheck, 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  Check, 
  AlertTriangle, 
  Building, 
  UserPlus, 
  Power, 
  Lock, 
  Unlock,
  ClipboardList,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { toast } from '../lib/toast';
import { Porteiro, Condominio } from '../types';
import { supabase, tempSupabase, getProfileTableColumns, buildProfilePayload } from '../lib/supabase';

interface PorterManagerProps {
  porteiros: Porteiro[];
  onUpdatePorteiros: (porteiros: Porteiro[]) => void;
  condoName: string;
  readOnly?: boolean;
  activePorterName: string;
  onRegisterLog: (action: string) => void;
}

export function PorterManager({
  porteiros,
  onUpdatePorteiros,
  condoName,
  readOnly = false,
  activePorterName,
  onRegisterLog
}: PorterManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPorterId, setEditingPorterId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  
  // Condominios list
  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [isLoadingCondos, setIsLoadingCondos] = useState(true);
  const [condoError, setCondoError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [role, setRole] = useState('Porteiro');
  const [active, setActive] = useState(true);
  const [porterCondo, setPorterCondo] = useState('');
  const [notes, setNotes] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Fetch condominios and find default
  useEffect(() => {
    let isMounted = true;
    async function fetchCondominios() {
      setIsLoadingCondos(true);
      setCondoError(null);
      try {
        console.log('Buscando condomínios do Supabase...');
        const { data, error } = await supabase
          .from('condominios')
          .select('id, nome');
        
        if (error) {
          console.error('Erro ao buscar condominios do Supabase no console:', error);
          if (isMounted) {
            setCondoError(error.message || JSON.stringify(error));
          }
          
          // Fallback to localStorage if available
          const saved = localStorage.getItem('portaria_condominios');
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              if (parsed && parsed.length > 0) {
                console.log('=== LOGS DE CARREGAMENTO DE CONDOMÍNIOS (PorterManager.tsx - LocalStorage Fallback) ===');
                console.log('Quantidade de condomínios retornados:', parsed.length);
                console.log('Objeto completo retornado pela consulta (Cache):', JSON.stringify(parsed, null, 2));
                parsed.forEach((c, idx) => {
                  console.log(`Condomínio [${idx}]: Nome = "${c.nome}", UUID = "${c.id}"`);
                });

                if (isMounted) {
                  setCondominios(parsed);
                  const matched = parsed.find(c => c.nome.toLowerCase() === condoName.toLowerCase());
                  setPorterCondo(matched ? matched.id : parsed[0].id);
                }
                return;
              }
            } catch (e) {}
          }
          
          // No cached data, use BELLE VILLE hardcoded fallback
          const fallback = [{ id: 'b34e2c05-bf73-45a1-968c-db505d97f1f9', nome: 'BELLE VILLE' }];
          console.log('=== LOGS DE CARREGAMENTO DE CONDOMÍNIOS (PorterManager.tsx - Error Fallback) ===');
          console.log('Quantidade de condomínios retornados:', fallback.length);
          console.log('Objeto completo retornado pela consulta (Fallback):', JSON.stringify(fallback, null, 2));
          fallback.forEach((c, idx) => {
            console.log(`Condomínio [${idx}]: Nome = "${c.nome}", UUID = "${c.id}"`);
          });

          if (isMounted) {
            setCondominios(fallback);
            setPorterCondo(fallback[0].id);
          }
        } else if (data && data.length > 0) {
          console.log('=== LOGS DE CARREGAMENTO DE CONDOMÍNIOS (PorterManager.tsx - Supabase) ===');
          console.log('Quantidade de condomínios retornados:', data.length);
          console.log('Objeto completo retornado pela consulta:', JSON.stringify(data, null, 2));
          data.forEach((c, idx) => {
            console.log(`Condomínio [${idx}]: Nome = "${c.nome}", UUID = "${c.id}"`);
          });

          if (isMounted) {
            setCondominios(data);
            localStorage.setItem('portaria_condominios', JSON.stringify(data));
            const matched = data.find(c => c.nome.toLowerCase() === condoName.toLowerCase());
            if (matched) {
              setPorterCondo(matched.id);
            } else {
              setPorterCondo(data[0].id);
            }
          }
        } else {
          // If query returned no rows, use BELLE VILLE hardcoded fallback as unique option
          console.log('Tabela condominios está vazia. Usando BELLE VILLE como opção padrão.');
          const fallback = [{ id: 'b34e2c05-bf73-45a1-968c-db505d97f1f9', nome: 'BELLE VILLE' }];
          console.log('=== LOGS DE CARREGAMENTO DE CONDOMÍNIOS (PorterManager.tsx - Empty Fallback) ===');
          console.log('Quantidade de condomínios retornados:', fallback.length);
          console.log('Objeto completo retornado pela consulta (Fallback):', JSON.stringify(fallback, null, 2));
          fallback.forEach((c, idx) => {
            console.log(`Condomínio [${idx}]: Nome = "${c.nome}", UUID = "${c.id}"`);
          });

          if (isMounted) {
            setCondominios(fallback);
            setPorterCondo(fallback[0].id);
          }
        }
      } catch (err: any) {
        console.error('Erro inesperado ao carregar condominios:', err);
        if (isMounted) {
          setCondoError(err.message || 'Erro inesperado de rede');
          const fallback = [{ id: 'b34e2c05-bf73-45a1-968c-db505d97f1f9', nome: 'BELLE VILLE' }];
          console.log('=== LOGS DE CARREGAMENTO DE CONDOMÍNIOS (PorterManager.tsx - Catch Fallback) ===');
          console.log('Quantidade de condomínios retornados:', fallback.length);
          console.log('Objeto completo retornado pela consulta (Fallback):', JSON.stringify(fallback, null, 2));
          fallback.forEach((c, idx) => {
            console.log(`Condomínio [${idx}]: Nome = "${c.nome}", UUID = "${c.id}"`);
          });

          setCondominios(fallback);
          setPorterCondo(fallback[0].id);
        }
      } finally {
        setIsLoadingCondos(false);
      }
    }
    fetchCondominios();
    return () => {
      isMounted = false;
    };
  }, [condoName]);

  // Show/Hide PIN toggle state per porter
  const [revealedPins, setRevealedPins] = useState<Record<string, boolean>>({});

  const togglePinReveal = (id: string) => {
    setRevealedPins(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const resetForm = () => {
    setName('');
    setPin('');
    setRole('Porteiro');
    setActive(true);
    const matched = condominios.find(c => c.nome.toLowerCase() === condoName.toLowerCase());
    setPorterCondo(matched ? matched.id : (condominios[0]?.id || 'b34e2c05-bf73-45a1-968c-db505d97f1f9'));
    setNotes('');
    setPhone('');
    setEmail('');
    setEditingPorterId(null);
    setIsFormOpen(false);
    setSaveError(null);
    setSaveSuccess(null);
    setIsSaving(false);
  };

  const handleEditInit = (porter: Porteiro) => {
    setEditingPorterId(porter.id);
    setName(porter.name);
    setPin(porter.pin);
    setRole(porter.role);
    setActive(porter.active);
    
    // Resolve matching condo UUID if porter.condominio_id is not set but condoName is
    let selectedCondoId = porter.condominio_id || '';
    if (!selectedCondoId && porter.condoName) {
      const matched = condominios.find(c => c.nome.toLowerCase() === porter.condoName.toLowerCase());
      if (matched) {
        selectedCondoId = matched.id;
      }
    }
    if (!selectedCondoId && condominios.length > 0) {
      selectedCondoId = condominios[0].id;
    }
    setPorterCondo(selectedCondoId || 'b34e2c05-bf73-45a1-968c-db505d97f1f9');

    setNotes(porter.notes || '');
    setPhone(porter.phone || '');
    setEmail(porter.email || '');
    setSaveError(null);
    setSaveSuccess(null);
    setIsFormOpen(true);
  };

  const isUserAdmin = (p: Porteiro) => {
    const r = p.role.toLowerCase();
    return r === 'administrador' || r.includes('admin') || r.includes('supervisor') || r.includes('geral');
  };

  const isUserSindico = (p: Porteiro) => {
    const r = p.role.toLowerCase();
    return r === 'síndico' || r === 'sindico' || r.includes('sindico') || r.includes('síndico');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    setSaveError(null);

    const trimmedName = name.trim();
    const trimmedPin = pin.trim();
    const trimmedEmail = email.trim();

    // 1. Validations
    if (!trimmedName) {
      toast.error('Preencha o Nome Completo.');
      return;
    }

    if (!trimmedEmail) {
      toast.error('Preencha o E-mail de Acesso.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      toast.error('E-mail inválido.', {
        description: 'Por favor, insira um e-mail com formato válido.'
      });
      return;
    }

    if (trimmedPin.length < 6) {
      toast.error('Senha muito curta!', {
        description: 'A senha deve conter pelo menos 6 caracteres.'
      });
      return;
    }

    if (!role) {
      toast.error('Selecione uma função.');
      return;
    }

    // Check unique email among ALL users
    const duplicateEmail = porteiros.find(
      p => p.email && p.email.toLowerCase() === trimmedEmail.toLowerCase() && p.id !== editingPorterId
    );
    if (duplicateEmail) {
      toast.error('E-mail já cadastrado!', {
        description: `Este e-mail de acesso já pertence ao usuário ${duplicateEmail.name}.`
      });
      return;
    }

    // If we are editing and deactivating/suspending:
    if (editingPorterId && !active) {
      const originalPorter = porteiros.find(p => p.id === editingPorterId);
      if (originalPorter && originalPorter.active) {
        if (isUserAdmin(originalPorter)) {
          const activeAdminsCount = porteiros.filter(p => p.active && isUserAdmin(p)).length;
          if (activeAdminsCount <= 1) {
            toast.error('Ação não permitida!', {
              description: 'Não é possível suspender o único Administrador ativo no sistema. Cadastre outro Administrador ativo primeiro.'
            });
            return;
          }
        }
        if (isUserSindico(originalPorter)) {
          const activeSindicosCount = porteiros.filter(p => p.active && isUserSindico(p)).length;
          if (activeSindicosCount <= 1) {
            toast.error('Ação não permitida!', {
              description: 'Não é possível suspender o único Síndico ativo no sistema. Cadastre outro Síndico ativo primeiro.'
            });
            return;
          }
        }
      }
    }

    setIsSaving(true);

    try {
      let funcaoDb = 'porteiro';
      const roleLower = role.toLowerCase();
      if (roleLower.includes('admin') || roleLower.includes('supervisor') || roleLower.includes('geral')) {
        funcaoDb = 'admin';
      } else if (roleLower.includes('sindico') || roleLower.includes('síndico')) {
        funcaoDb = 'sindico';
      }

      // Use the local state condominios directly as requested
      const activeCondos = condominios && condominios.length > 0
        ? condominios
        : [{ id: 'b34e2c05-bf73-45a1-968c-db505d97f1f9', nome: 'BELLE VILLE' }];

      let finalCondoId = porterCondo;
      let matchedCondo = activeCondos.find(c => c.id === finalCondoId);

      // If not matched, try finding by name (e.g. condoName or the matched name)
      if (!matchedCondo && condoName) {
        matchedCondo = activeCondos.find(c => c.nome.toLowerCase() === condoName.toLowerCase());
        if (matchedCondo) {
          finalCondoId = matchedCondo.id;
        }
      }

      // If still not matched, use the first condominium in the local state
      if (!matchedCondo && activeCondos.length > 0) {
        matchedCondo = activeCondos[0];
        finalCondoId = matchedCondo.id;
      }

      // Fallback to BELLE VILLE if still not matched
      if (!matchedCondo) {
        matchedCondo = { id: 'b34e2c05-bf73-45a1-968c-db505d97f1f9', nome: 'BELLE VILLE' };
        finalCondoId = matchedCondo.id;
      }

      const selectedCondoName = matchedCondo.nome;
      const selectedCondoUuid = matchedCondo.id;

      // Ensure condominio_id is strictly a valid UUID, not a string name or empty
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(selectedCondoUuid);
      if (!isUuid) {
        throw new Error(`O valor "${selectedCondoUuid}" não é um UUID de condomínio válido. Deve ser exclusivamente o UUID de 'condominios'.`);
      }

      // Logs as requested in requirement 3
      console.log('=== LOGS DE VALIDAÇÃO DE CONDOMÍNIO (PorterManager) ===');
      console.log('Condomínio selecionado (nome):', selectedCondoName);
      console.log('UUID correspondente:', selectedCondoUuid);

      // Map columns dynamically to avoid errors on extra/missing columns
      const cols = await getProfileTableColumns();
      console.log('PorterManager: Colunas reais detectadas em perfis para filtragem:', cols);

      const buildFilteredPayload = (rawPayload: any) => {
        if (!cols || cols.length === 0) {
          const fallback: any = {
            id: rawPayload.id,
            nome: rawPayload.nome,
            email: rawPayload.email,
            telefone: rawPayload.telefone,
            funcao: rawPayload.funcao,
            condominio_id: selectedCondoUuid
          };
          if (rawPayload.ativo !== undefined) fallback.ativo = rawPayload.ativo;
          if (rawPayload.active !== undefined) fallback.active = rawPayload.active;
          return fallback;
        }

        const payload: any = {};
        for (const col of cols) {
          if (col === 'id' && rawPayload.id !== undefined) payload.id = rawPayload.id;
          if (col === 'nome' && rawPayload.nome !== undefined) payload.nome = rawPayload.nome;
          if (col === 'name' && rawPayload.nome !== undefined) payload.name = rawPayload.nome;
          if (col === 'email' && rawPayload.email !== undefined) payload.email = rawPayload.email;
          if (col === 'funcao' && rawPayload.funcao !== undefined) payload.funcao = rawPayload.funcao;
          if (col === 'role' && rawPayload.funcao !== undefined) payload.role = rawPayload.funcao;
          if (col === 'telefone' && rawPayload.telefone !== undefined) payload.telefone = rawPayload.telefone;
          if (col === 'phone' && rawPayload.telefone !== undefined) payload.phone = rawPayload.telefone;
          if (col === 'ativo' && rawPayload.ativo !== undefined) payload.ativo = rawPayload.ativo;
          if (col === 'active' && rawPayload.active !== undefined) payload.active = rawPayload.active;
          if (col === 'condominio_id') payload.condominio_id = selectedCondoUuid;
          if (col === 'condominio' && rawPayload.condominio !== undefined) payload.condominio = rawPayload.condominio;
        }
        return payload;
      };

      if (editingPorterId) {
        // --- EDITING EXISTING USER ---
        const rawUpdatePayload: any = {
          nome: trimmedName,
          telefone: phone.trim() || '',
          funcao: funcaoDb,
          ativo: active !== false,
          active: active !== false,
          condominio_id: selectedCondoUuid,
          condominio: selectedCondoName
        };

        if (trimmedEmail) {
          rawUpdatePayload.email = trimmedEmail;
        }

        const updatePayload = buildFilteredPayload(rawUpdatePayload);

        // Required Logging before update on perfis
        console.log('=== LOGS EXIGIDOS ANTES DO UPDATE NA TABELA PERFIS ===');
        console.log('1. Objeto completo enviado ao update:', JSON.stringify(updatePayload, null, 2));
        console.log('2. Valor exato de condominio_id:', updatePayload.condominio_id);
        console.log('3. Tipo do valor (string, object, undefined, null):', typeof updatePayload.condominio_id);
        
        const dbBelleVilleUpdate = condominios.find(c => c.nome.toUpperCase() === 'BELLE VILLE');
        const dbBelleVilleUuidUpdate = dbBelleVilleUpdate ? dbBelleVilleUpdate.id : null;
        console.log('4. UUID existente na tabela condominios correspondente ao BELLE VILLE:', dbBelleVilleUuidUpdate);
        
        const comparisonResultUpdate = updatePayload.condominio_id === dbBelleVilleUuidUpdate;
        console.log('5. Resultado da comparação entre o UUID enviado e o UUID existente:', comparisonResultUpdate);
        
        if (!comparisonResultUpdate) {
          console.log('=== DETALHES DA DIFERENÇA (UPDATE) ===');
          console.log(`Diferença detectada! O valor enviado para condominio_id é "${updatePayload.condominio_id}", mas o UUID correspondente ao BELLE VILLE existente na tabela de condomínios retornada pelo banco é "${dbBelleVilleUuidUpdate}".`);
          if (dbBelleVilleUuidUpdate === null) {
            console.log('Causa raiz provável: A tabela "condominios" no banco de dados está completamente vazia (0 linhas). Portanto, não existe nenhum UUID correspondente a "BELLE VILLE" registrado em "condominios", violando a chave estrangeira (foreign key) ao inserir/atualizar perfis.');
          }
        }
        console.log('======================================================');

        const { error: profileError } = await supabase
          .from('perfis')
          .update(updatePayload)
          .eq('id', editingPorterId);

        if (profileError) {
          throw new Error(`Erro ao atualizar perfil no banco de dados: ${profileError.message}`);
        }

        const updated = porteiros.map(p => {
          if (p.id === editingPorterId) {
            return {
              ...p,
              name: trimmedName,
              pin: trimmedPin,
              role,
              active,
              condoName: selectedCondoName,
              notes: notes.trim() || undefined,
              phone: phone.trim() || undefined,
              email: trimmedEmail,
              condominio_id: selectedCondoUuid
            };
          }
          return p;
        });
        
        onUpdatePorteiros(updated);
        
        // LOG AUDIT
        onRegisterLog(`Quem editou cadastro: ${activePorterName} editou o cadastro do usuário "${trimmedName}" (${role}).`);

        setSaveSuccess('Cadastro atualizado com sucesso!');
        toast.success('Cadastro editado com sucesso!', {
          description: `Dados de ${trimmedName} foram devidamente atualizados.`
        });
        
        // Reset fields but keep success state visible
        setName('');
        setPin('');
        setRole('Porteiro');
        setActive(true);
        setNotes('');
        setPhone('');
        setEmail('');
        setEditingPorterId(null);
        setSaveError(null);
      } else {
        // --- CREATING NEW USER ---
        let authUserId = '';

        // 1. Verificar se o e-mail já existe na tabela de perfis (Supabase) antes de tentar criar no Auth
        console.log('Verificando se o e-mail já está cadastrado na tabela perfis no PorterManager...', trimmedEmail);
        const { data: existingProfileByEmail, error: searchError } = await supabase
          .from('perfis')
          .select('id, email, nome')
          .eq('email', trimmedEmail)
          .maybeSingle();

        if (searchError) {
          console.error('Erro ao verificar e-mail existente na tabela perfis:', searchError);
        }

        if (existingProfileByEmail) {
          console.warn('O e-mail já existe na tabela perfis no PorterManager:', existingProfileByEmail);
          throw new Error(`Este e-mail (${trimmedEmail}) já está cadastrado no sistema para o usuário "${existingProfileByEmail.nome}".`);
        }

        // Register in Supabase Auth directly using tempSupabase client
        console.log('Iniciando fluxo de criação de usuário no Supabase Auth para o email:', trimmedEmail);
        const signUpResult = await tempSupabase.auth.signUp({
          email: trimmedEmail,
          password: trimmedPin
        });

        const { data: signUpData, error: signUpError } = signUpResult;

        console.log('Retorno de auth.signUp() no PorterManager:', {
          hasData: !!signUpData,
          hasUser: !!signUpData?.user,
          userId: signUpData?.user?.id || null,
          error: signUpError ? {
            message: signUpError.message,
            status: signUpError.status,
            name: signUpError.name
          } : null
        });

        if (signUpError) {
          console.error('Erro retornado pelo Supabase Auth.signUp():', signUpError);
          let userFriendlyMessage = `Erro ao cadastrar usuário no Supabase Auth: ${signUpError.message}`;
          
          if (signUpError.message?.toLowerCase().includes('rate limit') || signUpError.status === 429) {
            userFriendlyMessage = 'O cadastro não pôde ser realizado porque o Supabase bloqueou temporariamente novas criações de usuários devido ao limite de taxa (rate limit). Por favor, aguarde alguns minutos e tente novamente.';
          }
          
          throw new Error(userFriendlyMessage);
        }

        if (!signUpData.user || !signUpData.user.id) {
          console.error('Nenhum usuário ou ID de usuário retornado pelo Auth no PorterManager:', signUpData);
          throw new Error('Falha ao obter o ID do usuário do Supabase Auth. A criação do perfil não será realizada para evitar inconsistências no banco de dados.');
        }

        authUserId = signUpData.user.id;
        console.log('user.id recebido com sucesso do Auth no PorterManager:', authUserId);

        // 2. Insert the profile in the perfis table using the registered user's ID
        const rawInsertPayload = {
          id: authUserId,
          nome: trimmedName,
          email: trimmedEmail,
          telefone: phone.trim() || '',
          funcao: funcaoDb,
          ativo: true,
          active: true, // as requested: "active: true" and "ativo: true"
          condominio_id: selectedCondoUuid,
          condominio: selectedCondoName
        };

        const insertPayload = buildFilteredPayload(rawInsertPayload);

        // Required Logging before insert on perfis
        console.log('=== LOGS EXIGIDOS ANTES DO INSERT NA TABELA PERFIS ===');
        console.log('1. Objeto completo enviado ao insert:', JSON.stringify(insertPayload, null, 2));
        console.log('2. Valor exato de condominio_id:', insertPayload.condominio_id);
        console.log('3. Tipo do valor (string, object, undefined, null):', typeof insertPayload.condominio_id);
        
        const dbBelleVilleInsert = condominios.find(c => c.nome.toUpperCase() === 'BELLE VILLE');
        const dbBelleVilleUuidInsert = dbBelleVilleInsert ? dbBelleVilleInsert.id : null;
        console.log('4. UUID existente na tabela condominios correspondente ao BELLE VILLE:', dbBelleVilleUuidInsert);
        
        const comparisonResultInsert = insertPayload.condominio_id === dbBelleVilleUuidInsert;
        console.log('5. Resultado da comparação entre o UUID enviado e o UUID existente:', comparisonResultInsert);
        
        if (!comparisonResultInsert) {
          console.log('=== DETALHES DA DIFERENÇA (INSERT) ===');
          console.log(`Diferença detectada! O valor enviado para condominio_id é "${insertPayload.condominio_id}", mas o UUID correspondente ao BELLE VILLE existente na tabela de condomínios retornada pelo banco é "${dbBelleVilleUuidInsert}".`);
          if (dbBelleVilleUuidInsert === null) {
            console.log('Causa raiz provável: A tabela "condominios" no banco de dados está completamente vazia (0 linhas). Portanto, não existe nenhum UUID correspondente a "BELLE VILLE" registrado em "condominios", violando a chave estrangeira (foreign key) ao inserir/atualizar perfis.');
          }
        }
        console.log('======================================================');

        const { error: profileError } = await supabase
          .from('perfis')
          .insert(insertPayload);

        if (profileError) {
          console.error('ERRO DETALHADO NO FLUXO DE CRIAÇÃO DE USUÁRIOS (TABELA PERFIS):', {
            authUserId,
            insertPayload,
            errorMessage: profileError.message,
            errorDetails: profileError
          });
          throw new Error(`O usuário foi criado no Supabase Authentication (Auth) com ID ${authUserId}, mas a criação de seu perfil associado na tabela 'perfis' não pôde ser concluída: ${profileError.message}`);
        }

        console.log('Perfil associado criado com sucesso na tabela perfis para o usuário:', authUserId);

        // 3. Add to local list and notify parent with the real auth ID
        const newPorter: Porteiro = {
          id: authUserId, // Store the actual Supabase Auth UID!
          name: trimmedName,
          pin: trimmedPin,
          role,
          active: true,
          condoName: selectedCondoName,
          notes: notes.trim() || undefined,
          phone: phone.trim() || undefined,
          email: trimmedEmail,
          condominio_id: selectedCondoUuid
        };

        onUpdatePorteiros([...porteiros, newPorter]);

        // LOG AUDIT
        onRegisterLog(`Quem criou cadastro: ${activePorterName} criou o cadastro de usuário para "${trimmedName}" (${role}).`);

        setSaveSuccess('Usuário cadastrado com sucesso!');
        toast.success('Usuário cadastrado com sucesso!', {
          description: `${trimmedName} agora tem acesso ao condomínio ${selectedCondoName}.`
        });

        // Clear input fields but keep success state visible
        setName('');
        setPin('');
        setRole('Porteiro');
        setActive(true);
        setNotes('');
        setPhone('');
        setEmail('');
        setEditingPorterId(null);
        setSaveError(null);
      }
    } catch (err: any) {
      console.error('Erro ao salvar usuário:', err);
      const msg = err.message || 'Erro inesperado ao salvar os dados.';
      setSaveError(msg);
      toast.error('Erro ao salvar usuário', {
        description: msg
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: string, porterName: string) => {
    if (readOnly) return;
    
    const porterToDelete = porteiros.find(p => p.id === id);
    if (!porterToDelete) return;

    if (isUserAdmin(porterToDelete)) {
      const activeAdminsCount = porteiros.filter(p => p.active && isUserAdmin(p)).length;
      if (porterToDelete.active && activeAdminsCount <= 1) {
        toast.error('Ação não permitida!', {
          description: 'Não é possível excluir o único Administrador ativo no sistema. Cadastre outro Administrador ativo primeiro.'
        });
        return;
      }
    }

    if (isUserSindico(porterToDelete)) {
      const activeSindicosCount = porteiros.filter(p => p.active && isUserSindico(p)).length;
      if (porterToDelete.active && activeSindicosCount <= 1) {
        toast.error('Ação não permitida!', {
          description: 'Não é possível excluir o único Síndico ativo no sistema. Cadastre outro Síndico ativo primeiro.'
        });
        return;
      }
    }

    if (confirm(`Deseja realmente remover o cadastro de ${porterName}?`)) {
      const filtered = porteiros.filter(p => p.id !== id);
      onUpdatePorteiros(filtered);

      // LOG AUDIT
      onRegisterLog(`Quem excluiu cadastro: ${activePorterName} excluiu o cadastro do usuário "${porterName}".`);

      toast.success('Usuário removido com sucesso!', {
        description: `O cadastro do usuário ${porterName} foi excluído permanentemente.`
      });
    }
  };

  const toggleStatus = (id: string, currentActive: boolean, porterName: string) => {
    if (readOnly) return;

    const porterToToggle = porteiros.find(p => p.id === id);
    if (!porterToToggle) return;

    if (currentActive) {
      if (isUserAdmin(porterToToggle)) {
        const activeAdminsCount = porteiros.filter(p => p.active && isUserAdmin(p)).length;
        if (activeAdminsCount <= 1) {
          toast.error('Ação não permitida!', {
            description: 'Não é possível suspender o único Administrador ativo no sistema. Cadastre outro Administrador ativo primeiro.'
          });
          return;
        }
      }

      if (isUserSindico(porterToToggle)) {
        const activeSindicosCount = porteiros.filter(p => p.active && isUserSindico(p)).length;
        if (activeSindicosCount <= 1) {
          toast.error('Ação não permitida!', {
            description: 'Não é possível suspender o único Síndico ativo no sistema. Cadastre outro Síndico ativo primeiro.'
          });
          return;
        }
      }
    }

    const updated = porteiros.map(p => {
      if (p.id === id) {
        return { ...p, active: !currentActive };
      }
      return p;
    });
    onUpdatePorteiros(updated);

    const newStatusText = !currentActive ? 'ATIVADO' : 'SUSPENSO';
    
    // LOG AUDIT
    onRegisterLog(`Quem editou cadastro: ${activePorterName} alterou status do usuário "${porterName}" para ${newStatusText}.`);

    toast.success(`Usuário ${!currentActive ? 'Reativado' : 'Suspenso'}!`, {
      description: `O acesso de ${porterName} está agora ${!currentActive ? 'ativo' : 'suspenso'}.`
    });
  };

  const filteredPorters = useMemo(() => {
    return porteiros.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.condoName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [porteiros, searchTerm]);

  return (
    <div className="space-y-6 leading-normal">
      {/* Search and register action bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-slate-105 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar por nome ou condomínio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500/20 outline-none"
          />
        </div>

        {!readOnly && (
          <button
            onClick={() => {
              if (isFormOpen) resetForm();
              else setIsFormOpen(true);
            }}
            className={cn(
              "px-4 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2",
              isFormOpen 
                ? "bg-slate-150 text-slate-600 hover:bg-slate-200" 
                : "bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-100"
            )}
          >
            {isFormOpen ? <X className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            {isFormOpen ? 'Cancelar' : 'Cadastrar Usuário'}
          </button>
        )}
      </div>

      <AnimatePresence>
        {isFormOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm overflow-hidden"
          >
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-4 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-500" />
              {editingPorterId ? 'Editar Cadastro de Usuário' : 'Novo Cadastro de Usuário'}
            </h3>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  disabled={isSaving}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: João da Silva Santos"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none uppercase placeholder:normal-case text-slate-805 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5">
                  Senha de Acesso *
                </label>
                <input
                  type="text"
                  required
                  maxLength={32}
                  disabled={isSaving}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold tracking-widest focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-805 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5">
                  Função / Cargo
                </label>
                <select
                  disabled={isSaving}
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold tracking-normal uppercase focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-850 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="Porteiro">Porteiro</option>
                  <option value="Síndico">Síndico</option>
                  <option value="Administrador">Administrador</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5">
                  Condomínio Vinculado *
                </label>
                <div className="relative font-semibold">
                  <Building className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 z-10" />
                  <select
                    required
                    disabled={isSaving || isLoadingCondos}
                    value={porterCondo}
                    onChange={(e) => setPorterCondo(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold tracking-normal uppercase focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-850 disabled:opacity-60 disabled:cursor-not-allowed appearance-none"
                  >
                    {isLoadingCondos ? (
                      <option value="">Carregando condomínios...</option>
                    ) : condominios.length === 0 ? (
                      <option value="">Nenhum condomínio encontrado</option>
                    ) : (
                      condominios.map((condominio) => (
                        <option key={condominio.id} value={condominio.id}>
                          {condominio.nome}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                {condoError && (
                  <p className="text-[10px] text-red-500 mt-1 font-bold">
                    Aviso: {condoError}. Usando fallback local.
                  </p>
                )}
                <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 leading-none tracking-wider">
                  * Garante restrição de acesso por condomínio.
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5">
                  Telefone (Opcional)
                </label>
                <input
                  type="text"
                  disabled={isSaving}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ex: (11) 99999-9999"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-805 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5">
                  E-mail *
                </label>
                <input
                  type="email"
                  required
                  disabled={isSaving}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ex: usuario@email.com"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-850 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5">
                  Status Inicial
                </label>
                <div className="flex items-center gap-4 py-1.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="active"
                      disabled={isSaving}
                      checked={active === true}
                      onChange={() => setActive(true)}
                      className="text-blue-600 focus:ring-blue-500 disabled:opacity-60"
                    />
                    <span className="text-xs font-black uppercase text-emerald-600">Ativo</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="active"
                      disabled={isSaving}
                      checked={active === false}
                      onChange={() => setActive(false)}
                      className="text-blue-600 focus:ring-blue-500 disabled:opacity-60"
                    />
                    <span className="text-xs font-black uppercase text-slate-400">Suspenso</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5">
                  Observações (Opcional)
                </label>
                <input
                  type="text"
                  disabled={isSaving}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Escala, observações, etc."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-805 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              {saveError && (
                <div className="md:col-span-2 lg:col-span-3 bg-red-50 border border-red-200 text-red-600 text-xs font-semibold px-4 py-3 rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4.5 h-4.5 text-red-500 shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}

              {saveSuccess && (
                <div className="md:col-span-2 lg:col-span-3 bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs font-semibold px-4 py-3 rounded-xl flex items-center gap-2">
                  <Check className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
                  <span>{saveSuccess}</span>
                </div>
              )}

              <div className="md:col-span-2 lg:col-span-3 flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={resetForm}
                  className="px-4 py-2.5 bg-slate-100 text-slate-600 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-slate-180 transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-505 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-blue-100 disabled:bg-blue-400 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {isSaving ? 'Salvando usuário...' : 'Salvar Usuário'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid of Profiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPorters.length === 0 ? (
          <div className="col-span-full bg-white p-12 rounded-3xl border border-slate-100 shadow-sm text-center space-y-3">
            <ClipboardList className="w-12 h-12 text-slate-300 mx-auto" />
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Nenhum Usuário Encontrado</h4>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Experimente ajustar o termo de pesquisa ou adicione um novo cadastro utilizando o botão acima.
            </p>
          </div>
        ) : (
          filteredPorters.map((porter) => {
            const pinRevealed = !!revealedPins[porter.id];
            const isLocalCondo = porter.condoName.toLowerCase() === condoName.toLowerCase();
            
            return (
              <div 
                key={porter.id}
                className={cn(
                  "bg-white border p-5 rounded-[2rem] shadow-sm relative overflow-hidden transition-all duration-200 flex flex-col justify-between min-h-[190px]",
                  porter.active 
                    ? (isLocalCondo ? "border-slate-100 hover:border-slate-200/80 hover:shadow-md" : "border-amber-100 bg-amber-50/10") 
                    : "border-slate-100 opacity-60 bg-slate-50/50"
                )}
              >
                {/* Visual Status Indicator line */}
                <div className={cn(
                  "absolute top-0 left-0 right-0 h-1.5",
                  porter.active ? (isLocalCondo ? "bg-blue-500" : "bg-amber-400 animate-pulse") : "bg-slate-350"
                )} />

                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="text-sm font-black uppercase text-slate-800 truncate leading-tight select-all pr-4" title={porter.name}>
                        {porter.name}
                      </h4>
                      <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mt-0.5 leading-none">
                        {porter.role}
                      </p>
                    </div>
                    {porter.active ? (
                      <span className="bg-emerald-50 text-emerald-700 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border border-emerald-100">
                        Ativo
                      </span>
                    ) : (
                      <span className="bg-rose-50 text-rose-700 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border border-rose-100">
                        Suspenso
                      </span>
                    )}
                  </div>

                  {/* Condo info */}
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase mt-1">
                    <Building className={cn("w-3.5 h-3.5 shrink-0", isLocalCondo ? "text-slate-400" : "text-amber-500")} />
                    <span className={cn("truncate", !isLocalCondo && "text-amber-700 font-extrabold")}>
                      {porter.condoName}
                    </span>
                    {!isLocalCondo && (
                      <span className="text-[9px] bg-amber-100 text-amber-800 px-1 py-0.1 rounded border border-amber-200 shrink-0 select-none" title="Este PIN não funcionará no condomínio atual">
                        Externo
                      </span>
                    )}
                  </div>

                  {/* Phone & Email info box if present */}
                  {(porter.phone || porter.email) && (
                    <div className="mt-2 space-y-1 bg-slate-50/50 p-2 rounded-xl border border-slate-100/50 text-[10px] text-slate-600 font-bold uppercase leading-normal">
                      {porter.phone && (
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-slate-400">TEL:</span>
                          <span className="truncate select-all">{porter.phone}</span>
                        </div>
                      )}
                      {porter.email && (
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-slate-400">EMAIL:</span>
                          <span className="truncate select-all text-[9.5px] font-semibold tracking-tight leading-none lowercase">{porter.email}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* PIN Display */}
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-2 flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                        SENHA:
                      </span>
                      <span className="text-xs font-mono font-black tracking-widest text-slate-700">
                        {pinRevealed ? porter.pin : '••••'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => togglePinReveal(porter.id)}
                      className="text-[9px] font-black uppercase text-slate-400 hover:text-slate-600 px-2 py-1 bg-white border border-slate-200 rounded shadow-sm hover:shadow-inner"
                    >
                      {pinRevealed ? 'Ocultar' : 'Revelar'}
                    </button>
                  </div>

                  {porter.notes && (
                    <p className="text-[10px] text-slate-400 font-semibold italic truncate mt-2">
                      "{porter.notes}"
                    </p>
                  )}
                </div>

                {/* Operations */}
                {!readOnly && (
                  <div className="flex gap-1 justify-end border-t border-slate-100 pt-3 mt-4">
                    <button
                      onClick={() => toggleStatus(porter.id, porter.active, porter.name)}
                      className={cn(
                        "p-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all active:scale-95",
                        porter.active
                          ? "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                          : "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100"
                      )}
                      title={porter.active ? "Suspender Usuário" : "Reativar Usuário"}
                    >
                      <Power className="w-3.5 h-3.5" />
                      {porter.active ? 'Suspender' : 'Reativar'}
                    </button>

                    <button
                      onClick={() => handleEditInit(porter)}
                      className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg transition-all active:scale-95 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider"
                      title="Editar dados"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Editar
                    </button>

                    <button
                      onClick={() => handleDelete(porter.id, porter.name)}
                      className="p-1.5 bg-red-50 hover:bg-red-100 text-red-650 border border-red-100 rounded-lg transition-all active:scale-95 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider"
                      title="Excluir cadastro"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Excluir
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
