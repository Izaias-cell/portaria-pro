import React, { useMemo } from 'react';
import { FrequentVisitor, PreAuthorization, AccessRecord, AccessType, UnitRules } from '../types';
import { User, Package, Wrench, Zap, Shield, ShieldAlert, Calendar, Clock, LogOut, Plus, Search, MapPin, Car, Check, MessageSquare, AlertTriangle, Info } from 'lucide-react';
import { cn } from '../lib/utils';
import { format, isAfter } from 'date-fns';
import { motion } from 'motion/react';

interface UnifiedSearchResultsProps {
  searchTerm: string;
  frequentVisitors: FrequentVisitor[];
  preAuths: PreAuthorization[];
  unitRules: UnitRules[];
  records: AccessRecord[];
  onReleaseDirect: (visitor: FrequentVisitor) => void;
  onReleasePreAuth: (preAuth: PreAuthorization) => void;
  onExit: (id: string) => void;
  onManualEntry: (type: AccessType, initialData?: any) => void;
}

export function UnifiedSearchResults({
  searchTerm,
  frequentVisitors,
  preAuths,
  unitRules,
  records,
  onReleaseDirect,
  onReleasePreAuth,
  onExit,
  onManualEntry
}: UnifiedSearchResultsProps) {
  const normalizedSearch = searchTerm.toLowerCase().trim();

  const results = useMemo(() => {
    if (!normalizedSearch) return null;

    const matches = (text?: string) => text?.toLowerCase().includes(normalizedSearch);

    const filteredFrequents = frequentVisitors.filter(v => 
      v.active && (matches(v.name) || matches(v.unit) || matches(v.plate))
    );

    const filteredPreAuths = preAuths.filter(p => 
      (p.status === 'autorizada' || p.status === 'pendente_confirmacao') && 
      isAfter(new Date(p.validity), new Date()) &&
      (matches(p.name) || matches(p.unit) || matches(p.plate))
    );

    const filteredRecords = records.filter(r => 
      matches(r.name) || matches(r.destination) || matches(r.plate)
    ).slice(0, 5); // Limit recent records

    return {
      frequents: filteredFrequents,
      preAuths: filteredPreAuths,
      records: filteredRecords
    };
  }, [normalizedSearch, frequentVisitors, preAuths, records]);

  if (!results) return null;

  const hasAnyResult = results.frequents.length > 0 || results.preAuths.length > 0 || results.records.length > 0;

  return (
    <div className="space-y-6 px-4 py-2">
      {!hasAnyResult && (
        <div className="text-center py-8 bg-white rounded-3xl border border-dashed border-slate-200">
          <Search className="w-12 h-12 mx-auto mb-3 text-slate-200" />
          <p className="text-slate-500 font-bold">Nenhum cadastro encontrado para "{searchTerm}"</p>
          <div className="mt-4 flex justify-center gap-2">
            <button
              onClick={() => onManualEntry('visitor', { name: searchTerm })}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-200 active:scale-95 transition-all"
            >
              CADASTRAR NOVA ENTRADA
            </button>
          </div>
        </div>
      )}

      {/* VISITANTES FREQUENTES */}
      {results.frequents.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-widest px-1 flex items-center gap-2">
            <Zap className="w-3 h-3 fill-blue-500" />
            Visitantes Frequentes
          </h3>
          <div className="grid gap-3">
            {results.frequents.map(v => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={v.id}
                className={cn(
                  "bg-white border-2 rounded-2xl p-4 shadow-sm flex items-center gap-4 transition-all",
                  v.rule === 'SEMPRE_LIBERADO' ? "border-emerald-100" : "border-amber-100"
                )}
              >
                <div className={cn(
                  "p-3 rounded-xl shrink-0",
                  v.type === 'visitor' ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"
                )}>
                  {v.type === 'visitor' ? <User className="w-6 h-6" /> : <Package className="w-6 h-6" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-900 truncate uppercase tracking-tight">{v.name}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={cn(
                          "text-[9px] font-black uppercase px-1.5 py-0.5 rounded",
                          v.rule === 'SEMPRE_LIBERADO' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                        )}>
                          {v.rule === 'SEMPRE_LIBERADO' ? 'Sempre Liberado' : 'Avisar Antes'}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">{v.unit}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => onReleaseDirect(v)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-[10px] font-black text-white uppercase transition-all active:scale-95 shadow-sm",
                        v.rule === 'SEMPRE_LIBERADO' ? "bg-emerald-600 hover:bg-emerald-700" : "bg-amber-500 hover:bg-amber-600"
                      )}
                    >
                      {v.rule === 'SEMPRE_LIBERADO' ? 'LIBERAR DIRETO' : 'CONFIRMAR E LIBERAR'}
                    </button>
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    {v.plate && (
                      <div className="flex items-center gap-1 text-slate-500 text-[10px] font-bold">
                        <Car className="w-3 h-3" />
                        <span className="font-mono uppercase">{v.plate}</span>
                      </div>
                    )}
                    <span className="text-[10px] text-slate-400 italic truncate">{v.relationship || 'Frequente'}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* PRÉ-AUTORIZAÇÕES */}
      {results.preAuths.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-[10px] font-black text-purple-500 uppercase tracking-widest px-1 flex items-center gap-2">
            <Calendar className="w-3 h-3" />
            Pré-Autorizações
          </h3>
          <div className="grid gap-3">
            {results.preAuths.map(p => {
              const rules = unitRules.find(r => r.unit === p.unit);
              return (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={p.id}
                  className={cn(
                    "bg-white border-2 rounded-2xl p-4 shadow-sm flex flex-col gap-3 transition-all",
                    p.status === 'autorizada' ? "border-purple-100" : "border-amber-100"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "p-3 rounded-xl shrink-0",
                      p.status === 'autorizada' ? "bg-purple-50 text-purple-600" : "bg-amber-50 text-amber-600"
                    )}>
                      {p.type === 'visitor' ? <User className="w-6 h-6" /> : p.type === 'delivery' ? <Package className="w-6 h-6" /> : <Wrench className="w-6 h-6" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-slate-900 truncate uppercase tracking-tight">{p.name}</h4>
                          <div className="flex flex-wrap items-center gap-2 mt-0.5">
                            <span className={cn(
                              "text-[9px] font-black uppercase px-1.5 py-0.5 rounded",
                              p.status === 'autorizada' ? "bg-purple-100 text-purple-700" : "bg-amber-100 text-amber-700"
                            )}>
                              {p.status === 'autorizada' ? 'Autorizado' : 'Pendente Confirmação'}
                            </span>
                            {p.origin === 'whatsapp' && (
                              <span className={cn(
                                "text-[9px] font-black uppercase px-1.5 py-0.5 rounded flex items-center gap-1",
                                p.whatsappMetadata?.trustStatus === 'vinculada' 
                                  ? "bg-emerald-100 text-emerald-700" 
                                  : "bg-amber-100 text-amber-700"
                              )}>
                                <MessageSquare className="w-2 h-2" />
                                {p.whatsappMetadata?.trustStatus === 'vinculada' ? 'WhatsApp Vinculado' : 'WhatsApp Não Reconhecido'}
                              </span>
                            )}
                            <span className="text-[9px] font-bold text-slate-400 uppercase">{p.unit}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => onReleasePreAuth(p)}
                          className={cn(
                            "px-4 py-2 rounded-xl text-[10px] font-black text-white uppercase transition-all active:scale-95 shadow-sm",
                            p.status === 'autorizada' ? "bg-purple-600 hover:bg-purple-700" : "bg-amber-500 hover:bg-amber-600"
                          )}
                        >
                          {p.status === 'autorizada' ? 'LIBERAR AUTORIZADO' : 'CONFIRMAR E LIBERAR'}
                        </button>
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1 text-slate-500 text-[10px] font-bold">
                          <Clock className="w-3 h-3" />
                          <span>Válido até {format(new Date(p.validity), 'dd/MM HH:mm')}</span>
                        </div>
                        {p.plate && (
                          <div className="flex items-center gap-1 text-slate-500 text-[10px] font-bold">
                            <Car className="w-3 h-3" />
                            <span className="font-mono uppercase">{p.plate}</span>
                          </div>
                        )}
                        {p.isOutsideTimeLimit && (
                          <div className="flex items-center gap-1 text-orange-600 text-[10px] font-black uppercase">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Fora do Horário Padrão</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {(rules?.fixedObservation || p.observation) && (
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
                      {p.observation && (
                        <p className="text-[10px] text-slate-400 italic px-1 truncate">
                          {p.observation}
                        </p>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

      {/* REGISTROS RECENTES / EM ANDAMENTO */}
      {results.records.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
            <Clock className="w-3 h-3" />
            Registros Recentes / Em Andamento
          </h3>
          <div className="grid gap-3">
            {results.records.map(r => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={r.id}
                className={cn(
                  "bg-white border rounded-2xl p-4 shadow-sm flex items-center gap-4 transition-all",
                  r.status === 'em_andamento' ? "border-blue-100" : "border-slate-100 opacity-70"
                )}
              >
                <div className={cn(
                  "p-3 rounded-xl shrink-0",
                  r.type === 'visitor' ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"
                )}>
                  {r.type === 'visitor' ? <User className="w-6 h-6" /> : <Package className="w-6 h-6" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-900 truncate uppercase tracking-tight">{r.name}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={cn(
                          "text-[9px] font-black uppercase px-1.5 py-0.5 rounded",
                          r.status === 'em_andamento' ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"
                        )}>
                          {r.status === 'em_andamento' ? 'Em Andamento' : 'Finalizado'}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">{r.destination}</span>
                      </div>
                    </div>
                    {r.status === 'em_andamento' && (
                      <button
                        onClick={() => onExit(r.id)}
                        className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-[10px] font-black text-white uppercase transition-all active:scale-95 shadow-sm flex items-center gap-1"
                      >
                        <LogOut className="w-3 h-3" />
                        SAÍDA
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-[10px] text-slate-400 font-bold">
                      {format(new Date(r.timestamp), 'HH:mm')}
                    </span>
                    {r.plate && (
                      <div className="flex items-center gap-1 text-slate-500 text-[10px] font-bold">
                        <Car className="w-3 h-3" />
                        <span className="font-mono uppercase">{r.plate}</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* NOVO CADASTRO MANUAL */}
      <section className="pt-2">
        <button
          onClick={() => onManualEntry('visitor', { name: searchTerm })}
          className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-slate-200 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          CADASTRAR NOVA ENTRADA MANUAL
        </button>
      </section>
    </div>
  );
}
