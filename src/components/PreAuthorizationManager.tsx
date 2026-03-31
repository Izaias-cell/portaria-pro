import React, { useState, useMemo } from 'react';
import { PreAuthorization, AccessType, DeliverySubtype, PreAuthStatus, UnitRules } from '../types';
import { Search, Plus, Edit2, Trash2, Check, X, Calendar, MapPin, User, Package, Wrench, Clock, AlertCircle, MessageSquare, AlertTriangle, Info, Car } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { format, isAfter, isBefore } from 'date-fns';

interface PreAuthorizationManagerProps {
  preAuths: PreAuthorization[];
  unitRules: UnitRules[];
  onUpdate: (preAuths: PreAuthorization[]) => void;
}

export function PreAuthorizationManager({ preAuths, unitRules, onUpdate }: PreAuthorizationManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<PreAuthStatus | 'all'>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPreAuth, setEditingPreAuth] = useState<PreAuthorization | null>(null);

  const processedPreAuths = useMemo(() => {
    return preAuths.map(p => {
      if (p.status === 'autorizada' && isBefore(new Date(p.validity), new Date())) {
        return { ...p, status: 'expirada' as PreAuthStatus };
      }
      return p;
    });
  }, [preAuths]);

  const filteredPreAuths = useMemo(() => {
    return processedPreAuths.filter(p => {
      const matchesSearch = 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.unit.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.plate?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = filterStatus === 'all' || p.status === filterStatus;
      
      return matchesSearch && matchesFilter;
    });
  }, [processedPreAuths, searchTerm, filterStatus]);

  const handleAdd = () => {
    setEditingPreAuth(null);
    setIsFormOpen(true);
  };

  const handleEdit = (preAuth: PreAuthorization) => {
    setEditingPreAuth(preAuth);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja remover esta pré-autorização?')) {
      onUpdate(preAuths.filter(p => p.id !== id));
    }
  };

  const handleSave = (data: Partial<PreAuthorization>) => {
    if (editingPreAuth) {
      onUpdate(preAuths.map(p => 
        p.id === editingPreAuth.id 
          ? { ...p, ...data, updatedAt: new Date() } as PreAuthorization 
          : p
      ));
    } else {
      const newPreAuth: PreAuthorization = {
        id: crypto.randomUUID(),
        unit: data.unit!,
        type: data.type!,
        deliverySubtype: data.deliverySubtype,
        name: data.name!,
        plate: data.plate,
        observation: data.observation,
        validity: data.validity!,
        status: 'autorizada',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      onUpdate([newPreAuth, ...preAuths]);
    }
    setIsFormOpen(false);
  };

  const getStatusColor = (status: PreAuthStatus) => {
    switch (status) {
      case 'pendente': return 'bg-slate-100 text-slate-600';
      case 'pendente_confirmacao': return 'bg-amber-50 text-amber-600 border border-amber-200';
      case 'autorizada': return 'bg-emerald-50 text-emerald-600';
      case 'utilizada': return 'bg-blue-50 text-blue-600';
      case 'expirada': return 'bg-red-50 text-red-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const getStatusLabel = (status: PreAuthStatus) => {
    switch (status) {
      case 'pendente': return 'Pendente';
      case 'pendente_confirmacao': return 'Pendente Confirmação';
      case 'autorizada': return 'Autorizada';
      case 'utilizada': return 'Utilizada';
      case 'expirada': return 'Expirada';
      default: return status;
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Pré-Autorização</h2>
        <button
          onClick={handleAdd}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-blue-200 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          NOVA PRÉ-AUTORIZAÇÃO
        </button>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="relative group">
          <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          <input
            type="text"
            placeholder="Pesquisar por nome, placa ou casa..."
            className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {['all', 'pendente', 'pendente_confirmacao', 'autorizada', 'utilizada', 'expirada'].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s as any)}
              className={cn(
                "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border-2 shrink-0",
                filterStatus === s 
                  ? "bg-slate-900 text-white border-slate-900" 
                  : "bg-white text-slate-400 border-slate-100 hover:border-slate-200"
              )}
            >
              {s === 'all' ? 'Todas' : getStatusLabel(s as PreAuthStatus)}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filteredPreAuths.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-10" />
            <p className="text-sm font-bold">Nenhuma pré-autorização encontrada.</p>
          </div>
        ) : (
          filteredPreAuths.map((preAuth) => {
            const rules = unitRules.find(r => r.unit === preAuth.unit);
            return (
              <div
                key={preAuth.id}
                className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col gap-3 transition-all hover:shadow-md"
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "p-3 rounded-xl shrink-0",
                    preAuth.type === 'visitor' ? "bg-emerald-50 text-emerald-600" :
                    preAuth.type === 'delivery' ? "bg-orange-50 text-orange-600" :
                    "bg-blue-50 text-blue-600"
                  )}>
                    {preAuth.type === 'visitor' ? <User className="w-6 h-6" /> :
                     preAuth.type === 'delivery' ? <Package className="w-6 h-6" /> :
                     <Wrench className="w-6 h-6" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-900 truncate uppercase tracking-tight">{preAuth.name}</h4>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                          <span className={cn(
                            "text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded",
                            getStatusColor(preAuth.status)
                          )}>
                            {getStatusLabel(preAuth.status)}
                          </span>
                          {preAuth.origin === 'whatsapp' && (
                            <span className={cn(
                              "text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded flex items-center gap-1",
                              preAuth.whatsappMetadata?.trustStatus === 'vinculada' 
                                ? "bg-emerald-50 text-emerald-600" 
                                : "bg-amber-50 text-amber-600"
                            )}>
                              <MessageSquare className="w-3 h-3" />
                              {preAuth.whatsappMetadata?.trustStatus === 'vinculada' ? 'WhatsApp Vinculado' : 'WhatsApp Não Reconhecido'}
                            </span>
                          )}
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Até {format(new Date(preAuth.validity), 'dd/MM HH:mm')}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEdit(preAuth)}
                          className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all active:scale-90"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(preAuth.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all active:scale-90"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                      <div className="flex items-center gap-1 text-slate-900 text-xs font-bold">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{preAuth.unit}</span>
                      </div>
                      {preAuth.plate && (
                        <div className="flex items-center gap-1 text-slate-500 text-xs font-bold">
                          <Car className="w-3 h-3" />
                          <span className="font-mono uppercase">{preAuth.plate}</span>
                        </div>
                      )}
                      {preAuth.isOutsideTimeLimit && (
                        <div className="flex items-center gap-1 text-orange-600 text-[10px] font-black uppercase">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Fora do Horário Padrão</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {(rules?.fixedObservation || preAuth.observation) && (
                  <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-50">
                    {rules?.fixedObservation && (
                      <div className="flex items-start gap-2 p-2 bg-blue-50 rounded-lg border border-blue-100">
                        <Info className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                        <p className="text-[10px] font-medium text-blue-700 leading-tight">
                          <span className="font-black uppercase text-blue-400 mr-1">Regra Unidade:</span>
                          {rules.fixedObservation}
                        </p>
                      </div>
                    )}
                    {preAuth.observation && (
                      <p className="text-[10px] text-slate-500 italic px-1">
                        "{preAuth.observation}"
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="w-full max-w-lg">
              <PreAuthForm
                initialData={editingPreAuth}
                onClose={() => setIsFormOpen(false)}
                onSave={handleSave}
              />
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface PreAuthFormProps {
  initialData: PreAuthorization | null;
  onClose: () => void;
  onSave: (data: Partial<PreAuthorization>) => void;
}

function PreAuthForm({ initialData, onClose, onSave }: PreAuthFormProps) {
  const [formData, setFormData] = useState({
    unit: initialData?.unit || '',
    name: initialData?.name || '',
    type: initialData?.type || 'visitor' as AccessType,
    deliverySubtype: initialData?.deliverySubtype || '' as any as DeliverySubtype,
    plate: initialData?.plate || '',
    observation: initialData?.observation || '',
    validity: initialData?.validity ? format(new Date(initialData.validity), "yyyy-MM-dd'T'HH:mm") : format(new Date(new Date().getTime() + 24 * 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      validity: new Date(formData.validity)
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
    >
      <div className="flex justify-between items-center p-5 border-b border-slate-100">
        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
          {initialData ? 'Editar Pré-Autorização' : 'Nova Pré-Autorização'}
        </h3>
        <button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-slate-500">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <form id="preauth-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Casa / Apto</label>
              <input
                required
                type="text"
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 outline-none transition-all font-bold"
                value={formData.unit}
                onChange={e => setFormData({ ...formData, unit: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Validade</label>
              <input
                required
                type="datetime-local"
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 outline-none transition-all font-bold"
                value={formData.validity}
                onChange={e => setFormData({ ...formData, validity: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
            <input
              required
              type="text"
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 outline-none transition-all font-bold"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo Principal</label>
              <select
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 outline-none transition-all font-bold appearance-none"
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value as AccessType })}
              >
                <option value="visitor">Visitante</option>
                <option value="delivery">Entrega</option>
                <option value="service">Prestador</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Veículo / Placa</label>
              <input
                type="text"
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 outline-none transition-all font-bold uppercase"
                value={formData.plate}
                onChange={e => setFormData({ ...formData, plate: e.target.value })}
              />
            </div>
          </div>

          {formData.type === 'delivery' && (
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Subtipo de Entrega</label>
              <select
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 outline-none transition-all font-bold appearance-none"
                value={formData.deliverySubtype}
                onChange={e => setFormData({ ...formData, deliverySubtype: e.target.value as DeliverySubtype })}
              >
                <option value="motoboy">Motoboy</option>
                <option value="delivery">Delivery (iFood/Rappi)</option>
                <option value="transportadora">Transportadora</option>
                <option value="correios_encomenda">Correios / Encomenda</option>
                <option value="outro">Outro</option>
              </select>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Observação</label>
            <textarea
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 outline-none transition-all font-bold min-h-[80px]"
              value={formData.observation}
              onChange={e => setFormData({ ...formData, observation: e.target.value })}
            />
          </div>
        </form>
      </div>

      <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition-all"
        >
          CANCELAR
        </button>
        <button
          type="submit"
          form="preauth-form"
          className="flex-[2] py-3 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95"
        >
          SALVAR AUTORIZAÇÃO
        </button>
      </div>
    </motion.div>
  );
}
