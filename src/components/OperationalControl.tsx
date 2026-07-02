import React, { useState } from 'react';
import { Sliders, Zap, AlertCircle, RefreshCw, Trash2, ShieldCheck, Clock, UserCheck, Power, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { UnitPhone, UserRole } from '../types';
import { UnitPhoneManager } from './UnitPhoneManager';

export interface OperationalLog {
  id: string;
  timestamp: string;
  action: string;
  operator: string;
}

interface OperationalControlProps {
  operator: string;
  logs: OperationalLog[];
  onTriggerAction: (actionId: 'stuck' | 'ocr' | 'reload' | 'waiting') => void;
  onClearLogs?: () => void;
  userRole?: UserRole;
  unitPhones?: UnitPhone[];
  onUpdateUnitPhones?: (phones: UnitPhone[]) => void;
  onClearUnitPhones?: () => void;
}

export function OperationalControl({ 
  operator, 
  logs, 
  onTriggerAction, 
  onClearLogs,
  userRole = 'porteiro',
  unitPhones = [],
  onUpdateUnitPhones = () => {},
  onClearUnitPhones = () => {}
}: OperationalControlProps) {
  const [activeTab, setActiveTab] = useState<'emergencia' | 'telefones'>('emergencia');

  const actionsList = [
    {
      id: 'stuck' as const,
      title: 'ENCERRAR AÇÕES TRAVADAS',
      description: 'Encerra atendimentos em andamento, limpa rascunhos e fecha formulários abertos sem salvar dados.',
      icon: Power,
      color: 'bg-rose-50 border-rose-200 hover:border-rose-400 text-rose-700 hover:bg-rose-100/50',
      iconColor: 'bg-rose-100 text-rose-600'
    },
    {
      id: 'ocr' as const,
      title: 'LIMPAR OCR TEMPORÁRIO',
      description: 'Zera completamente caches, uploads de prints de UBER e metadados de imagem temporários salvos na sessão.',
      icon: Zap,
      color: 'bg-amber-50 border-amber-200 hover:border-amber-400 text-amber-700 hover:bg-amber-100/50',
      iconColor: 'bg-amber-100 text-amber-600'
    },
    {
      id: 'reload' as const,
      title: 'RECARREGAR FLUXO',
      description: 'Limpa a barra de pesquisa, redefine filtros de acesso, restaura áudio do terminal e desmarca focos ativos.',
      icon: RefreshCw,
      color: 'bg-indigo-50 border-indigo-200 hover:border-indigo-400 text-indigo-700 hover:bg-indigo-100/50',
      iconColor: 'bg-indigo-100 text-indigo-600'
    },
    {
      id: 'waiting' as const,
      title: 'LIMPAR FILA AGUARDANDO',
      description: 'Apaga a fila temporária de pré-autorizações marcadas como aguardando chegada na guarita.',
      icon: Trash2,
      color: 'bg-sky-50 border-sky-200 hover:border-sky-400 text-sky-700 hover:bg-sky-100/50',
      iconColor: 'bg-sky-100 text-sky-600'
    }
  ];

  return (
    <div id="operational-control-container" className="space-y-6">
      {/* HEADER SECTION */}
      <div className="bg-white p-6 rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Sliders className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest">Controle Operacional</h2>
          </div>
          <p className="text-xs text-slate-400 font-bold uppercase leading-relaxed max-w-xl">
            {activeTab === 'emergencia' 
              ? "Ações de destrave rápido do terminal da portaria. Modificações agem apenas em estados temporários de fluxo."
              : "Gerenciamento rápido de contatos e telefones das unidades condominiais."}
          </p>
        </div>
        
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-2xl">
          <UserCheck className="w-4 h-4 text-slate-500" />
          <div className="flex flex-col">
            <span className="text-[8px] font-black uppercase text-slate-400">Operador Ativo</span>
            <span className="text-xs font-black uppercase text-slate-700 leading-none">{operator}</span>
          </div>
        </div>
      </div>

      {/* TABS FOR PORTEIRO */}
      <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200/60 shadow-sm max-w-md">
        <button
          onClick={() => setActiveTab('emergencia')}
          className={cn(
            "flex-1 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2",
            activeTab === 'emergencia' ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-600"
          )}
        >
          <Sliders className="w-3.5 h-3.5" />
          Atalhos de Emergência
        </button>
        <button
          onClick={() => setActiveTab('telefones')}
          className={cn(
            "flex-1 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2",
            activeTab === 'telefones' ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-600"
          )}
        >
          <Phone className="w-3.5 h-3.5" />
          Telefones Úteis
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'emergencia' ? (
          <motion.div
            key="emergencia-pane"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* SECURITY NOTICE BAR */}
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <h4 className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">Modo Seguro de Emergência Ativo</h4>
                <p className="text-[9px] font-extrabold text-emerald-700/80 uppercase leading-normal">
                  Nenhuma ação abaixo remove moradores, altera números vinculados, regras de unidade ou logs históricos. Operação 100% blindada contra perdas de dados operacionais estáveis.
                </p>
              </div>
            </div>

            {/* ACTION ACCORDIONS / GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {actionsList.map((act) => {
                const Icon = act.icon;
                return (
                  <motion.div
                    key={act.id}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => onTriggerAction(act.id)}
                    className={cn(
                      "p-5 rounded-[2rem] border-2 cursor-pointer transition-all flex items-start gap-4 shadow-sm",
                      act.color
                    )}
                  >
                    <div className={cn("p-3 rounded-2xl shrink-0 shadow-inner", act.iconColor)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="space-y-1.5 min-w-0">
                      <h3 className="text-xs font-black uppercase tracking-wider leading-none">{act.title}</h3>
                      <p className="text-[10px] font-bold opacity-60 leading-relaxed uppercase">
                        {act.description}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* OPERATIONAL EVENT LOGS */}
            <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-100 overflow-hidden">
              <div className="px-6 py-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-700" />
                  <h3 className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
                    Logs do Controle Operacional (Sessão)
                  </h3>
                </div>
                {userRole === 'sindico' && logs.length > 0 && onClearLogs && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onClearLogs(); }}
                    className="px-3 py-1 bg-red-100 text-red-600 hover:bg-red-200 text-[10px] font-black uppercase rounded-lg transition-all"
                  >
                    Excluir Logs
                  </button>
                )}
              </div>

              <div className="p-6">
                <div className="bg-slate-900 rounded-2xl p-4 font-mono text-emerald-400 text-[11px] leading-relaxed max-h-[250px] overflow-y-auto space-y-2 border border-slate-800">
                  <AnimatePresence initial={false}>
                    {logs.map((log) => (
                      <motion.div 
                        key={log.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-start gap-2 border-b border-slate-800/50 pb-1.5 last:border-0 last:pb-0 font-medium whitespace-pre-wrap uppercase"
                      >
                        <span className="text-slate-500 leading-none select-none shrink-0">[OPER]</span>
                        <p className="leading-snug">
                          <span className="text-blue-400">{log.timestamp}</span> - {log.action} <span className="text-slate-400">(OP: {log.operator})</span>
                        </p>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {logs.length === 0 && (
                    <div className="text-center text-slate-500 py-6 uppercase font-bold text-[10px] tracking-wider">
                      &gt; Aguardando execuções de ações operacionais...
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="telefones-pane"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <UnitPhoneManager 
              unitPhones={unitPhones}
              onUpdate={onUpdateUnitPhones}
              onClearAll={onClearUnitPhones}
              readOnly={false}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
