import React, { useState, useMemo } from 'react';
import { FrequentVisitor, AccessType, DeliverySubtype, AccessRule } from '../types';
import { Search, Plus, Edit2, Trash2, Check, X, Shield, ShieldAlert, Car, MapPin, User, Bike, Wrench, ChevronDown, Power, Zap, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { toast } from '../lib/toast';
import { format } from 'date-fns';
import { getCorrectedType } from '../lib/classificationUtils';

const getRelationshipColorClass = (relationship?: string) => {
  if (!relationship) return '';
  const rel = relationship.trim().toLowerCase();
  if (['mãe', 'mae', 'pai'].includes(rel)) {
    return 'text-red-500 font-black';
  }
  if (['irmão', 'irmao', 'irmã', 'irma', 'primo', 'prima', 'tio', 'tia'].includes(rel)) {
    return 'text-blue-500 font-black';
  }
  if (['amigo', 'amiga'].includes(rel)) {
    return 'text-orange-500 font-black';
  }
  return 'text-slate-400';
};

interface FrequentVisitorManagerProps {
  visitors: FrequentVisitor[];
  onUpdate: (visitors: FrequentVisitor[]) => void;
  onReleaseDirect: (visitor: FrequentVisitor) => void;
  onClearAll?: () => void;
  readOnly?: boolean;
}

export function FrequentVisitorManager({ visitors, onUpdate, onReleaseDirect, onClearAll, readOnly = false }: FrequentVisitorManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRule, setFilterRule] = useState<AccessRule | 'all'>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVisitor, setEditingVisitor] = useState<FrequentVisitor | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleCardClick = (visitor: FrequentVisitor) => {
    if (readOnly || !visitor.active) return;
    setProcessingId(visitor.id);
    onReleaseDirect(visitor);
  };

  const filteredVisitors = useMemo(() => {
    return visitors.filter(v => {
      const matchesSearch = 
        v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.unit.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.plate?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = filterRule === 'all' || v.rule === filterRule;
      
      return matchesSearch && matchesFilter;
    });
  }, [visitors, searchTerm, filterRule]);

  const handleAdd = () => {
    setEditingVisitor(null);
    setIsFormOpen(true);
  };

  const handleEdit = (visitor: FrequentVisitor) => {
    setEditingVisitor(visitor);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja remover este visitante frequente?')) {
      onUpdate(visitors.filter(v => v.id !== id));
      toast.info('Visitante frequente removido.');
    }
  };

  const handleToggleActive = (id: string) => {
    const updated = visitors.map(v => 
      v.id === id ? { ...v, active: !v.active, updatedAt: new Date() } : v
    );
    onUpdate(updated);
    const visitor = updated.find(v => v.id === id);
    toast.info(`Visitante ${visitor?.name} ${visitor?.active ? 'ativado' : 'desativado'}.`);
  };

  const handleSave = (data: Partial<FrequentVisitor>) => {
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

    if (editingVisitor) {
      onUpdate(visitors.map(v => 
        v.id === editingVisitor.id 
          ? { ...v, ...finalData, updatedAt: new Date() } as FrequentVisitor 
          : v
      ));
      toast.success('Cadastro de visitante atualizado!');
    } else {
      const newVisitor: FrequentVisitor = {
        id: crypto.randomUUID(),
        unit: data.unit!,
        name: data.name!,
        relationship: data.relationship,
        type: finalData.type!,
        deliverySubtype: finalData.deliverySubtype,
        plate: data.plate,
        observation: data.observation,
        rule: data.rule!,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      onUpdate([newVisitor, ...visitors]);
      toast.success('Novo visitante frequente cadastrado!');
    }
    setIsFormOpen(false);
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Frequentes</h2>
        {!readOnly && (
          <div className="flex gap-2">
            {onClearAll && visitors.length > 0 && (
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
              NOVO CADASTRO
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

          <div className="flex gap-2">
            {['all', 'SEMPRE_LIBERADO', 'AVISAR_ANTES'].map((r) => (
              <button
                key={r}
                onClick={() => setFilterRule(r as any)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border-2",
                  filterRule === r 
                    ? "bg-slate-900 text-white border-slate-900" 
                    : "bg-white text-slate-400 border-slate-100 hover:border-slate-200"
                )}
              >
                {r === 'all' ? 'Todos' : r === 'SEMPRE_LIBERADO' ? 'Liberado Sempre' : 'Avisar Antes'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {filteredVisitors.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200">
            <User className="w-12 h-12 mx-auto mb-3 opacity-10" />
            <p className="text-sm font-bold">Nenhum visitante frequente cadastrado.</p>
          </div>
        ) : (
          filteredVisitors.map((visitor) => (
              <div
                key={visitor.id}
                onClick={() => handleCardClick(visitor)}
                className={cn(
                  "bg-white border rounded-2xl shadow-sm flex flex-col gap-3 transition-all relative overflow-hidden group/card select-none",
                  readOnly ? "p-3" : "p-4",
                  !visitor.active && "opacity-60 grayscale cursor-not-allowed",
                  !readOnly && visitor.active && "cursor-pointer hover:shadow-md hover:border-blue-200 active:scale-[0.985]",
                  processingId === visitor.id && visitor.rule === 'AVISAR_ANTES' && "ring-2 ring-amber-500 border-amber-200 bg-amber-50/30",
                  visitor.rule === 'SEMPRE_LIBERADO' ? "border-emerald-100" : "border-amber-100"
                )}
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={cn(
                      "rounded-xl shrink-0 group-hover/card:scale-110 transition-transform",
                      readOnly ? "p-2.5" : "p-3",
                      visitor.type === 'visitor' ? "bg-emerald-50 text-emerald-600" :
                      visitor.type === 'delivery' ? "bg-orange-50 text-orange-600" :
                      "bg-blue-50 text-blue-600"
                    )}>
                      {visitor.type === 'visitor' ? <User className="w-6 h-6" /> :
                       visitor.type === 'delivery' ? <Bike className="w-6 h-6" /> :
                       <Wrench className="w-6 h-6" />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-slate-900 truncate uppercase text-sm group-hover/card:text-blue-600 transition-colors flex items-center gap-1">
                          <span>{visitor.name}</span>
                          {visitor.relationship && visitor.relationship.trim() && (
                            <span className={cn("text-xs uppercase normal-case", getRelationshipColorClass(visitor.relationship))}>
                              ({visitor.relationship.trim().toUpperCase()})
                            </span>
                          )}
                        </h4>
                        <span className="text-xs font-black text-slate-300">•</span>
                        <span className="text-sm font-black text-blue-600 uppercase tracking-tight">{visitor.unit}</span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-1.5 py-0.5 rounded">
                          {visitor.relationship || 'Visitante'}
                        </span>
                        {visitor.rule === 'SEMPRE_LIBERADO' ? (
                          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            Liberado Sempre
                          </span>
                        ) : (
                          <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3" />
                            Avisar Antes
                          </span>
                        )}
                        {visitor.plate && (
                          <div className="flex items-center gap-1 text-slate-400 text-[10px] font-bold">
                            <Car className="w-3 h-3" />
                            <span className="font-mono uppercase tracking-tighter">{visitor.plate}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {!readOnly && (
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => handleToggleActive(visitor.id)}
                        className={cn(
                          "p-1.5 rounded-lg transition-all active:scale-90",
                          visitor.active ? "text-emerald-500 hover:bg-emerald-50" : "text-slate-300 hover:bg-slate-100"
                        )}
                        title={visitor.active ? "Desativar" : "Ativar"}
                      >
                        <Power className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(visitor)}
                        className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all active:scale-90"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(visitor.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all active:scale-90"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {!readOnly && onReleaseDirect && visitor.active && (
                  <div
                    className={cn(
                      "w-full py-2.5 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm",
                      visitor.rule === 'SEMPRE_LIBERADO' ? "bg-emerald-600 shadow-emerald-100" : "bg-amber-500 shadow-amber-100"
                    )}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    LIBERAR / CADASTRAR ENTRADA
                  </div>
                )}
              </div>
            ))
          )}
        </div>

      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="w-full max-w-lg">
              <FrequentVisitorForm
                initialData={editingVisitor}
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

interface FrequentVisitorFormProps {
  initialData: FrequentVisitor | null;
  onClose: () => void;
  onSave: (data: Partial<FrequentVisitor>) => void;
}

function FrequentVisitorForm({ initialData, onClose, onSave }: FrequentVisitorFormProps) {
  const defaultType = initialData?.type || 'visitor' as AccessType;
  const [formData, setFormData] = useState({
    unit: initialData?.unit || '',
    name: initialData?.name || '',
    relationship: initialData?.relationship || '',
    type: defaultType,
    deliverySubtype: initialData?.deliverySubtype || (defaultType === 'delivery' ? 'motoboy' : '' as any as DeliverySubtype),
    plate: initialData?.plate || '',
    observation: initialData?.observation || '',
    rule: initialData?.rule || 'AVISAR_ANTES' as AccessRule,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
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
          {initialData ? 'Editar Frequente' : 'Novo Frequente'}
        </h3>
        <button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-slate-500">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <form id="frequent-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vínculo</label>
              <input
                type="text"
                placeholder="Ex: Mãe, Diarista..."
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 outline-none transition-all font-bold"
                value={formData.relationship}
                onChange={e => setFormData({ ...formData, relationship: e.target.value })}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Regra de Acesso</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, rule: 'SEMPRE_LIBERADO' })}
                className={cn(
                  "py-3 rounded-xl border-2 font-bold text-xs transition-all flex items-center justify-center gap-2",
                  formData.rule === 'SEMPRE_LIBERADO' ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "bg-white border-slate-100 text-slate-400"
                )}
              >
                <Shield className="w-4 h-4" />
                Liberado Sempre
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, rule: 'AVISAR_ANTES' })}
                className={cn(
                  "py-3 rounded-xl border-2 font-bold text-xs transition-all flex items-center justify-center gap-2",
                  formData.rule === 'AVISAR_ANTES' ? "bg-amber-50 border-amber-500 text-amber-700" : "bg-white border-slate-100 text-slate-400"
                )}
              >
                <ShieldAlert className="w-4 h-4" />
                Avisar Antes
              </button>
            </div>
          </div>

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
          className="flex-1 py-3 bg-red-600 text-white font-black rounded-xl hover:bg-red-700 transition-all border-b-4 border-red-800 shadow-md shadow-red-100"
        >
          CANCELAR
        </button>
        <button
          type="submit"
          form="frequent-form"
          className="flex-[2] py-3 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95"
        >
          SALVAR CADASTRO
        </button>
      </div>
    </motion.div>
  );
}
