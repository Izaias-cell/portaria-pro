import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { QuickActions } from './components/QuickActions';
import { AccessForm } from './components/AccessForm';
import { AccessLog } from './components/AccessLog';
import { AccessType, AccessRecord, FrequentVisitor, AccessRule, PreAuthorization, UnitPhone, UnitRules } from './types';
import { Toaster, toast } from 'sonner';
import { Search, Filter, Trash2, Download, Check, Users, Home as HomeIcon, Calendar, Shield } from 'lucide-react';
import { FrequentVisitorManager } from './components/FrequentVisitorManager';
import { PreAuthorizationManager } from './components/PreAuthorizationManager';
import { AdminPanel } from './components/AdminPanel';
import { WhatsAppService, WhatsAppMessage } from './services/WhatsAppService';
import { UnifiedSearchResults } from './components/UnifiedSearchResults';
import { AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

export default function App() {
  const [view, setView] = useState<'portaria' | 'frequentes' | 'preauth' | 'admin'>('portaria');
  const [records, setRecords] = useState<AccessRecord[]>(() => {
    const saved = localStorage.getItem('portaria_records');
    if (saved) {
      try {
        return JSON.parse(saved).map((r: any) => ({
          ...r,
          timestamp: new Date(r.timestamp),
          exitTimestamp: r.exitTimestamp ? new Date(r.exitTimestamp) : undefined
        }));
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [frequentVisitors, setFrequentVisitors] = useState<FrequentVisitor[]>(() => {
    const saved = localStorage.getItem('portaria_frequentes');
    if (saved) {
      try {
        return JSON.parse(saved).map((v: any) => ({
          ...v,
          createdAt: new Date(v.createdAt),
          updatedAt: new Date(v.updatedAt)
        }));
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [preAuths, setPreAuths] = useState<PreAuthorization[]>(() => {
    const saved = localStorage.getItem('portaria_preauths');
    if (saved) {
      try {
        return JSON.parse(saved).map((p: any) => ({
          ...p,
          validity: new Date(p.validity),
          createdAt: new Date(p.createdAt),
          updatedAt: new Date(p.updatedAt)
        }));
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [unitPhones, setUnitPhones] = useState<UnitPhone[]>(() => {
    const saved = localStorage.getItem('portaria_unit_phones');
    if (saved) {
      try {
        return JSON.parse(saved).map((p: any) => ({
          ...p,
          createdAt: new Date(p.createdAt),
          updatedAt: new Date(p.updatedAt)
        }));
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [unitRules, setUnitRules] = useState<UnitRules[]>(() => {
    const saved = localStorage.getItem('portaria_unit_rules');
    if (saved) {
      try {
        return JSON.parse(saved).map((r: any) => ({
          ...r,
          updatedAt: new Date(r.updatedAt)
        }));
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [activeForm, setActiveForm] = useState<AccessType | null>(null);
  const [initialFormData, setInitialFormData] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<AccessType | 'all'>('all');
  const [fastFlow, setFastFlow] = useState(false);

  useEffect(() => {
    localStorage.setItem('portaria_records', JSON.stringify(records));
  }, [records]);

  useEffect(() => {
    localStorage.setItem('portaria_frequentes', JSON.stringify(frequentVisitors));
  }, [frequentVisitors]);

  useEffect(() => {
    localStorage.setItem('portaria_preauths', JSON.stringify(preAuths));
  }, [preAuths]);

  useEffect(() => {
    localStorage.setItem('portaria_unit_phones', JSON.stringify(unitPhones));
  }, [unitPhones]);

  useEffect(() => {
    localStorage.setItem('portaria_unit_rules', JSON.stringify(unitRules));
  }, [unitRules]);

  const handleAddRecord = (data: Partial<AccessRecord>) => {
    if (!activeForm) return;

    const newRecord: AccessRecord = {
      id: crypto.randomUUID(),
      type: activeForm,
      deliverySubtype: activeForm === 'delivery' ? data.deliverySubtype : undefined,
      fastFlow: data.fastFlow,
      name: data.name || 'N/A',
      document: data.document,
      plate: data.plate,
      vehicleModel: data.vehicleModel,
      vehicleColor: data.vehicleColor,
      destination: data.destination || 'N/A',
      timestamp: new Date(),
      status: 'em_andamento',
      notes: data.notes,
      origin: data.origin || 'manual',
      ruleUsed: data.ruleUsed,
    };

    setRecords([newRecord, ...records]);
    setActiveForm(null);
    toast.success('Acesso liberado com sucesso!', {
      description: `${newRecord.name} entrou para ${newRecord.destination}`,
      icon: <div className="bg-emerald-100 p-1 rounded text-emerald-600"><Check className="w-4 h-4" /></div>
    });
    setInitialFormData(null);
  };

  const handleManualEntry = (type: AccessType, data?: any) => {
    setInitialFormData(data);
    setActiveForm(type);
  };

  const handleReleaseDirect = (visitor: FrequentVisitor) => {
    const newRecord: AccessRecord = {
      id: crypto.randomUUID(),
      type: visitor.type,
      deliverySubtype: visitor.deliverySubtype,
      name: visitor.name,
      plate: visitor.plate,
      destination: visitor.unit,
      timestamp: new Date(),
      status: 'em_andamento',
      notes: visitor.relationship || visitor.observation,
      origin: 'visitante_frequente',
      ruleUsed: visitor.rule,
    };

    setRecords([newRecord, ...records]);
    toast.success('Acesso liberado com sucesso!', {
      description: `${newRecord.name} entrou para ${newRecord.destination}`,
      icon: <div className="bg-emerald-100 p-1 rounded text-emerald-600"><Check className="w-4 h-4" /></div>
    });
    
    // If we are in portaria view and a form is open, close it
    setActiveForm(null);
  };

  const handleReleasePreAuth = (preAuth: PreAuthorization) => {
    const newRecord: AccessRecord = {
      id: crypto.randomUUID(),
      type: preAuth.type,
      deliverySubtype: preAuth.deliverySubtype,
      name: preAuth.name,
      plate: preAuth.plate,
      destination: preAuth.unit,
      timestamp: new Date(),
      status: 'em_andamento',
      notes: preAuth.observation,
      origin: preAuth.origin === 'whatsapp' ? 'whatsapp' : 'pre_autorizacao',
    };

    setRecords([newRecord, ...records]);
    
    // Mark pre-auth as used
    setPreAuths(preAuths.map(p => 
      p.id === preAuth.id ? { ...p, status: 'utilizada', updatedAt: new Date() } : p
    ));

    toast.success('Acesso liberado com sucesso!', {
      description: `${newRecord.name} entrou para ${newRecord.destination} (Pré-autorizado)`,
      icon: <div className="bg-emerald-100 p-1 rounded text-emerald-600"><Check className="w-4 h-4" /></div>
    });
    
    setActiveForm(null);
    setSearchTerm('');
  };

  const handleExit = (id: string) => {
    setRecords(records.map(r => 
      r.id === id ? { ...r, status: 'finalizado', exitTimestamp: new Date() } : r
    ));
    toast.info('Saída registrada com sucesso!');
  };

  const handleWhatsAppMessage = (message: WhatsAppMessage) => {
    const parsed = WhatsAppService.parseMessage(message, unitPhones, unitRules);
    setPreAuths([parsed as PreAuthorization, ...preAuths]);
  };

  const handleClear = () => {
    if (confirm('Deseja limpar todos os registros de hoje?')) {
      setRecords([]);
      toast.error('Registros apagados.');
    }
  };

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const matchesSearch = 
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.plate?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = filterType === 'all' || r.type === filterType;
      
      return matchesSearch && matchesFilter;
    });
  }, [records, searchTerm, filterType]);

  const activeRecords = useMemo(() => filteredRecords.filter(r => r.status === 'em_andamento'), [filteredRecords]);
  const completedRecords = useMemo(() => filteredRecords.filter(r => r.status === 'finalizado'), [filteredRecords]);

  const stats = useMemo(() => {
    const today = new Date().setHours(0,0,0,0);
    const todayRecords = records.filter(r => new Date(r.timestamp).setHours(0,0,0,0) === today);
    return {
      total: todayRecords.length,
      active: todayRecords.filter(r => r.status === 'em_andamento').length,
      exited: todayRecords.filter(r => r.status === 'finalizado').length,
    };
  }, [records]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-blue-100">
      <Toaster position="top-center" expand={true} richColors />
      
      <Header />

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto flex">
          <button
            onClick={() => setView('portaria')}
            className={cn(
              "flex-1 py-4 flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest transition-all border-b-4",
              view === 'portaria' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            <HomeIcon className="w-4 h-4" />
            Portaria
          </button>
          <button
            onClick={() => setView('frequentes')}
            className={cn(
              "flex-1 py-4 flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest transition-all border-b-4",
              view === 'frequentes' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            <Users className="w-4 h-4" />
            Frequentes
          </button>
          <button
            onClick={() => setView('preauth')}
            className={cn(
              "flex-1 py-4 flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest transition-all border-b-4",
              view === 'preauth' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            <Calendar className="w-4 h-4" />
            Pré-Autorização
          </button>
          <button
            onClick={() => setView('admin')}
            className={cn(
              "flex-1 py-4 flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest transition-all border-b-4",
              view === 'admin' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            <Shield className="w-4 h-4" />
            Administração
          </button>
        </div>
      </div>

      <main className="flex-1 max-w-4xl mx-auto w-full pb-20 sm:pb-8">
        {view === 'portaria' ? (
          <>
            {/* Search Bar - Prominent at Top */}
            <div className="px-4 pt-4">
              <div className="relative group">
                <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="text"
                  placeholder="Pesquisar por casa, nome, placa ou veículo..."
                  className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {searchTerm ? (
              <UnifiedSearchResults
                searchTerm={searchTerm}
                frequentVisitors={frequentVisitors}
                preAuths={preAuths}
                unitRules={unitRules}
                records={records}
                onReleaseDirect={handleReleaseDirect}
                onReleasePreAuth={handleReleasePreAuth}
                onExit={handleExit}
                onManualEntry={handleManualEntry}
              />
            ) : (
              <>
                {/* Quick Stats & Fast Flow Toggle */}
                <div className="px-4 pt-4 space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm text-center">
                      <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</span>
                      <span className="text-xl font-black text-slate-900">{stats.total}</span>
                    </div>
                    <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm text-center">
                      <span className="block text-[10px] font-black text-emerald-400 uppercase tracking-widest">Ativos</span>
                      <span className="text-xl font-black text-emerald-600">{stats.active}</span>
                    </div>
                    <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm text-center">
                      <span className="block text-[10px] font-black text-orange-400 uppercase tracking-widest">Saídas</span>
                      <span className="text-xl font-black text-orange-600">{stats.exited}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setFastFlow(!fastFlow)}
                    className={cn(
                      "w-full py-3 rounded-2xl border-2 flex items-center justify-center gap-2 transition-all font-black uppercase tracking-widest text-xs",
                      fastFlow 
                        ? "bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-200" 
                        : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
                    )}
                  >
                    <Search className={cn("w-4 h-4", fastFlow ? "animate-pulse" : "")} />
                    {fastFlow ? 'MODO FLUXO RÁPIDO ATIVADO' : 'ATIVAR MODO FLUXO RÁPIDO'}
                  </button>
                </div>

                <QuickActions onAction={setActiveForm} activeType={activeForm} />

                {/* Frequent Visitors - Quick Release */}
                <div className="px-4 mb-4">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Acesso Rápido (Frequentes)</h3>
                  <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {frequentVisitors.map((v, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          handleManualEntry(v.type as AccessType, { name: v.name, plate: v.plate, destination: v.unit });
                        }}
                        className="shrink-0 bg-white border border-slate-200 px-4 py-2 rounded-full text-xs font-bold text-slate-600 hover:border-blue-500 hover:text-blue-600 transition-all flex items-center gap-2 shadow-sm"
                      >
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          v.type === 'delivery' ? "bg-orange-500" : "bg-blue-500"
                        )} />
                        {v.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-6 mt-4">
                  <AccessLog 
                    title="EM ANDAMENTO / DENTRO DO CONDOMÍNIO" 
                    records={activeRecords} 
                    onExit={handleExit} 
                    emptyMessage="Ninguém dentro do condomínio no momento."
                  />
                  
                  <AccessLog 
                    title="FINALIZADOS / SAÍDA REGISTRADA" 
                    records={completedRecords} 
                    onExit={handleExit} 
                    emptyMessage="Nenhum acesso finalizado hoje."
                  />
                </div>

                {/* Footer Actions */}
                <div className="p-4 flex gap-3 justify-center">
                  <button 
                    onClick={handleClear}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    LIMPAR TUDO
                  </button>
                  <button 
                    className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-400 hover:text-blue-500 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    EXPORTAR LOG
                  </button>
                </div>
              </>
            )}

            <AnimatePresence>
              {activeForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                  <div className="w-full max-w-2xl max-h-full flex flex-col">
                    <AccessForm 
                      type={activeForm} 
                      fastFlow={fastFlow}
                      frequentVisitors={frequentVisitors}
                      preAuths={preAuths}
                      initialData={initialFormData}
                      onClose={() => {
                        setActiveForm(null);
                        setInitialFormData(null);
                      }} 
                      onSubmit={handleAddRecord}
                      onReleaseDirect={handleReleaseDirect}
                      onReleasePreAuth={handleReleasePreAuth}
                    />
                  </div>
                </div>
              )}
            </AnimatePresence>
          </>
        ) : view === 'frequentes' ? (
          <FrequentVisitorManager 
            visitors={frequentVisitors}
            onUpdate={setFrequentVisitors}
            onReleaseDirect={handleReleaseDirect}
          />
        ) : view === 'preauth' ? (
          <PreAuthorizationManager
            preAuths={preAuths}
            unitRules={unitRules}
            onUpdate={setPreAuths}
          />
        ) : (
          <AdminPanel 
            records={records}
            frequentVisitors={frequentVisitors}
            preAuths={preAuths}
            unitPhones={unitPhones}
            unitRules={unitRules}
            onUpdateFrequents={setFrequentVisitors}
            onUpdatePreAuths={setPreAuths}
            onUpdateUnitPhones={setUnitPhones}
            onUpdateUnitRules={setUnitRules}
            onWhatsAppMessage={handleWhatsAppMessage}
          />
        )}
      </main>

      {/* Mobile Bottom Bar for quick access if needed, but QuickActions is already prominent */}
    </div>
  );
}
