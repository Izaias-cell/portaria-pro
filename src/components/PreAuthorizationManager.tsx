import React, { useState, useMemo } from 'react';
import { PreAuthorization, AccessType, DeliverySubtype, PreAuthStatus, UnitRules, FrequentVisitor } from '../types';
import { Search, Plus, Edit2, Trash2, Check, X, Calendar, MapPin, User, Package, Wrench, Clock, AlertCircle, MessageSquare, AlertTriangle, Info, Car, Zap, Bike } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { toast } from '../lib/toast';
import { format, isAfter, isBefore, isToday } from 'date-fns';
import { findPotentialMatches } from '../lib/matchUtils';
import { getCorrectedType } from '../lib/classificationUtils';

interface PreAuthorizationManagerProps {
  preAuths: PreAuthorization[];
  unitRules: UnitRules[];
  frequentVisitors: FrequentVisitor[];
  onUpdate: (preAuths: PreAuthorization[]) => void;
  onReleasePreAuth?: (preAuth: PreAuthorization) => void;
  onUseFrequentData?: (preAuth: PreAuthorization, visitor: FrequentVisitor) => void;
  onClearAll?: () => void;
  readOnly?: boolean;
}

export function PreAuthorizationManager({ 
  preAuths, 
  unitRules, 
  frequentVisitors,
  onUpdate, 
  onReleasePreAuth, 
  onUseFrequentData,
  onClearAll, 
  readOnly = false 
}: PreAuthorizationManagerProps) {
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
      toast.info('Pré-autorização removida.');
    }
  };

  const handleSave = (data: Partial<PreAuthorization>) => {
    // Apply auto-classification before saving
    const corrected = getCorrectedType({
      name: data.name || '',
      observation: data.observation || '',
      type: data.type || 'visitor'
    });

    const finalData = {
      ...data,
      type: corrected.type,
      deliverySubtype: corrected.deliverySubtype || data.deliverySubtype
    };

    if (editingPreAuth) {
      onUpdate(preAuths.map(p => 
        p.id === editingPreAuth.id 
          ? { ...p, ...finalData, updatedAt: new Date(), isManualValidity: true } as PreAuthorization 
          : p
      ));
      toast.success('Pré-autorização atualizada!');
    } else {
      const newPreAuth: PreAuthorization = {
        id: crypto.randomUUID(),
        unit: data.unit!,
        type: finalData.type!,
        deliverySubtype: finalData.deliverySubtype,
        name: data.name!,
        document: data.document,
        plate: data.plate,
        relationship: data.relationship,
        observation: data.observation,
        validity: data.validity!,
        isManualValidity: true,
        status: 'autorizada',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      onUpdate([newPreAuth, ...preAuths]);
      toast.success('Pré-autorização criada!');
    }
    setIsFormOpen(false);
  };

  const getStatusColor = (input: PreAuthorization | PreAuthStatus) => {
    if (typeof input !== 'string' && input.origin === 'porter_entry' && input.status === 'autorizada') return 'bg-red-50 text-red-600';
    const status = typeof input === 'string' ? input : input.status;
    switch (status) {
      case 'pendente': return 'bg-slate-100 text-slate-600';
      case 'pendente_confirmacao': return 'bg-amber-50 text-amber-600 border border-amber-200';
      case 'autorizada': return 'bg-emerald-50 text-emerald-600';
      case 'finalizada': return 'bg-blue-50 text-blue-600';
      case 'expirada': return 'bg-red-50 text-red-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const getStatusLabel = (input: PreAuthorization | PreAuthStatus) => {
    if (typeof input !== 'string' && input.origin === 'porter_entry' && input.status === 'autorizada') return 'AGUARDANDO LIBERAÇÃO';
    const status = typeof input === 'string' ? input : input.status;
    switch (status) {
      case 'pendente': return 'Pendente';
      case 'pendente_confirmacao': return 'Pendente Confirmação';
      case 'autorizada': return 'Autorizada';
      case 'finalizada': return 'Finalizada';
      case 'expirada': return 'Expirada';
      default: return status;
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Pré-Autorizações</h2>
        {!readOnly && (
          <div className="flex gap-2">
            {onClearAll && preAuths.length > 0 && (
              <button
                onClick={onClearAll}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                title="Limpar todos"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={handleAdd}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-blue-200 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              NOVA PRÉ-AUTORIZAÇÃO
            </button>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      {!readOnly && (
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
            {['all', 'pendente', 'pendente_confirmacao', 'autorizada'].map((s) => (
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
      )}

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
            const suggestions = findPotentialMatches(preAuth, frequentVisitors);

            return (
              <div
                key={preAuth.id}
                onClick={() => {
                  if (readOnly) return;
                  // If authorized or pending, open release modal. 
                  // If not authorized but we have the callback, still allow opening the release modal 
                  // for quick manual entry as requested: "Card = liberar acesso rapidamente"
                  if (onReleasePreAuth) {
                    onReleasePreAuth(preAuth);
                  }
                }}
                className={cn(
                  "bg-white border select-none rounded-2xl p-4 shadow-sm flex flex-col gap-3 transition-all group/card",
                  !readOnly ? "cursor-pointer hover:shadow-md hover:border-blue-200 active:scale-[0.985]" : "",
                  isToday(new Date(preAuth.createdAt)) && preAuth.status === 'autorizada' ? "ring-2 ring-blue-500/10 border-blue-100" : "border-slate-100"
                )}
              >
                {/* Suggestions Section */}
                {suggestions.length > 0 && preAuth.status === 'autorizada' && !readOnly && (
                  <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-100 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-600" />
                      <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Sugestão Inteligente (Visitante Frequente)</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {suggestions.slice(0, 2).map(visitor => (
                        <div key={visitor.id} className="flex items-center justify-between gap-3 p-2 bg-white rounded-lg border border-amber-100 shadow-sm">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
                              <User className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-[11px] font-black text-slate-900 leading-none mb-1 uppercase tracking-tight truncate max-w-[120px]">{visitor.name}</p>
                              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                                {visitor.relationship || 'Recorrente'} • {visitor.plate || 'Sem Placa'}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onUseFrequentData?.(preAuth, visitor);
                            }}
                            className="px-3 py-1.5 bg-amber-600 text-white text-[9px] font-black uppercase rounded-lg hover:bg-amber-700 transition-all active:scale-95 shadow-sm shadow-amber-100"
                          >
                            USAR DADOS
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-start gap-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={cn(
                      "p-3 rounded-xl shrink-0 group-hover/card:scale-110 transition-transform",
                      preAuth.type === 'visitor' ? "bg-emerald-50 text-emerald-600" :
                      preAuth.type === 'delivery' ? "bg-orange-50 text-orange-600" :
                      "bg-blue-50 text-blue-600"
                    )}>
                      {preAuth.type === 'visitor' ? <User className="w-5 h-5" /> :
                       preAuth.type === 'delivery' ? <Bike className="w-5 h-5" /> :
                       <Wrench className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 truncate uppercase text-sm group-hover/card:text-blue-600 transition-colors">
                          {preAuth.name && preAuth.name !== 'Pendente' && !preAuth.name.includes('Autorizado via Resposta Rápida') ? (
                            <>
                              <span className="text-slate-400 font-black mr-1">
                                {preAuth.type === 'delivery' ? 'ENTREGADOR' : preAuth.type === 'service' ? 'PRESTADOR' : 'VISITANTE'}
                              </span>
                              {preAuth.name}
                            </>
                          ) : (
                            preAuth.type === 'delivery' ? 'ENTREGA' : preAuth.type === 'service' ? 'PRESTADOR' : 'VISITANTE'
                          )}
                        </h4>
                        <span className="text-xs font-black text-slate-300">•</span>
                        <span className="text-sm font-black text-blue-600 uppercase tracking-tight">{preAuth.unit}</span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className={cn(
                          "text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded",
                          getStatusColor(preAuth)
                        )}>
                          {getStatusLabel(preAuth).toUpperCase()}
                        </span>

                        <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase tracking-widest">
                          {preAuth.type === 'delivery' ? 'ENTREGA' : preAuth.type === 'service' ? 'PRESTADOR' : 'VISITANTE'}
                        </span>
                        
                        {preAuth.origin === 'whatsapp' && (
                          <div className={cn(
                            "flex items-center gap-1 text-[9px] font-black uppercase tracking-widest",
                            preAuth.whatsappMetadata?.trustStatus === 'vinculada' ? "text-emerald-600" : "text-amber-500"
                          )}>
                            <Check className="w-3 h-3" />
                            {preAuth.whatsappMetadata?.trustStatus === 'vinculada' ? 'WhatsApp Vinculado' : 'WhatsApp'}
                          </div>
                        )}

                        {preAuth.plate && (
                          <div className="flex items-center gap-1 text-slate-400 text-[10px] font-bold">
                            <Car className="w-3 h-3" />
                            <span className="font-mono uppercase tracking-tighter">{preAuth.plate}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-1.5">
                        {preAuth.type === 'delivery' && preAuth.deliverySubtype && (
                          <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest bg-orange-50 px-1.5 py-0.5 rounded">
                            {preAuth.deliverySubtype.replace('_', ' ')}
                          </span>
                        )}
                        {preAuth.type === 'service' && preAuth.relationship && (
                          <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-1.5 py-0.5 rounded">
                            {preAuth.relationship}
                          </span>
                        )}
                        {rules?.fixedObservation && (
                          <div className="flex items-center gap-1 text-[9px] font-black text-blue-500 uppercase">
                            <AlertCircle className="w-2.5 h-2.5" />
                            🔔 Avisar na chegada
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {!readOnly && (
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(preAuth);
                        }}
                        className="p-1.5 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all active:scale-90 shrink-0"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(preAuth.id);
                        }}
                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all active:scale-90 shrink-0"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {!readOnly && onReleasePreAuth && preAuth.status === 'autorizada' && (
                  <div
                    className={cn(
                      "w-full py-2.5 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm",
                      preAuth.type === 'delivery' 
                        ? "bg-orange-600 shadow-orange-100" 
                        : "bg-emerald-600 shadow-emerald-100"
                    )}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    LIBERAR / CADASTRAR ENTRADA
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

export function PreAuthForm({ initialData, onClose, onSave }: PreAuthFormProps) {
  const defaultType = initialData?.type || 'visitor' as AccessType;
  const [formData, setFormData] = useState({
    unit: initialData?.unit || '',
    name: initialData?.name || '',
    relationship: initialData?.relationship || '',
    document: initialData?.document || '',
    type: defaultType,
    deliverySubtype: initialData?.deliverySubtype || (defaultType === 'delivery' ? 'motoboy' : '' as any as DeliverySubtype),
    plate: initialData?.plate || '',
    observation: initialData?.observation || '',
    company: initialData?.company || '',
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
          {/* Primeira linha: CASA | NOME COMPLETO / VÍNCULO | CPF/RG */}
          <div className="grid grid-cols-12 gap-3 items-start">
            <div className="col-span-2 space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Casa/Apto</label>
              <input
                required
                type="text"
                placeholder="Ex: 102"
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus-within:border-blue-500 outline-none transition-all font-bold text-sm"
                value={formData.unit}
                onChange={e => setFormData({ ...formData, unit: e.target.value })}
              />
            </div>
            
            <div className="col-span-7 space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo / Vínculo</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Nome Completo (Opcional)"
                  className="flex-[2] min-w-0 px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus-within:border-blue-500 outline-none transition-all font-bold text-sm"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
                <span className="text-slate-300 font-bold shrink-0">/</span>
                <input
                  type="text"
                  placeholder="Vínculo (Ex: Mãe, Diarista...)"
                  className="flex-[1] min-w-0 px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus-within:border-blue-500 outline-none transition-all font-bold text-sm"
                  value={formData.relationship}
                  onChange={e => setFormData({ ...formData, relationship: e.target.value })}
                />
              </div>
            </div>

            <div className="col-span-3 space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CPF / RG</label>
              <input
                type="text"
                placeholder="CPF ou RG"
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus-within:border-blue-500 outline-none transition-all font-bold text-sm"
                value={formData.document}
                onChange={e => setFormData({ ...formData, document: e.target.value })}
              />
            </div>
          </div>

          {/* Segunda linha: TIPO PRINCIPAL | VEÍCULO / PLACA */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo Principal</label>
              <select
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus-within:border-blue-500 outline-none transition-all font-bold appearance-none text-sm"
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
                placeholder="Opcional"
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus-within:border-blue-500 outline-none transition-all font-bold uppercase text-sm"
                value={formData.plate}
                onChange={e => setFormData({ ...formData, plate: e.target.value })}
              />
            </div>
          </div>

          {/* Validade do Acesso */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Validade</label>
            <input
              required
              type="datetime-local"
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus-within:border-blue-500 outline-none transition-all font-bold text-sm"
              value={formData.validity}
              onChange={e => setFormData({ ...formData, validity: e.target.value })}
            />
          </div>

          {formData.type === 'delivery' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Subtipo de Entrega</label>
                <select
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus-within:border-blue-500 outline-none transition-all font-bold appearance-none text-sm"
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
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Empresa</label>
                <input
                  type="text"
                  placeholder="Ex: iFood, Rappi"
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus-within:border-blue-500 outline-none transition-all font-bold text-sm"
                  value={formData.company}
                  onChange={e => setFormData({ ...formData, company: e.target.value })}
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Observação</label>
            <textarea
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus-within:border-blue-500 outline-none transition-all font-bold min-h-[80px] text-sm"
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
          className="flex-1 py-3 bg-red-600 text-white font-black rounded-xl hover:bg-red-700 transition-all border-b-4 border-red-800 shadow-md shadow-red-100 text-xs tracking-wider"
        >
          CANCELAR
        </button>
        <button
          type="submit"
          form="preauth-form"
          className="flex-[2] py-3 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95 text-xs tracking-wider"
        >
          SALVAR AUTORIZAÇÃO
        </button>
      </div>
    </motion.div>
  );
}
