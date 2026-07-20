import React from 'react';
import { UnitPhone, MessageTemplates, AccessType, FrequentVisitor, AccessRecord, UnitRules } from '../types';
import { User, Bike, Wrench, MessageSquare, Phone, Check, Zap, Car, Shield, Bell, History, Info, Home } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '../lib/toast';

const getRelationshipColorClass = (relationship?: string) => {
  if (!relationship) return '';
  const rel = relationship.trim().toLowerCase();
  if (['mãe', 'mae', 'pai'].includes(rel)) {
    return 'text-red-500 font-extrabold';
  }
  if (['irmão', 'irmao', 'irmã', 'irma', 'primo', 'prima', 'tio', 'tia'].includes(rel)) {
    return 'text-blue-500 font-extrabold';
  }
  if (['amigo', 'amiga'].includes(rel)) {
    return 'text-orange-500 font-extrabold';
  }
  return 'text-slate-400';
};

interface ResidentContactCardProps {
  resident: UnitPhone;
  messageTemplates: MessageTemplates;
  condoName?: string;
  porterName?: string;
  searchTerm?: string;
  onNotify?: (type: AccessType) => void;
  pendingCounts?: Record<AccessType, number>;
  pendingRequests?: { id: string; unit: string; type: AccessType; residentName: string; visitorName?: string; draft?: any }[];
  preAuths?: any[];
  onReleasePendingAccess?: (request: { id: string; unit: string; type: AccessType; residentName: string; visitorName?: string; draft?: any }) => void;
  onReleasePreAuth?: (preAuth: any) => void;
  onCancelPendingAccess?: (request: any) => void;
  onCancelPreAuth?: (preAuth: any) => void;
  isSelected?: boolean;
  unitPhones?: UnitPhone[];
  frequentVisitors?: FrequentVisitor[];
  records?: AccessRecord[];
  unitRules?: UnitRules[];
  onReleaseDirect?: (visitor: FrequentVisitor) => void;
}

