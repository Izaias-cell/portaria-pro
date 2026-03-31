import React, { useState, useMemo, useEffect } from 'react';
import { AccessType, AccessRecord, DeliverySubtype, FrequentVisitor, AccessRule, PreAuthorization } from '../types';
import { X, Check, Car, User, Home, FileText, Camera, Package, ChevronDown, Shield, ShieldAlert, Zap, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface AccessFormProps {
  type: AccessType;
  fastFlow?: boolean;
  frequentVisitors?: FrequentVisitor[];
  preAuths?: PreAuthorization[];
  initialData?: Partial<AccessRecord>;
  onClose: () => void;
  onSubmit: (data: Partial<AccessRecord>) => void;
  onReleaseDirect: (visitor: FrequentVisitor) => void;
  onReleasePreAuth: (preAuth: PreAuthorization) => void;
}

// Mock data for residents
const MOCK_RESIDENTS = [
  { unit: 'Casa 01', name: 'Ricardo Silva' },
  { unit: 'Casa 02', name: 'Ana Oliveira' },
  { unit: 'Casa 03', name: 'Marcos Santos' },
  { unit: 'Casa 04', name: 'Julia Costa' },
  { unit: 'Casa 05', name: 'Paulo Souza' },
  { unit: 'Casa 06', name: 'Fernanda Lima' },
  { unit: 'Casa 07', name: 'Roberto Rocha' },
  { unit: 'Casa 08', name: 'Beatriz Alves' },
  { unit: 'Casa 09', name: 'Carlos Pereira' },
  { unit: 'Casa 10', name: 'Sandra Gomes' },
];

export function AccessForm({ 
  type, 
  fastFlow = false, 
  frequentVisitors = [], 
  preAuths = [], 
  initialData,
  onClose, 
  onSubmit, 
  onReleaseDirect, 
  onReleasePreAuth 
}: AccessFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    document: initialData?.document || '',
    plate: initialData?.plate || '',
    vehicleModel: initialData?.vehicleModel || '',
    vehicleColor: initialData?.vehicleColor || '',
    destination: initialData?.destination || '',
    notes: initialData?.notes || '',
    deliverySubtype: initialData?.deliverySubtype || '' as any as DeliverySubtype,
    origin: (initialData?.origin as any) || 'manual',
    ruleUsed: (initialData as any)?.ruleUsed as AccessRule | undefined,
  });

  const [destSearch, setDestSearch] = useState(initialData?.destination || '');
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);

  // Update form if initialData changes while open
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        name: initialData.name || prev.name,
        document: initialData.document || prev.document,
        plate: initialData.plate || prev.plate,
        vehicleModel: initialData.vehicleModel || prev.vehicleModel,
        vehicleColor: initialData.vehicleColor || prev.vehicleColor,
        destination: initialData.destination || prev.destination,
        notes: initialData.notes || prev.notes,
        deliverySubtype: initialData.deliverySubtype || prev.deliverySubtype,
        origin: (initialData.origin as any) || prev.origin,
      }));
      if (initialData.destination) {
        setDestSearch(initialData.destination);
      }
    }
  }, [initialData]);

  const filteredResidents = useMemo(() => {
    if (!destSearch) return [];
    return MOCK_RESIDENTS.filter(r => 
      r.unit.toLowerCase().includes(destSearch.toLowerCase()) ||
      r.name.toLowerCase().includes(destSearch.toLowerCase())
    ).slice(0, 5);
  }, [destSearch]);

  // Search for frequent visitors linked to the current destination
  const matchingFrequents = useMemo(() => {
    if (!destSearch) return [];
    let matches = frequentVisitors.filter(v => 
      v.active && 
      v.unit.toLowerCase() === destSearch.toLowerCase()
    );

    // If plate is typed, we could prioritize or filter, but showing all for the unit is usually better.
    // However, let's mark if there's a plate match.
    return matches;
  }, [destSearch, frequentVisitors]);

  const matchingPreAuths = useMemo(() => {
    if (!destSearch) return [];
    return preAuths.filter(p => 
      p.status === 'autorizada' &&
      p.unit.toLowerCase() === destSearch.toLowerCase()
    );
  }, [destSearch, preAuths]);

  const plateMatch = useMemo(() => {
    if (!formData.plate) return null;
    return matchingFrequents.find(v => v.plate?.toLowerCase() === formData.plate.toLowerCase());
  }, [formData.plate, matchingFrequents]);

  const [showAdditional, setShowAdditional] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ 
      ...formData, 
      destination: destSearch,
      type,
      fastFlow,
      deliverySubtype: type === 'delivery' ? formData.deliverySubtype : undefined
    });
  };

  const handleUseFrequent = (visitor: FrequentVisitor) => {
    setFormData({
      ...formData,
      name: visitor.name,
      plate: visitor.plate || '',
      deliverySubtype: visitor.deliverySubtype || formData.deliverySubtype,
      notes: visitor.observation || '',
      origin: 'visitante_frequente',
      ruleUsed: visitor.rule,
    });
    toast.info(`Dados de ${visitor.name} carregados!`, {
      description: `Regra: ${visitor.rule === 'SEMPRE_LIBERADO' ? 'Sempre Liberado' : 'Avisar Antes'}`
    });
  };

  const getTitle = () => {
    const prefix = fastFlow ? 'Fluxo Rápido: ' : '';
    switch (type) {
      case 'visitor': return `${prefix}Novo Visitante`;
      case 'delivery': return `${prefix}Nova Entrega`;
      case 'service': return `${prefix}Novo Prestador`;
      default: return `${prefix}Registro`;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh]"
    >
      {/* Header Fixo - Sempre visível no topo */}
      <div className="flex justify-between items-center p-5 sm:p-6 border-b border-slate-100 bg-white z-30 shrink-0">
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tighter truncate pr-2">{getTitle()}</h2>
        <button 
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }} 
          className="p-3 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-all active:scale-90 shrink-0 flex items-center justify-center"
          aria-label="Fechar modal"
          style={{ minWidth: '44px', minHeight: '44px' }}
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Conteúdo com Scroll */}
      <div className="flex-1 overflow-y-auto p-6 pt-4">
        {/* Frequent Visitors Highlight */}
        <AnimatePresence>
          {(matchingFrequents.length > 0 || matchingPreAuths.length > 0) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-6 space-y-4 overflow-hidden"
            >
              {matchingFrequents.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-widest px-1">Visitantes Frequentes Encontrados</h3>
                  <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {matchingFrequents.map((v) => {
                      const isPlateMatch = formData.plate && v.plate?.toLowerCase() === formData.plate.toLowerCase();
                      return (
                        <div
                          key={v.id}
                          className={cn(
                            "shrink-0 p-3 rounded-2xl border-2 transition-all text-left min-w-[200px] group relative",
                            v.rule === 'SEMPRE_LIBERADO' 
                              ? "bg-emerald-50 border-emerald-100 hover:border-emerald-500" 
                              : "bg-amber-50 border-amber-100 hover:border-amber-500",
                            isPlateMatch && "ring-4 ring-blue-500/30 border-blue-500"
                          )}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <div className="flex items-center gap-2 truncate pr-2">
                              <span className="text-xs font-black text-slate-900 uppercase truncate">{v.name}</span>
                              {isPlateMatch && <Zap className="w-3 h-3 text-blue-500 fill-blue-500" title="Placa Correspondente" />}
                            </div>
                            {v.rule === 'SEMPRE_LIBERADO' ? (
                              <Shield className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <ShieldAlert className="w-4 h-4 text-amber-500" />
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold text-slate-500 uppercase">{v.relationship || 'Frequente'}</span>
                            <span className={cn(
                              "text-[9px] font-black uppercase px-1.5 rounded",
                              v.rule === 'SEMPRE_LIBERADO' ? "bg-emerald-200 text-emerald-800" : "bg-amber-200 text-amber-800"
                            )}>
                              {v.rule === 'SEMPRE_LIBERADO' ? 'Sempre Liberado' : 'Avisar Antes'}
                            </span>
                          </div>
                          
                          <div className="mt-3 flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleUseFrequent(v)}
                              className="flex-1 py-2 bg-white/50 rounded-xl text-[9px] font-black text-slate-600 uppercase hover:bg-white transition-colors border border-slate-200/50"
                            >
                              USAR DADOS
                            </button>
                            <button
                              type="button"
                              onClick={() => onReleaseDirect(v)}
                              className={cn(
                                "flex-[2] py-2 rounded-xl text-[9px] font-black text-white uppercase transition-all active:scale-95 flex items-center justify-center gap-1 shadow-sm",
                                v.rule === 'SEMPRE_LIBERADO' ? "bg-emerald-600 hover:bg-emerald-700" : "bg-amber-500 hover:bg-amber-600"
                              )}
                            >
                              <Zap className="w-3 h-3 fill-white" />
                              {v.rule === 'SEMPRE_LIBERADO' ? 'LIBERAR DIRETO' : 'CONFIRMAR E LIBERAR'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {matchingPreAuths.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-[10px] font-black text-purple-500 uppercase tracking-widest px-1">Pré-Autorizações Encontradas</h3>
                  <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {matchingPreAuths.map((p) => {
                      const isPlateMatch = formData.plate && p.plate?.toLowerCase() === formData.plate.toLowerCase();
                      return (
                        <div
                          key={p.id}
                          className={cn(
                            "shrink-0 p-3 rounded-2xl border-2 transition-all text-left min-w-[200px] group relative bg-purple-50 border-purple-100 hover:border-purple-500",
                            isPlateMatch && "ring-4 ring-blue-500/30 border-blue-500"
                          )}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <div className="flex items-center gap-2 truncate pr-2">
                              <span className="text-xs font-black text-slate-900 uppercase truncate">{p.name}</span>
                              {isPlateMatch && <Zap className="w-3 h-3 text-blue-500 fill-blue-500" title="Placa Correspondente" />}
                            </div>
                            <Calendar className="w-4 h-4 text-purple-500" />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold text-slate-500 uppercase">Pré-autorizado</span>
                            <span className="text-[9px] font-black uppercase px-1.5 rounded bg-purple-200 text-purple-800">
                              Válido até {format(new Date(p.validity), 'HH:mm')}
                            </span>
                          </div>
                          
                          <div className="mt-3 flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  name: p.name,
                                  plate: p.plate || '',
                                  deliverySubtype: p.deliverySubtype || formData.deliverySubtype,
                                  notes: p.observation || '',
                                  origin: 'pre_autorizacao',
                                });
                                toast.info(`Dados de ${p.name} carregados!`);
                              }}
                              className="flex-1 py-2 bg-white/50 rounded-xl text-[9px] font-black text-slate-600 uppercase hover:bg-white transition-colors border border-slate-200/50"
                            >
                              USAR DADOS
                            </button>
                            <button
                              type="button"
                              onClick={() => onReleasePreAuth(p)}
                              className="flex-[2] py-2 bg-purple-600 hover:bg-purple-700 rounded-xl text-[9px] font-black text-white uppercase transition-all active:scale-95 flex items-center justify-center gap-1 shadow-sm"
                            >
                              <Check className="w-3 h-3" />
                              LIBERAR AUTORIZADO
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <form id="access-form" onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4">
            {/* LINHA 1: Destino e Placa */}
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <Home className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                <input
                  autoFocus
                  required
                  type="text"
                  placeholder="Casa / Apto"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 focus:bg-white outline-none transition-all text-lg font-medium"
                  value={destSearch}
                  onChange={(e) => {
                    setDestSearch(e.target.value);
                    setShowDestSuggestions(true);
                  }}
                  onFocus={() => setShowDestSuggestions(true)}
                />
                
                <AnimatePresence>
                  {showDestSuggestions && filteredResidents.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="absolute z-10 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
                    >
                      {filteredResidents.map((r, i) => (
                        <button
                          key={i}
                          type="button"
                          className="w-full px-4 py-3 text-left hover:bg-blue-50 flex justify-between items-center border-b border-slate-50 last:border-0"
                          onClick={() => {
                            setDestSearch(r.unit);
                            setShowDestSuggestions(false);
                          }}
                        >
                          <span className="font-bold text-slate-900">{r.unit}</span>
                          <span className="text-sm text-slate-500">{r.name}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="relative">
                <Car className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                <input
                  required={!fastFlow}
                  type="text"
                  placeholder={fastFlow ? "Ex: FORD KA PL AVR6H66 (Opcional)" : "Ex: FORD KA PL AVR6H66 (Obrigatório)"}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 focus:bg-white outline-none transition-all text-lg font-medium uppercase"
                  value={formData.plate}
                  onChange={(e) => setFormData({ ...formData, plate: e.target.value })}
                />
              </div>
            </div>

            {/* LINHA 2: Tipo de Entrega (Apenas para Entrega) */}
            {type === 'delivery' && (
              <div className="relative">
                <Package className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                <select
                  required
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 focus:bg-white outline-none transition-all text-lg font-medium appearance-none"
                  value={formData.deliverySubtype}
                  onChange={(e) => setFormData({ ...formData, deliverySubtype: e.target.value as DeliverySubtype })}
                >
                  <option value="" disabled>Selecione o Tipo de Entrega</option>
                  <option value="motoboy">Motoboy</option>
                  <option value="delivery">Delivery (iFood/Rappi)</option>
                  <option value="transportadora">Transportadora</option>
                  <option value="correios_encomenda">Correios / Encomenda</option>
                  <option value="outro">Outro</option>
                </select>
                <div className="absolute right-3 top-4 pointer-events-none text-slate-400">
                  <ChevronDown className="w-5 h-5" />
                </div>
              </div>
            )}

            {/* LINHA 3: Nome Completo */}
            <div className="relative">
              <User className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Nome Completo (Opcional)"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 focus:bg-white outline-none transition-all text-lg font-medium"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            {/* LINHA 4: Cor do Veículo */}
            <div className="relative">
              <Car className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Cor do Veículo (Opcional)"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 focus:bg-white outline-none transition-all text-lg font-medium"
                value={formData.vehicleColor}
                onChange={(e) => setFormData({ ...formData, vehicleColor: e.target.value })}
              />
            </div>

            {/* Campos Adicionais (Restaurados) */}
            <div className="pt-4 border-t border-slate-100 mt-4">
              <button 
                type="button"
                onClick={() => setShowAdditional(!showAdditional)}
                className="w-full flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-blue-500 transition-colors"
              >
                <span>{showAdditional ? '- Menos Informações' : '+ Mais Informações (Documento, Notas)'}</span>
                <div className={cn("transition-transform", showAdditional ? "rotate-180" : "")}>
                  <ChevronDown className="w-4 h-4" />
                </div>
              </button>
              
              <AnimatePresence>
                {showAdditional && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-4 space-y-4 overflow-hidden"
                  >
                    <div className="relative">
                      <FileText className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="RG / CPF (Opcional)"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 focus:bg-white outline-none transition-all text-lg font-medium"
                        value={formData.document}
                        onChange={(e) => setFormData({ ...formData, document: e.target.value })}
                      />
                    </div>
                    <div className="relative">
                      <FileText className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                      <textarea
                        placeholder="Observações adicionais..."
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 focus:bg-white outline-none transition-all text-lg font-medium min-h-[80px]"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </form>
      </div>

      {/* Footer Fixo */}
      <div className="p-6 pt-4 border-t border-slate-100 bg-white shrink-0">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all active:scale-95"
          >
            CANCELAR
          </button>
          <button
            type="submit"
            form="access-form"
            className="flex-[2] py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <Check className="w-6 h-6" />
            {fastFlow ? 'SALVAR RÁPIDO' : 'LIBERAR ACESSO'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
