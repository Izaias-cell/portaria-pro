import React, { useState, useMemo } from 'react';
import { UnitRules } from '../types';
import { Search, Edit2, X, Home, Shield, Clock, MessageSquare, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface UnitRulesManagerProps {
  unitRules: UnitRules[];
  onUpdate: (rules: UnitRules[]) => void;
}

export function UnitRulesManager({ unitRules, onUpdate }: UnitRulesManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRules, setEditingRules] = useState<UnitRules | null>(null);

  const filteredRules = useMemo(() => {
    return unitRules.filter(r => 
      r.unit.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [unitRules, searchTerm]);

  const handleEdit = (rules: UnitRules) => {
    setEditingRules(rules);
    setIsFormOpen(true);
  };

  const handleCreateNew = () => {
    setEditingRules(null);
    setIsFormOpen(true);
  };

  const handleSave = (data: UnitRules) => {
    const exists = unitRules.find(r => r.unit === data.unit);
    if (exists) {
      onUpdate(unitRules.map(r => r.unit === data.unit ? data : r));
    } else {
      onUpdate([data, ...unitRules]);
    }
    setIsFormOpen(false);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Regras por Unidade</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase">Configure automações e restrições específicas</p>
        </div>
        <button
          onClick={handleCreateNew}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-blue-200 active:scale-95 transition-all"
        >
          <Shield className="w-4 h-4" />
          NOVA REGRA
        </button>
      </div>

      <div className="relative group">
        <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
        <input
          type="text"
          placeholder="Pesquisar por unidade (ex: Casa 354)..."
          className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid gap-3">
        {filteredRules.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-10" />
            <p className="text-sm font-bold">Nenhuma regra personalizada cadastrada.</p>
            <p className="text-xs mt-1">Unidades sem regras seguem o padrão do sistema.</p>
          </div>
        ) : (
          filteredRules.map((r) => (
            <div
              key={r.unit}
              className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-50 p-2 rounded-xl text-blue-600">
                    <Home className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 uppercase tracking-tight">{r.unit}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Última atualização: {r.updatedAt.toLocaleDateString()}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleEdit(r)}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <RuleBadge 
                  active={r.allowAutoWhatsAppAuth} 
                  label="WhatsApp Auto" 
                  icon={MessageSquare} 
                />
                <RuleBadge 
                  active={!r.requireVisitorConfirmation} 
                  label="Visita Direta" 
                  icon={CheckCircle2} 
                />
                <RuleBadge 
                  active={!r.requireDeliveryConfirmation} 
                  label="Entrega Direta" 
                  icon={CheckCircle2} 
                />
                {r.deliveryTimeLimit && (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 text-amber-700 rounded-lg border border-amber-100">
                    <Clock className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase">Entrega até {r.deliveryTimeLimit}</span>
                  </div>
                )}
                {r.visitorTimeLimit && (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 text-amber-700 rounded-lg border border-amber-100">
                    <Clock className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase">Visita até {r.visitorTimeLimit}</span>
                  </div>
                )}
              </div>

              {r.fixedObservation && (
                <div className="mt-3 p-2 bg-slate-50 rounded-xl border border-slate-100 flex gap-2 items-start">
                  <Info className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <p className="text-[10px] font-medium text-slate-600 leading-tight">
                    <span className="font-bold uppercase text-slate-400 mr-1">Obs Fixa:</span>
                    {r.fixedObservation}
                  </p>
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
              <UnitRulesForm
                initialData={editingRules}
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

function RuleBadge({ active, label, icon: Icon }: { active: boolean, label: string, icon: any }) {
  return (
    <div className={cn(
      "flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all",
      active 
        ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
        : "bg-slate-50 text-slate-400 border-slate-100"
    )}>
      <Icon className="w-3 h-3" />
      <span className="text-[10px] font-bold uppercase">{label}</span>
    </div>
  );
}

interface UnitRulesFormProps {
  initialData: UnitRules | null;
  onClose: () => void;
  onSave: (data: UnitRules) => void;
}

function UnitRulesForm({ initialData, onClose, onSave }: UnitRulesFormProps) {
  const [formData, setFormData] = useState<UnitRules>(initialData || {
    unit: '',
    allowAutoWhatsAppAuth: true,
    requireVisitorConfirmation: false,
    requireDeliveryConfirmation: false,
    requireServiceConfirmation: true,
    allowFrequentAlwaysReleased: true,
    fixedObservation: '',
    deliveryTimeLimit: '',
    visitorTimeLimit: '',
    updatedAt: new Date(),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...formData, updatedAt: new Date() });
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
          {initialData ? `Regras: ${initialData.unit}` : 'Configurar Regras de Unidade'}
        </h3>
        <button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-slate-500">
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto no-scrollbar">
        {!initialData && (
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unidade</label>
            <div className="relative">
              <Home className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                required
                type="text"
                placeholder="Ex: Casa 354"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 outline-none transition-all font-bold"
                value={formData.unit}
                onChange={e => setFormData({ ...formData, unit: e.target.value })}
              />
            </div>
          </div>
        )}

        <div className="space-y-3">
          <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-1">Automações e WhatsApp</h4>
          <div className="grid gap-2">
            <ToggleField 
              label="Autorização Automática via WhatsApp" 
              description="Permite que mensagens de números vinculados criem autorizações já validadas."
              value={formData.allowAutoWhatsAppAuth}
              onChange={v => setFormData({ ...formData, allowAutoWhatsAppAuth: v })}
            />
            <ToggleField 
              label="Permitir Frequentes 'Sempre Liberados'" 
              description="Se desativado, mesmo visitantes frequentes precisarão de aviso prévio."
              value={formData.allowFrequentAlwaysReleased}
              onChange={v => setFormData({ ...formData, allowFrequentAlwaysReleased: v })}
            />
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-[10px] font-black text-orange-500 uppercase tracking-widest ml-1">Exigir Confirmação Manual (Interfone)</h4>
          <div className="grid gap-2">
            <ToggleField 
              label="Confirmar Visitantes" 
              value={formData.requireVisitorConfirmation}
              onChange={v => setFormData({ ...formData, requireVisitorConfirmation: v })}
            />
            <ToggleField 
              label="Confirmar Entregas" 
              value={formData.requireDeliveryConfirmation}
              onChange={v => setFormData({ ...formData, requireDeliveryConfirmation: v })}
            />
            <ToggleField 
              label="Confirmar Prestadores de Serviço" 
              value={formData.requireServiceConfirmation}
              onChange={v => setFormData({ ...formData, requireServiceConfirmation: v })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Limite Entregas</label>
            <div className="relative">
              <Clock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                type="time"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 outline-none transition-all font-bold"
                value={formData.deliveryTimeLimit}
                onChange={e => setFormData({ ...formData, deliveryTimeLimit: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Limite Visitantes</label>
            <div className="relative">
              <Clock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                type="time"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 outline-none transition-all font-bold"
                value={formData.visitorTimeLimit}
                onChange={e => setFormData({ ...formData, visitorTimeLimit: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Observação Fixa para a Portaria</label>
          <textarea
            placeholder="Ex: Morador com dificuldade de locomoção, interfonar apenas em emergências."
            className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 outline-none transition-all font-medium text-sm min-h-[80px] resize-none"
            value={formData.fixedObservation}
            onChange={e => setFormData({ ...formData, fixedObservation: e.target.value })}
          />
        </div>

        <div className="pt-4 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition-all"
          >
            CANCELAR
          </button>
          <button
            type="submit"
            className="flex-[2] py-3 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95"
          >
            SALVAR REGRAS
          </button>
        </div>
      </form>
    </motion.div>
  );
}

function ToggleField({ label, description, value, onChange }: { label: string, description?: string, value: boolean, onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={cn(
        "flex items-center justify-between p-3 rounded-xl border-2 transition-all text-left",
        value ? "bg-blue-50 border-blue-200" : "bg-white border-slate-100"
      )}
    >
      <div className="flex-1 pr-4">
        <p className={cn("text-xs font-bold uppercase tracking-tight", value ? "text-blue-700" : "text-slate-600")}>{label}</p>
        {description && <p className="text-[9px] font-medium text-slate-400 mt-0.5 leading-tight">{description}</p>}
      </div>
      <div className={cn(
        "w-10 h-5 rounded-full relative transition-all shrink-0",
        value ? "bg-blue-600" : "bg-slate-200"
      )}>
        <div className={cn(
          "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
          value ? "left-6" : "left-1"
        )} />
      </div>
    </button>
  );
}