export function ResidentContactCard({ 
  resident, 
  messageTemplates, 
  condoName = "Condomínio",
  porterName = "Portaria",
  searchTerm = "",
  onNotify,
  pendingCounts,
  pendingRequests = [],
  preAuths = [],
  onReleasePendingAccess,
  onReleasePreAuth,
  onCancelPendingAccess,
  onCancelPreAuth,
  isSelected,
  unitPhones = [],
  frequentVisitors = [],
  records = [],
  unitRules = [],
  onReleaseDirect
}: ResidentContactCardProps) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Bom dia';
    if (hour >= 12 && hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  // Find all active residents in this unit
  const allResidents = unitPhones.filter(p => p.unit === resident.unit && p.active);

  // Filter unit specific data
  const unitFrequents = frequentVisitors.filter(v => v.unit === resident.unit && v.active);
  const unitRulesObj = unitRules.find(r => r.unit === resident.unit);
  const unitPreAuths = preAuths.filter(p => p.unit === resident.unit && (p.status === 'autorizada' || p.status === 'pendente_confirmacao' || p.status === 'pendente'));
  const unitHistory = records.filter(r => r.destination === resident.unit);

  return (
    <div className="space-y-4 max-w-4xl mx-auto w-full animate-in fade-in slide-in-from-top-4">
      
      {/* CARD 1: CARD UNIDADE COMPACTADO */}
      <div className={cn(
        "bg-white border-2 rounded-[1.25rem] p-4 shadow-md transition-all duration-300 flex flex-col gap-2",
        isSelected ? "border-blue-500 ring-8 ring-blue-500/10 shadow-blue-200/50 scale-[1.01]" : "border-blue-200 shadow-blue-50"
      )}>
        <div className="flex items-center gap-2 border-b border-slate-100 pb-1.5 mb-0.5">
          <Home className="w-4 h-4 text-blue-500" />
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
            UNIDADE {resident.unit}
          </h3>
        </div>

        <div className="space-y-0.5">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
            👥 MORADORES
          </span>
          <div className="grid grid-cols-2 gap-2 mt-1">
            {allResidents.length > 0 ? (
              allResidents.map((res, idx) => (
                <div key={res.id || idx} className="bg-slate-50 border border-slate-150 rounded-xl p-2 flex items-center justify-between gap-2.5 h-14">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-[10.5px] font-black text-slate-900 uppercase tracking-tight flex items-center gap-1 leading-tight">
                      <span className="truncate">{res.residentName}</span>
                      {res.isPrimary && (
                        <span className="text-[6.5px] font-black text-blue-700 bg-blue-100 px-1 py-0.5 rounded uppercase tracking-tighter shrink-0 border border-blue-200">
                          P
                        </span>
                      )}
                    </h4>
                    <div className="flex items-center gap-1 text-[9.5px] font-bold text-slate-500 mt-0.5 leading-none">
                      <Phone className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                      <span>{res.primaryPhone}</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      const phoneNumber = res.primaryPhone.replace(/\D/g, '');
                      const cleanPhone = phoneNumber.startsWith('55') ? phoneNumber : '55' + phoneNumber;
                      const greeting = getGreeting();
                      const message = `${greeting}, ${res.residentName}!`;
                      const encodedMessage = encodeURIComponent(message);
                      const url = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMessage}`;
                      
                      navigator.clipboard.writeText(message);
                      window.open(url, '_blank');
                      
                      toast.success('MENSAGEM COPIADA', {
                        description: `Conversa preparada para ${res.residentName}. Cole no WhatsApp.`,
                        duration: 3000,
                        icon: <MessageSquare className="w-4 h-4 text-emerald-600" />
                      });
                    }}
                    className="flex items-center justify-center gap-1 px-2 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[8px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm shadow-emerald-100 shrink-0"
                  >
                    <MessageSquare className="w-3.5 h-3.5 fill-white shrink-0" />
                    <span>Whats</span>
                  </button>
                </div>
              ))
            ) : (
              <div className="bg-slate-50 border border-slate-150 rounded-xl p-2 flex items-center justify-between gap-2.5 h-14 col-span-1">
                <div className="min-w-0 flex-1">
                  <h4 className="text-[10.5px] font-black text-slate-900 uppercase tracking-tight flex items-center gap-1 leading-tight">
                    <span className="truncate">{resident.residentName}</span>
                    {resident.isPrimary && (
                      <span className="text-[6.5px] font-black text-blue-700 bg-blue-100 px-1 py-0.5 rounded uppercase tracking-tighter shrink-0 border border-blue-200">
                        P
                      </span>
                    )}
                  </h4>
                  <div className="flex items-center gap-1 text-[9.5px] font-bold text-slate-500 mt-0.5 leading-none">
                    <Phone className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                    <span>{resident.primaryPhone}</span>
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    const phoneNumber = resident.primaryPhone.replace(/\D/g, '');
                    const cleanPhone = phoneNumber.startsWith('55') ? phoneNumber : '55' + phoneNumber;
                    const greeting = getGreeting();
                    const message = `${greeting}, ${resident.residentName}!`;
                    const encodedMessage = encodeURIComponent(message);
                    const url = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMessage}`;
                    
                    navigator.clipboard.writeText(message);
                    window.open(url, '_blank');
                    
                    toast.success('MENSAGEM COPIADA', {
                      description: `Conversa preparada para ${resident.residentName}. Cole no WhatsApp.`,
                      duration: 3000,
                      icon: <MessageSquare className="w-4 h-4 text-emerald-600" />
                    });
                  }}
                  className="flex items-center justify-center gap-1 px-2 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[8px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm shadow-emerald-100 shrink-0"
                >
                  <MessageSquare className="w-3.5 h-3.5 fill-white shrink-0" />
                  <span>Whats</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DEMAIS CARDS EM DUAS COLUNAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        {/* CARD 2: VISITANTES FREQUENTES */}
        <div className="bg-white border border-slate-100 rounded-[1.25rem] p-4 shadow-sm flex flex-col h-[180px] transition-all hover:shadow-md">
          <h3 className="text-[9px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2 mb-2.5 shrink-0">
            <Zap className="w-3.5 h-3.5 fill-blue-500 text-blue-500" />
            Visitantes Frequentes
          </h3>
          
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {unitFrequents.length > 0 ? (
              unitFrequents.map(v => (
                <div
                  key={v.id}
                  className="bg-slate-50 border border-slate-100 rounded-xl py-2 px-3 flex items-center justify-between gap-3 transition-all hover:bg-white hover:shadow-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={cn(
                      "w-7 h-7 rounded-md shrink-0 flex items-center justify-center shadow-inner",
                      v.type === 'visitor' ? "bg-emerald-50 text-emerald-600" :
                      v.type === 'delivery' ? "bg-orange-50 text-orange-600" :
                      "bg-blue-50 text-blue-600"
                    )}>
                      {v.type === 'visitor' ? <User className="w-4 h-4" /> : 
                       v.type === 'delivery' ? <Bike className="w-4 h-4" /> : 
                       <Wrench className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-slate-900 truncate uppercase text-[10.5px] leading-tight flex items-center gap-1">
                        <span>{v.name}</span>
                        {v.relationship && v.relationship.trim() && (
                          <span className={cn("text-[9px] uppercase font-black tracking-tight", getRelationshipColorClass(v.relationship))}>
                            ({v.relationship.trim().toUpperCase()})
                          </span>
                        )}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={cn(
                          "text-[7px] font-black uppercase px-1 py-0.5 rounded-md tracking-tighter border",
                          v.rule === 'SEMPRE_LIBERADO' 
                            ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                            : "bg-amber-50 text-amber-600 border-amber-100"
                        )}>
                          {v.rule === 'SEMPRE_LIBERADO' ? 'SEMPRE LIBERADO' : 'AVISAR ANTES'}
                        </span>
                        {v.plate && <span className="text-[7.5px] font-mono font-bold text-slate-400 bg-white/50 px-1 py-0.5 rounded border border-slate-100">{v.plate}</span>}
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => onReleaseDirect?.(v)}
                    className="flex items-center justify-center gap-1 px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all active:scale-95 shadow-sm shadow-emerald-100 shrink-0"
                  >
                    <Check className="w-2.5 h-2.5" />
                    LIBERAR
                  </button>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl opacity-60 text-center gap-2">
                <Zap className="w-4 h-4 text-slate-400" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nenhum visitante frequente</span>
              </div>
            )}
          </div>
        </div>

        {/* CARD 4: PRÉ-AUTORIZAÇÕES */}
        <div className="bg-white border border-slate-100 rounded-[1.25rem] p-4 shadow-sm flex flex-col h-[180px] transition-all hover:shadow-md">
          <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-3 shrink-0">
            <Shield className="w-3.5 h-3.5 text-blue-500" />
            Pré-Autorizações
          </h3>
          
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {unitPreAuths.length > 0 ? (
              unitPreAuths.map((p, idx) => (
                <div
                  key={p.id || idx}
                  className="bg-slate-50 border border-slate-100 rounded-xl py-2 px-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-600 shrink-0 flex items-center justify-center shadow-inner">
                      {p.type === 'visitor' ? <User className="w-4 h-4" /> : 
                       p.type === 'delivery' ? <Bike className="w-4 h-4" /> : 
                       <Wrench className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-slate-900 truncate uppercase text-[10.5px] leading-tight">
                        {p.name || 'Visitante Pré-Autorizado'}
                      </h4>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block mt-0.5">
                        Válido até: {p.validity ? format(new Date(p.validity), "dd/MM/yyyy HH:mm") : 'Não informado'}
                      </span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => onReleasePreAuth?.(p)}
                    className="flex items-center justify-center gap-1 px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all active:scale-95 shadow-sm shadow-emerald-100 shrink-0"
                  >
                    <Check className="w-2.5 h-2.5" />
                    LIBERAR
                  </button>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl opacity-60 text-center gap-2">
                <Shield className="w-4 h-4 text-slate-400" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nenhuma pré-autorização ativa</span>
              </div>
            )}
          </div>
        </div>

        {/* CARD 3: REGRAS DA UNIDADE */}
        <div className="bg-white border border-slate-100 rounded-[1.25rem] p-4 shadow-sm flex flex-col h-[180px] transition-all hover:shadow-md">
          <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-3 shrink-0">
            <Bell className="w-3.5 h-3.5 text-amber-500" />
            Regras da Unidade
          </h3>
          
          <div className="flex-1 overflow-y-auto pr-1">
            <div className={cn(
              "rounded-xl p-3 bg-slate-50 border border-slate-100 h-full flex flex-col justify-center",
              (!unitRulesObj || (!unitRulesObj.requireVisitorConfirmation && !unitRulesObj.requireDeliveryConfirmation && !unitRulesObj.fixedObservation)) && "border-dashed border-slate-200"
            )}>
              {(unitRulesObj && (unitRulesObj.requireVisitorConfirmation || unitRulesObj.requireDeliveryConfirmation || unitRulesObj.fixedObservation)) ? (
                <div className="space-y-2 w-full h-full flex flex-col justify-center">
                  <div className="grid grid-cols-2 gap-2">
                    {unitRulesObj.requireVisitorConfirmation && (
                      <div className="flex items-center gap-2 text-[8px] font-black text-blue-600 bg-white px-2 py-2 rounded-lg uppercase border border-blue-100/50 shadow-sm">
                        <Shield className="w-3 h-3 text-blue-400" />
                        Avisar Visitantes
                      </div>
                    )}
                    {unitRulesObj.requireDeliveryConfirmation && (
                      <div className="flex items-center gap-2 text-[8px] font-black text-orange-600 bg-white px-2 py-2 rounded-lg uppercase border border-orange-100/50 shadow-sm">
                        <Bike className="w-3 h-3 text-orange-400" />
                        Avisar Entregas
                      </div>
                    )}
                  </div>
                  {unitRulesObj.fixedObservation && (
                    <div className="flex items-start gap-2 text-[10px] font-bold text-slate-600 bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm flex-1 overflow-y-auto">
                      <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" />
                      <span className="italic leading-tight">"{unitRulesObj.fixedObservation}"</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center flex flex-col items-center justify-center gap-2 py-1 h-full">
                  <Bell className="w-4 h-4 text-slate-350" />
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sem restrições ou regras cadastradas</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CARD 5: HISTÓRICO DE ACESSOS */}
        <div className="bg-white border border-slate-100 rounded-[1.25rem] p-4 shadow-sm flex flex-col h-[180px] transition-all hover:shadow-md">
          <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-3 shrink-0">
            <History className="w-3.5 h-3.5 text-slate-500" />
            Histórico de Acessos
          </h3>
          
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {unitHistory.length > 0 ? (
              unitHistory.slice(0, 5).map((r, idx) => (
                <div
                  key={r.id || idx}
                  className="bg-slate-50 border border-slate-100 rounded-xl py-2 px-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={cn(
                      "w-7 h-7 rounded-md shrink-0 flex items-center justify-center bg-white border border-slate-100 shadow-xs",
                      r.type === 'visitor' ? "text-emerald-500" :
                      r.type === 'delivery' ? "text-orange-500" :
                      "text-blue-500"
                    )}>
                      {r.type === 'visitor' ? <User className="w-4 h-4" /> : 
                       r.type === 'delivery' ? <Bike className="w-4 h-4" /> : 
                       <Wrench className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-slate-800 truncate uppercase text-[10px] leading-tight">
                        {r.name || 'Visitante/Entrega'}
                      </h4>
                      <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-tight block mt-0.5">
                        {r.timestamp ? format(new Date(r.timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'Não informado'}
                      </span>
                    </div>
                  </div>
                  
                  <span className={cn(
                    "text-[7px] font-black uppercase px-1.5 py-0.5 rounded-md border tracking-wider shrink-0",
                    r.status === 'em_andamento' ? "bg-amber-50 text-amber-600 border-amber-150" : "bg-slate-100 text-slate-650 border-slate-200"
                  )}>
                    {r.status === 'em_andamento' ? 'EM ANDAMENTO' : 'FINALIZADO'}
                  </span>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl opacity-60 text-center gap-2">
                <History className="w-4 h-4 text-slate-400" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nenhum registro de acesso recente</span>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
