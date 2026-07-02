import React from 'react';
import { UnitPhone, MessageTemplates, AccessType } from '../types';
import { User, Bike, Wrench, MessageSquare, Phone, Check, Copy, Zap, Car } from 'lucide-react';
import { cn } from '../lib/utils';
import { replaceMessageVariables } from '../lib/messageUtils';
import { toast } from '../lib/toast';

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
  unitPhones = []
}: ResidentContactCardProps) {
  const getUberLabel = (minutes: number) => {
    if (minutes <= 0) return 'NA PORTARIA';
    if (minutes === 1) return 'CHEGANDO';
    return `${minutes} min`;
  };

  const residentRequests = pendingRequests.filter(r => r.unit === resident.unit);
  const residentPreAuths = preAuths.filter(p => p.unit === resident.unit && p.status === 'autorizada');

  // Unified list of what's waiting for release
  const allWaiting = [
    ...residentRequests.map(r => ({ ...r, isPreAuth: false })),
    ...residentPreAuths.map(p => ({ ...p, isPreAuth: true, visitorName: p.name, type: p.type }))
  ];

  const uberRequest = allWaiting.find(r => r.type === 'uber');
  const deliveryRequest = allWaiting.find(r => r.type === 'delivery');
  const otherRequests = allWaiting.filter(r => r.type !== 'delivery' && r.type !== 'uber');

  const handleRelease = (item: any) => {
    if (item.isPreAuth) {
      onReleasePreAuth?.(item);
    } else {
      onReleasePendingAccess?.(item);
    }
  };

  const handleCancel = (item: any) => {
    if (item.isPreAuth) {
      onCancelPreAuth?.(item);
    } else {
      onCancelPendingAccess?.(item);
    }
    toast.error('Ação cancelada');
  };

  const isTypePending = (type: AccessType) => {
    return allWaiting.some(r => r.type === type);
  };
  const getNoticeMessage = (type: AccessType) => {
    let template = "";
    
    switch(type) {
      case 'delivery': template = messageTemplates.deliveryAuth; break;
      case 'visitor': template = messageTemplates.visitorArrival; break;
      case 'service': template = messageTemplates.serviceArrival; break;
      default: template = "Olá, morador, há uma pessoa aguardando na portaria.";
    }

    const typeLabel = type === 'delivery' ? 'Entrega' : type === 'visitor' ? 'Visitante' : 'Prestador';

    // Heurística simples: se o searchTerm não for o número da unidade, provavelmente é o nome da pessoa
    const isSearchValueName = searchTerm.trim().toLowerCase() !== resident.unit.toLowerCase() && isNaN(Number(searchTerm.trim()));
    const potentialName = isSearchValueName ? searchTerm.trim() : "";

    return replaceMessageVariables(template, {
      residentName: resident.residentName,
      unit: resident.unit,
      type: typeLabel,
      condoName: condoName,
      porterName: porterName,
      visitorName: potentialName,
      providerName: potentialName,
      deliveryEntry: potentialName
    });
  };

  const openWhatsApp = (type: AccessType) => {
    if (onNotify) onNotify(type);
  };

  const handleUberClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (uberRequest) return;
    
    // UBER FLOW CORRECTION
    // Must NOT open WhatsApp. Must open internal modal.
    if (onNotify) onNotify('uber');
  };

  return (
    <div className={cn(
      "bg-white border-2 rounded-[1.25rem] p-4 shadow-xl transition-all duration-300 flex flex-col gap-3 animate-in fade-in slide-in-from-top-4 max-w-2xl mx-auto w-full",
      isSelected ? "border-blue-500 ring-8 ring-blue-500/10 shadow-blue-200/50 scale-[1.01]" : "border-blue-200 shadow-blue-50"
    )}>
      {/* Linha 1: Dados do Morador */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-inner shrink-0">
            <User className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 shadow-sm leading-none">CASA {resident.unit}</span>
              <h4 className="text-sm font-black text-slate-900 uppercase truncate leading-tight">{resident.residentName}</h4>
              {resident.isPrimary && (
                <span className="text-[7.5px] font-black text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded uppercase tracking-tighter shadow-sm border border-blue-200 animate-in zoom-in duration-300">
                  MORADOR PRIMÁRIO
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 leading-none mt-1">
              <Phone className="w-2.5 h-2.5" />
              {resident.primaryPhone}
              <div className="flex items-center gap-1 bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest ml-1">
                <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                WhatsApp
              </div>
              {resident.releaseCount ? (
                <div className="ml-auto text-[8px] font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5" />
                  {resident.releaseCount} liberações
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Pending Actions (intelligent & contextual) */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {/* Other Pending Actions (Secondary) moved to header if needed, but per request we keep only internal ones. 
              Actually the user said "REMOVER COMPLETAMENTE estes botões que estão acima: CANCELAR, LIBERAR ENTREGADOR"
              So we remove the deliveryRequest block. */}
        </div>
      </div>



      {/* Linha 2: Botões de Ação Principais */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => openWhatsApp('visitor')}
          className={cn(
            "flex flex-col items-center justify-center gap-1 py-2 rounded-xl transition-all active:scale-95 border shadow-sm relative group outline-none",
            isTypePending('visitor') 
              ? "bg-emerald-600 text-white border-emerald-500 shadow-emerald-200" 
              : "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-600 hover:text-white"
          )}
        >
          <User className="w-4 h-4" />
          <span className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
            Visitante
            {pendingCounts?.visitor && pendingCounts.visitor > 0 ? (
              <span className={cn(
                "px-1 rounded-full text-[8px] animate-in zoom-in duration-300",
                isTypePending('visitor') ? "bg-white text-emerald-600" : "bg-emerald-600 text-white group-hover:bg-white group-hover:text-emerald-600"
              )}>
                {pendingCounts.visitor}
              </span>
            ) : null}
          </span>
        </button>
        <button
          onClick={() => openWhatsApp('delivery')}
          className={cn(
            "flex flex-col items-center justify-center gap-1 py-2 rounded-xl transition-all active:scale-95 border shadow-sm relative group outline-none",
            isTypePending('delivery') 
              ? "bg-orange-600 text-white border-orange-500 shadow-orange-200" 
              : "bg-orange-50 text-orange-600 border-orange-100 hover:bg-orange-600 hover:text-white"
          )}
        >
          <Bike className="w-4 h-4" />
          <span className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
            Entrega
            {pendingCounts?.delivery && pendingCounts.delivery > 0 ? (
              <span className={cn(
                "px-1 rounded-full text-[8px] animate-in zoom-in duration-300",
                isTypePending('delivery') ? "bg-white text-orange-600" : "bg-orange-600 text-white group-hover:bg-white group-hover:text-orange-600"
              )}>
                {pendingCounts.delivery}
              </span>
            ) : null}
          </span>
        </button>
        <button
          onClick={() => openWhatsApp('service')}
          className={cn(
            "flex flex-col items-center justify-center gap-1 py-2 rounded-xl transition-all active:scale-95 border shadow-sm relative group outline-none",
            isTypePending('service') 
              ? "bg-blue-600 text-white border-blue-500 shadow-blue-200" 
              : "bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-600 hover:text-white"
          )}
        >
          <Wrench className="w-4 h-4" />
          <span className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
            Prestador
            {pendingCounts?.service && pendingCounts.service > 0 ? (
              <span className={cn(
                "px-1 rounded-full text-[8px] animate-in zoom-in duration-300",
                isTypePending('service') ? "bg-white text-blue-600" : "bg-blue-600 text-white group-hover:bg-white group-hover:text-blue-600"
              )}>
                {pendingCounts.service}
              </span>
            ) : null}
          </span>
        </button>
      </div>

      {/* Linha 3: Card UBER Contextual Full Width - REMOVED per request, moved to linked actions below */}
      {!uberRequest && (
        <div 
          onClick={handleUberClick}
          className={cn(
            "w-full h-10 px-4 rounded-xl transition-all border shadow-sm relative group outline-none overflow-hidden flex items-center justify-center gap-2 bg-slate-50 text-[#133d47] border-slate-100 hover:bg-[#133d47] hover:text-white cursor-pointer"
          )}
        >
          <Car className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Solicitar UBER</span>
          {pendingCounts?.uber && pendingCounts.uber > 0 ? (
            <span className="bg-[#133d47] text-white px-1.5 rounded-full text-[8px] border border-white/20 group-hover:bg-white group-hover:text-[#133d47]">
              {pendingCounts.uber}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}
