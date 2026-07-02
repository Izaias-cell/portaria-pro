import React, { useState, useMemo } from 'react';
import { UnitPhone } from '../types';
import { Search, Plus, Edit2, Trash2, X, Phone, User, Home, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { toast } from '../lib/toast';

interface UnitPhoneManagerProps {
  unitPhones: UnitPhone[];
  onUpdate: (phones: UnitPhone[]) => void;
  onClearAll?: () => void;
  readOnly?: boolean;
}

export function UnitPhoneManager({ unitPhones, onUpdate, onClearAll, readOnly = false }: UnitPhoneManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPhone, setEditingPhone] = useState<UnitPhone | null>(null);

  const filteredPhones = useMemo(() => {
    return unitPhones.filter(p => {
      const matchesSearch = 
        p.unit.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.residentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.primaryPhone.includes(searchTerm) ||
        p.secondaryPhone?.includes(searchTerm);
      
      return matchesSearch;
    });
  }, [unitPhones, searchTerm]);

  const handleAdd = () => {
    setEditingPhone(null);
    setIsFormOpen(true);
  };

  const handleEdit = (phone: UnitPhone) => {
    setEditingPhone(phone);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja remover este vínculo de telefone?')) {
      onUpdate(unitPhones.filter(p => p.id !== id));
      toast?.info('Telefone desvinculado.');
    }
  };

  const handleToggleActive = (id: string) => {
    const updated = unitPhones.map(p => 
      p.id === id ? { ...p, active: !p.active, updatedAt: new Date() } : p
    );
    onUpdate(updated);
    const phone = updated.find(p => p.id === id);
    toast?.info(`Telefone para ${phone?.residentName} ${phone?.active ? 'ativado' : 'desativado'}.`);
  };

  const handleSave = (data: Partial<UnitPhone>) => {
    if (editingPhone) {
      onUpdate(unitPhones.map(p => 
        p.id === editingPhone.id 
          ? { ...p, ...data, updatedAt: new Date() } as UnitPhone 
          : p
      ));
      toast?.success('Vínculo de telefone atualizado!');
    } else {
      const newPhone: UnitPhone = {
        id: crypto.randomUUID(),
        unit: data.unit!,
        residentName: data.residentName!,
        primaryPhone: data.primaryPhone!,
        secondaryPhone: data.secondaryPhone,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      onUpdate([newPhone, ...unitPhones]);
      toast?.success('Novo telefone vinculado!');
    }
    setIsFormOpen(false);
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Telefones Vinculados</h2>
          {!readOnly && <p className="text-[10px] font-bold text-slate-400 uppercase">Gerencie os telefones autorizados por unidade</p>}
        </div>
        {!readOnly && (
          <div className="flex gap-2">
            {onClearAll && unitPhones.length > 0 && (
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
              className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-emerald-200 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              VINCULAR TELEFONE
            </button>
          </div>
        )}
      </div>

      {!readOnly && (
        <div className="relative group">
          <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
          <input
            type="text"
            placeholder="Pesquisar por unidade, morador ou telefone..."
            className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-sm font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      )}

      <div className="grid gap-3">
        {filteredPhones.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200">
            <Phone className="w-12 h-12 mx-auto mb-3 opacity-10" />
            <p className="text-sm font-bold">Nenhum telefone vinculado.</p>
          </div>
        ) : (
          filteredPhones.map((p) => (
            <div
              key={p.id}
              onClick={() => handleEdit(p)}
              className={cn(
                "bg-white border rounded-2xl p-4 shadow-sm flex items-center gap-4 transition-all cursor-pointer hover:shadow-md hover:border-blue-200 active:scale-[0.985] select-none",
                p.active ? "border-slate-100" : "border-slate-100 opacity-60 grayscale"
              )}
            >
              <div className={cn(
                "p-3 rounded-xl shrink-0",
                p.active ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400"
              )}>
                <Phone className="w-6 h-6" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 truncate uppercase tracking-tight">{p.residentName}</h4>
                      <span className="text-[10px] font-black text-slate-400 uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                        {p.unit}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                      <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold">
                        <Phone className="w-3 h-3" />
                        <span>{p.primaryPhone}</span>
                      </div>
                      {p.secondaryPhone && (
                        <div className="flex items-center gap-1 text-slate-500 text-xs font-medium">
                          <Phone className="w-3 h-3" />
                          <span>{p.secondaryPhone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    {!readOnly && (
                      <>
                        <button
                          onClick={() => handleToggleActive(p.id)}
                          className={cn(
                            "p-2 rounded-lg transition-all active:scale-90",
                            p.active ? "text-emerald-500 hover:bg-emerald-50" : "text-slate-400 hover:bg-slate-100"
                          )}
                          title={p.active ? "Desativar" : "Ativar"}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(p)}
                          className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all active:scale-90"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all active:scale-90"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="w-full max-w-lg">
              <UnitPhoneForm
                initialData={editingPhone}
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

interface UnitPhoneFormProps {
  initialData: UnitPhone | null;
  onClose: () => void;
  onSave: (data: Partial<UnitPhone>) => void;
}

function UnitPhoneForm({ initialData, onClose, onSave }: UnitPhoneFormProps) {
  const [formData, setFormData] = useState({
    unit: initialData?.unit || '',
    residentName: initialData?.residentName || '',
    primaryPhone: initialData?.primaryPhone || '',
    secondaryPhone: initialData?.secondaryPhone || '',
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
      className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
    >
      <div className="flex justify-between items-center p-5 border-b border-slate-100">
        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
          {initialData ? 'Editar Vínculo' : 'Novo Vínculo de Telefone'}
        </h3>
        <button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-slate-500">
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unidade</label>
            <div className="relative">
              <Home className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                required
                type="text"
                placeholder="Ex: Casa 354"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-emerald-500 outline-none transition-all font-bold"
                value={formData.unit}
                onChange={e => setFormData({ ...formData, unit: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Morador</label>
            <div className="relative">
              <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                required
                type="text"
                placeholder="Ex: João Silva"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-emerald-500 outline-none transition-all font-bold"
                value={formData.residentName}
                onChange={e => setFormData({ ...formData, residentName: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Telefone Principal (WhatsApp)</label>
          <div className="relative">
            <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <input
              required
              type="text"
              placeholder="+55 11 99999-9999"
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-emerald-500 outline-none transition-all font-bold"
              value={formData.primaryPhone}
              onChange={e => setFormData({ ...formData, primaryPhone: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Telefone Secundário (Opcional)</label>
          <div className="relative">
            <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="+55 11 88888-8888"
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-emerald-500 outline-none transition-all font-bold"
              value={formData.secondaryPhone}
              onChange={e => setFormData({ ...formData, secondaryPhone: e.target.value })}
            />
          </div>
        </div>

        <div className="pt-4 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-red-600 text-white font-black rounded-xl hover:bg-red-700 transition-all border-b-4 border-red-800 shadow-md shadow-red-100"
          >
            CANCELAR
          </button>
          <button
            type="submit"
            className="flex-[2] py-3 bg-emerald-600 text-white font-black rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all active:scale-95"
          >
            SALVAR VÍNCULO
          </button>
        </div>
      </form>
    </motion.div>
  );
}
