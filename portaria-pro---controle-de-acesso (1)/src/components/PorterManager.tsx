import React, { useState, useMemo } from 'react';
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
  ClipboardList
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { toast } from '../lib/toast';
import { Porteiro } from '../types';

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
  
  // Form State
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [role, setRole] = useState('Porteiro');
  const [active, setActive] = useState(true);
  const [porterCondo, setPorterCondo] = useState(condoName);
  const [notes, setNotes] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

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
    setPorterCondo(condoName);
    setNotes('');
    setPhone('');
    setEmail('');
    setEditingPorterId(null);
    setIsFormOpen(false);
  };

  const handleEditInit = (porter: Porteiro) => {
    setEditingPorterId(porter.id);
    setName(porter.name);
    setPin(porter.pin);
    setRole(porter.role);
    setActive(porter.active);
    setPorterCondo(porter.condoName);
    setNotes(porter.notes || '');
    setPhone(porter.phone || '');
    setEmail(porter.email || '');
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;

    const trimmedName = name.trim();
    const trimmedPin = pin.trim();

    if (!trimmedName) {
      toast.error('Preencha o Nome Completo.');
      return;
    }

    if (!/^\d{4}$|^\d{6}$/.test(trimmedPin)) {
      toast.error('PIN Inválido!', {
        description: 'O PIN deve conter exatamente 4 ou 6 caracteres numéricos.'
      });
      return;
    }

    // Check unique PIN among ALL active porteiros in that condo
    const duplicate = porteiros.find(
      p => p.pin === trimmedPin && 
           p.id !== editingPorterId && 
           p.condoName.toLowerCase() === porterCondo.toLowerCase() &&
           p.active
    );
    if (duplicate) {
      toast.error('PIN já está em uso!', {
        description: `Este PIN pertence ao usuário ativo ${duplicate.name} no condomínio ${duplicate.condoName}.`
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

    if (editingPorterId) {
      // Edit
      const updated = porteiros.map(p => {
        if (p.id === editingPorterId) {
          return {
            ...p,
            name: trimmedName,
            pin: trimmedPin,
            role,
            active,
            condoName: porterCondo,
            notes: notes.trim() || undefined,
            phone: phone.trim() || undefined,
            email: email.trim() || undefined
          };
        }
        return p;
      });
      onUpdatePorteiros(updated);
      
      // LOG AUDIT
      onRegisterLog(`Quem editou cadastro: ${activePorterName} editou o cadastro do usuário "${trimmedName}" (${role}).`);

      toast.success('Cadastro editado com sucesso!', {
        description: `Dados de ${trimmedName} foram devidamente atualizados.`
      });
    } else {
      // Create new
      const newPorter: Porteiro = {
        id: crypto.randomUUID(),
        name: trimmedName,
        pin: trimmedPin,
        role,
        active,
        condoName: porterCondo,
        notes: notes.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined
      };
      onUpdatePorteiros([...porteiros, newPorter]);

      // LOG AUDIT
      onRegisterLog(`Quem criou cadastro: ${activePorterName} criou o cadastro de usuário para "${trimmedName}" (${role}).`);

      toast.success('Usuário cadastrado com sucesso!', {
        description: `${trimmedName} agora tem acesso ao condomínio ${porterCondo}.`
      });
    }

    resetForm();
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
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: João da Silva Santos"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none uppercase placeholder:normal-case text-slate-805"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5">
                  PIN de Acesso (4 ou 6 dígitos) *
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ex: 1234"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold tracking-widest focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-805"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5">
                  Função / Cargo
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold tracking-normal uppercase focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-850"
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
                <div className="relative">
                  <Building className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={porterCondo}
                    onChange={(e) => setPorterCondo(e.target.value)}
                    placeholder="Nome do Condomínio"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black uppercase tracking-tight focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-805"
                  />
                </div>
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
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ex: (11) 99999-9999"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-805"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5">
                  E-mail (Opcional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ex: usuario@email.com"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-850"
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
                      checked={active === true}
                      onChange={() => setActive(true)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs font-black uppercase text-emerald-600">Ativo</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="active"
                      checked={active === false}
                      onChange={() => setActive(false)}
                      className="text-blue-600 focus:ring-blue-500"
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
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Escala, observações, etc."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-805"
                />
              </div>

              <div className="md:col-span-2 lg:col-span-3 flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2.5 bg-slate-100 text-slate-600 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-slate-180 transition-all flex items-center gap-1.5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-505 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-blue-100"
                >
                  <Save className="w-4 h-4" />
                  Salvar Usuário
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
                        PIN:
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
