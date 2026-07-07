import React from 'react';
import { UserPlus, Bike, Wrench, UserCheck, Car } from 'lucide-react';
import { AccessType } from '../types';
import { cn } from '../lib/utils';
import { toast } from '../lib/toast';
import { supabase } from '../lib/supabase';

interface QuickActionsProps {
  onAction: (type: AccessType) => void;
  activeType: AccessType | null;
  activeCardIndex?: number;
  pendingCounts?: Record<AccessType, number>;
  compact?: boolean;
  onUberDrop?: (file: File) => void;
  onDeliveryDrop?: (file: File) => void;
  onImmediateRelease?: (type: AccessType, unit: string, qty?: number, avisarMorador?: boolean, residentName?: string, residentId?: string) => void;
  uberPrintAttached?: string | null;
  onUberPrintAttachedChange?: (base64: string | null) => void;
  onImmediateUberRelease?: (unit: string, printImage: string) => void;
  onQueueUberPrintAction?: (unit: string, printImage: string) => void;
  unitPhones?: any[];
}

// React Fiber Traversal and matching utility
function findAppFiber(element: HTMLElement | null): any {
  if (!element) return null;
  const key = Object.keys(element).find(
    (k) => k.startsWith('__reactFiber$') || k.startsWith('__reactContainer$')
  );
  if (!key) return null;
  let fiber = (element as any)[key];
  while (fiber) {
    if (fiber.type && (
      fiber.type.name === 'App' || 
      (typeof fiber.type === 'function' && fiber.type.toString().includes('handleAddRecord'))
    )) {
      return fiber;
    }
    if (fiber.elementType && (
      fiber.elementType.name === 'App' || 
      (typeof fiber.elementType === 'function' && fiber.elementType.toString().includes('handleAddRecord'))
    )) {
      return fiber;
    }
    fiber = fiber.return;
  }
  return null;
}

function getAppHooks(element: HTMLElement) {
  const fiber = findAppFiber(element);
  if (!fiber) return null;

  const hooks: any[] = [];
  let hook = fiber.memoizedState;
  while (hook) {
    hooks.push(hook);
    hook = hook.next;
  }
  return hooks;
}

function findStateSetters(element: HTMLElement) {
  const hooks = getAppHooks(element);
  if (!hooks) return null;

  const stateHooks = hooks.filter(h => h && h.queue && typeof h.queue.dispatch === 'function');
  const arrayHooks = stateHooks.filter(h => Array.isArray(h.memoizedState));

  let pendingHook = null;
  let waitingHook = null;

  // 1. Structural matching for state hooks
  for (const h of arrayHooks) {
    const val = h.memoizedState;
    if (val.length > 0) {
      const first = val[0];
      if (first && typeof first === 'object' && 'unit' in first && 'type' in first && 'residentName' in first) {
        pendingHook = h;
      } else if (typeof first === 'string' && first.length > 10) {
        waitingHook = h;
      }
    }
  }

  // 2. Fallback to constant indexes in useState declarations in App.tsx
  if (!pendingHook && arrayHooks[4]) {
    pendingHook = arrayHooks[4];
  }
  if (!waitingHook && arrayHooks[5]) {
    waitingHook = arrayHooks[5];
  }

  return {
    setPendingRequests: pendingHook ? pendingHook.queue.dispatch : null,
    setWaitingArrivalIds: waitingHook ? waitingHook.queue.dispatch : null
  };
}

export function QuickActions({ 
  onAction, 
  activeType, 
  activeCardIndex = -1, 
  pendingCounts, 
  compact, 
  onUberDrop, 
  onDeliveryDrop, 
  onImmediateRelease,
  uberPrintAttached,
  onUberPrintAttachedChange,
  onImmediateUberRelease,
  onQueueUberPrintAction,
  unitPhones
}: QuickActionsProps) {
  const [isDragOverUber, setIsDragOverUber] = React.useState(false);
  const [isDragOverDelivery, setIsDragOverDelivery] = React.useState(false);
  const [deliveryQty, setDeliveryQty] = React.useState<string>('');
  const [visitorQty, setVisitorQty] = React.useState<string>('');
  const [avisarMorador, setAvisarMorador] = React.useState(false);
  const [casaValues, setCasaValues] = React.useState<Record<AccessType, string>>({
    delivery: '',
    visitor: '',
    service: '',
    uber: ''
  });

  const deliveryQtyRef = React.useRef<HTMLInputElement | null>(null);
  const visitorQtyRef = React.useRef<HTMLInputElement | null>(null);
  const autoQueueTimerRef = React.useRef<any>(null);
  const uberPrintInputRef = React.useRef<HTMLInputElement | null>(null);

  const [solicitanteState, setSolicitanteState] = React.useState<{
    activeType: AccessType | null;
    residents: any[];
    selectedIndex: number;
    confirmed: boolean;
    manualName: string;
    isManual: boolean;
  }>({
    activeType: null,
    residents: [],
    selectedIndex: 0,
    confirmed: false,
    manualName: '',
    isManual: false
  });

  const [isLoadingResidents, setIsLoadingResidents] = React.useState<boolean>(false);

  React.useEffect(() => {
    const activeType = casaValues.delivery ? 'delivery' : casaValues.visitor ? 'visitor' : null;
    if (!activeType) {
      setSolicitanteState({
        activeType: null,
        residents: [],
        selectedIndex: 0,
        confirmed: false,
        manualName: '',
        isManual: false
      });
      return;
    }

    const value = casaValues[activeType];
    const cleanVal = value.trim().toUpperCase();
    if (!cleanVal) {
      setSolicitanteState({
        activeType: null,
        residents: [],
        selectedIndex: 0,
        confirmed: false,
        manualName: '',
        isManual: false
      });
      return;
    }

    const normalizedInput = cleanVal.replace(/^(CASA|APTO|APARTAMENTO|AP)\s*/, '').trim();

    let isCurrent = true;
    setIsLoadingResidents(true);

    async function fetchResidents() {
      let residents: any[] = [];
      try {
        const { data: units, error: unitErr } = await supabase
          .from('unidades')
          .select('*')
          .or(`numero.eq.${normalizedInput},numero.ilike.%${normalizedInput}%`);

        if (units && units.length > 0) {
          const unitIds = units.map(u => u.id);
          const { data: morad, error: moradErr } = await supabase
            .from('moradores')
            .select('*')
            .in('unidade_id', unitIds);

          if (morad) {
            const activeMorad = morad.filter(m => m.ativo !== false && m.active !== false);
            residents = activeMorad.map(m => ({
              id: m.id,
              unit: units.find(u => u.id === m.unidade_id)?.numero || normalizedInput,
              residentName: m.nome || m.name || 'Morador',
              primaryPhone: m.telefone || m.phone || '',
              active: true
            }));
          }
        }
      } catch (err) {
        console.error('Error fetching units/residents:', err);
      }

      if (residents.length === 0) {
        try {
          const { data: profiles, error: profErr } = await supabase
            .from('perfis')
            .select('*')
            .eq('funcao', 'morador');

          if (profiles) {
            const matchedProfiles = profiles.filter(p => {
              if (p.active === false || p.ativo === false) return false;
              const unitStr = String(p.condominio_id || '').toUpperCase().trim();
              const unitNorm = unitStr.replace(/^(CASA|APTO|APARTAMENTO|AP)\s*/, '').trim();
              return unitNorm === normalizedInput || unitStr === cleanVal || unitNorm === cleanVal || unitStr === normalizedInput;
            });

            residents = matchedProfiles.map(p => ({
              id: p.id,
              unit: p.condominio_id || normalizedInput,
              residentName: p.nome || p.name || 'Morador',
              primaryPhone: p.telefone || p.phone || '',
              active: true
            }));
          }
        } catch (err) {
          console.error('Error fetching perfis fallback:', err);
        }
      }

      if (!isCurrent) return;
      setIsLoadingResidents(false);

      if (residents.length === 1) {
        setSolicitanteState({
          activeType,
          residents,
          selectedIndex: 0,
          confirmed: true,
          manualName: '',
          isManual: false
        });
      } else if (residents.length > 1) {
        setSolicitanteState({
          activeType,
          residents,
          selectedIndex: 0,
          confirmed: false,
          manualName: '',
          isManual: false
        });
      } else {
        setSolicitanteState({
          activeType,
          residents: [],
          selectedIndex: 0,
          confirmed: true,
          manualName: 'Morador',
          isManual: false
        });
      }
    }

    const handler = setTimeout(() => {
      fetchResidents();
    }, 250);

    return () => {
      isCurrent = false;
      clearTimeout(handler);
    };
  }, [casaValues.delivery, casaValues.visitor]);

  const selecionarMorador = (type: AccessType, res: any, shouldFocus = true) => {
    console.log('[Diagnostic] selecionarMorador chamado no QuickActions:', type, res);
    if (!res) return;
    const index = solicitanteState.residents.findIndex(r => r.id === res.id);
    const selIdx = index !== -1 ? index : 0;
    setSolicitanteState(prev => ({
      ...prev,
      activeType: type,
      selectedIndex: selIdx,
      confirmed: true,
      isManual: false
    }));
    if (shouldFocus) {
      advanceQuickFocus(type);
    }
  };

  const handleUnitChange = (type: AccessType, value: string) => {
    setCasaValues(prev => ({ ...prev, [type]: value }));
  };

  const handleUnitKeyDown = (e: React.KeyboardEvent, type: AccessType) => {
    if (e.key === 'F2') {
      e.preventDefault();
      setSolicitanteState(prev => ({
        ...prev,
        activeType: type,
        isManual: true,
        confirmed: false,
        manualName: ''
      }));
      return;
    }

    const { residents, selectedIndex, confirmed, isManual } = solicitanteState;

    if (isManual && !confirmed) {
      if (e.key === 'Enter') {
        e.preventDefault();
        setSolicitanteState(prev => ({ ...prev, confirmed: true }));
        advanceQuickFocus(type);
      }
      return;
    }

    if (residents.length > 1 && !confirmed) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSolicitanteState(prev => ({
          ...prev,
          selectedIndex: (prev.selectedIndex + 1) % prev.residents.length
        }));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSolicitanteState(prev => ({
          ...prev,
          selectedIndex: (prev.selectedIndex - 1 + prev.residents.length) % prev.residents.length
        }));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const selRes = residents[selectedIndex];
        if (selRes) {
          selecionarMorador(type, selRes);
        }
        return;
      }
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      advanceQuickFocus(type);
    }
  };

  const advanceQuickFocus = (type: AccessType) => {
    if (type === 'delivery') {
      deliveryQtyRef.current?.focus();
      deliveryQtyRef.current?.select();
    } else if (type === 'visitor') {
      visitorQtyRef.current?.focus();
      visitorQtyRef.current?.select();
    } else {
      const inputEl = document.querySelector(`[data-quick-input="${type}"]`) as HTMLElement;
      handleImmediateRelease(type, casaValues[type], inputEl || document.body);
    }
  };

  React.useEffect(() => {
    return () => {
      if (autoQueueTimerRef.current) {
        clearTimeout(autoQueueTimerRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    if (uberPrintAttached) {
      const timer = setTimeout(() => {
        if (uberPrintInputRef.current) {
          uberPrintInputRef.current.focus();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [uberPrintAttached]);

  const handleDragOver = (type: AccessType) => (e: React.DragEvent) => {
    e.preventDefault();
    if (type === 'uber') setIsDragOverUber(true);
    if (type === 'delivery') setIsDragOverDelivery(true);
  };

  const handleDragLeave = (type: AccessType) => (e: React.DragEvent) => {
    e.preventDefault();
    if (type === 'uber') setIsDragOverUber(false);
    if (type === 'delivery') setIsDragOverDelivery(false);
  };

  const handleDrop = (type: AccessType) => (e: React.DragEvent) => {
    e.preventDefault();
    if (type === 'uber') {
      setIsDragOverUber(false);
      const files = e.dataTransfer.files;
      if (files && files.length > 0 && onUberDrop) {
        onUberDrop(files[0]);
      }
    }
    if (type === 'delivery') {
      setIsDragOverDelivery(false);
      const files = e.dataTransfer.files;
      if (files && files.length > 0 && onDeliveryDrop) {
        onDeliveryDrop(files[0]);
      }
    }
  };

  const handleImmediateRelease = (type: AccessType, val: string, targetEl: HTMLElement, customQty?: number) => {
    const unit = val.trim();
    if (!unit) return;

    const parsedQty = type === 'delivery' 
      ? (customQty ?? (parseInt(deliveryQty, 10) || 1)) 
      : type === 'visitor' 
        ? (customQty ?? (parseInt(visitorQty, 10) || 1)) 
        : 1;
    const finalQty = parsedQty < 1 ? 1 : parsedQty;

    let solName: string | undefined = undefined;
    let solId: string | undefined = undefined;

    if (solicitanteState.activeType === type && solicitanteState.confirmed) {
      if (solicitanteState.isManual) {
        solName = solicitanteState.manualName || 'Morador';
      } else if (solicitanteState.residents.length > 0) {
        const selRes = solicitanteState.residents[solicitanteState.selectedIndex];
        if (selRes) {
          solName = selRes.residentName;
          solId = selRes.id;
        }
      }
    } else {
      const fallback = (unitPhones || []).filter((p: any) => p.unit.toUpperCase() === unit.toUpperCase() && p.active !== false);
      if (fallback.length > 0) {
        solName = fallback[0].residentName;
        solId = fallback[0].id;
      }
    }

    if (onImmediateRelease) {
      onImmediateRelease(type, unit, finalQty, type === 'delivery' ? avisarMorador : undefined, solName, solId);
      setCasaValues(prev => ({
        ...prev,
        [type]: ''
      }));
      setDeliveryQty('');
      setVisitorQty('');
      setSolicitanteState({
        activeType: null,
        residents: [],
        selectedIndex: 0,
        confirmed: false,
        manualName: '',
        isManual: false
      });
      if (type === 'delivery') setAvisarMorador(false);
      return;
    }

    // Get primary resident name using local storage master list
    let residentName = 'Morador';
    const savedPhones = localStorage.getItem('portaria_unit_phones');
    if (savedPhones) {
      try {
        const parsedPhones = JSON.parse(savedPhones);
        const residents = parsedPhones.filter((p: any) => p.unit === unit && p.active !== false);
        if (residents.length > 0) {
          const sorted = [...residents].sort((a, b) => {
            const countA = a.releaseCount || 0;
            const countB = b.releaseCount || 0;
            if (countB !== countA) return countB - countA;
            if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          });
          residentName = sorted[0].residentName || 'Morador';
        }
      } catch (e) {}
    }

    // Default visitor names matching the forms
    const defaultVisitorName = type === 'uber' ? 'Motorista Uber' :
                               type === 'delivery' ? 'Entregador' :
                               type === 'service' ? 'Prestador' : 'Visitante';

    const defaultNameUppercase = type === 'uber' ? 'MOTORISTA UBER' :
                                 type === 'delivery' ? 'ENTREGADOR' :
                                 type === 'service' ? 'PRESTADOR DE SERVIÇOS' : 'VISITANTE';

    const pendingId = crypto.randomUUID();
    const newPending = {
      id: pendingId,
      unit: unit,
      type: type,
      residentName: residentName,
      visitorName: defaultVisitorName,
      createdAt: new Date(),
      updatedAt: new Date(),
      uberArrivalMinutes: 5,
      status: 'authorized_waiting' as const,
      deliveriesCount: (type === 'delivery' || type === 'visitor') ? finalQty : undefined,
      avisarMorador: type === 'delivery' ? avisarMorador : undefined,
      draft: {
        destination: unit,
        name: defaultNameUppercase,
        type: type,
        origin: 'quick_action',
        deliveriesCount: (type === 'delivery' || type === 'visitor') ? finalQty : undefined,
        avisarMorador: type === 'delivery' ? avisarMorador : undefined
      }
    };

    // Find and update React state of App
    const setters = findStateSetters(targetEl);
    if (setters && setters.setPendingRequests && setters.setWaitingArrivalIds) {
      setters.setPendingRequests((prev: any[]) => [newPending, ...prev]);
      setters.setWaitingArrivalIds((prev: string[]) => Array.from(new Set([...prev, pendingId])));
    } else {
      // Local storage direct fallback if needed
      const savedPending = localStorage.getItem('portaria_pending_requests');
      let pReqs = [];
      if (savedPending) {
        try { pReqs = JSON.parse(savedPending); } catch(e){}
      }
      const savedWaiting = localStorage.getItem('portaria_waiting_arrival_ids');
      let wIds = [];
      if (savedWaiting) {
        try { wIds = JSON.parse(savedWaiting); } catch(e){}
      }
      localStorage.setItem('portaria_pending_requests', JSON.stringify([newPending, ...pReqs]));
      localStorage.setItem('portaria_waiting_arrival_ids', JSON.stringify(Array.from(new Set([pendingId, ...wIds]))));
    }

    // Display localized feedback
    const typeLabel = type === 'delivery' ? 'ENTREGA' : type === 'visitor' ? 'VISITA' : type === 'service' ? 'SERVIÇO' : 'UBER';
    const messageQtySuffix = (type === 'delivery' && finalQty > 1) ? ` (${finalQty} entregas)` : 
                             (type === 'visitor' && finalQty > 1) ? ` (${finalQty} visitantes)` : '';
    toast.warning('LIBERAÇÃO AUTORIZADA', {
      description: `${typeLabel}${messageQtySuffix} aguardando chegada na unidade ${unit}`,
      icon: <div className="text-amber-500 animate-pulse">🟡</div>
    });

    // Reset input field
    setCasaValues(prev => ({
      ...prev,
      [type]: ''
    }));
    setDeliveryQty('');
    setVisitorQty('');
    if (type === 'delivery') {
      setAvisarMorador(false);
    }
  };

  const actions = [
    { id: 'delivery', label: 'Entrega', icon: Bike, color: 'bg-orange-600', hover: 'hover:bg-orange-700' },
    { id: 'visitor', label: 'Visitante', icon: UserPlus, color: 'bg-emerald-600', hover: 'hover:bg-emerald-700' },
    { id: 'service', label: 'Prestador', icon: Wrench, color: 'bg-blue-600', hover: 'hover:bg-blue-700' },
    { id: 'uber', label: 'UBER', icon: Car, color: 'bg-[#133d47]', hover: 'hover:bg-[#0a2329]', className: 'sm:col-span-3 flex-row sm:flex-row h-14 sm:h-16' },
  ];

  return (
    <div className={cn(
      "grid gap-3 transition-all duration-500",
      compact ? "grid-cols-3 p-2" : "grid-cols-1 sm:grid-cols-3 p-0"
    )}>
      {actions.map((action, index) => {
        const isFocused = activeCardIndex === index;
        const count = pendingCounts?.[action.id as AccessType] || 0;
        const isUber = action.id === 'uber';
        const isDelivery = action.id === 'delivery';
        const isDraggingThis = (isUber && isDragOverUber) || (isDelivery && isDragOverDelivery);
        const currentCasaValue = casaValues[action.id as AccessType] || '';

        const handleCardClick = (e: React.MouseEvent) => {
          if (isUber && uberPrintAttached) {
            // Do not open form when print is attached
            return;
          }
          if (currentCasaValue.trim()) {
            handleImmediateRelease(action.id as AccessType, currentCasaValue, e.currentTarget as HTMLElement);
          } else {
            onAction(action.id as AccessType);
          }
        };

        const handleCardKeyDown = (e: React.KeyboardEvent) => {
          if (e.key === 'Enter') {
            if (isUber && uberPrintAttached) {
              return;
            }
            if (currentCasaValue.trim()) {
              handleImmediateRelease(action.id as AccessType, currentCasaValue, e.currentTarget as HTMLElement);
            } else {
              onAction(action.id as AccessType);
            }
          }
        };
        
        return (
          <div
            key={action.id}
            role="button"
            tabIndex={0}
            onClick={handleCardClick}
            onKeyDown={handleCardKeyDown}
            onDragOver={(isUber || isDelivery) ? handleDragOver(action.id as AccessType) : undefined}
            onDragLeave={(isUber || isDelivery) ? handleDragLeave(action.id as AccessType) : undefined}
            onDrop={(isUber || isDelivery) ? handleDrop(action.id as AccessType) : undefined}
            className={cn(
              "flex items-center justify-center rounded-xl transition-all active:scale-[0.98] shadow-md relative group border-2 font-bold gap-2 sm:gap-3 cursor-pointer select-none",
              compact ? "flex-col p-2 h-16 sm:h-20" : (isUber ? "p-4" : "flex-row sm:flex-col p-3 sm:p-4 h-auto"),
              isDraggingThis ? "bg-blue-600 border-dashed border-blue-400 scale-[1.02] ring-4 ring-blue-500/40 animate-pulse duration-700" : action.color,
              action.hover,
              "text-white outline-none focus:ring-2 focus:ring-white/50",
              (activeType === action.id || isFocused) ? "border-white scale-102 sm:scale-105 ring-4 ring-white/20" : "border-transparent",
              isFocused && "shadow-2xl shadow-white/50 brightness-110",
              action.className
            )}
          >
            <action.icon className={cn(
              "transition-all duration-500 shrink-0",
              compact ? "w-4 h-4 sm:w-5 h-5" : (isUber ? "w-6 h-6 sm:w-7 h-7" : "w-6 h-6 sm:w-8 h-8")
            )} />
            <div className={cn("flex flex-col items-center", isUber && "sm:flex-row sm:gap-2")}>
              <span className={cn(
                "uppercase tracking-[0.2em] flex items-center gap-1 sm:gap-2 transition-all duration-500",
                compact ? "text-[8px] sm:text-[9px]" : (isUber ? "text-sm sm:text-base" : "text-xs sm:text-sm")
              )}>
                {isDraggingThis ? "📥 SOLTE O PRINT AQUI!" : (
                  isUber && uberPrintAttached ? (
                    <span className="flex items-center gap-1.5 bg-emerald-500 text-white border border-emerald-400 px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest animate-pulse">
                      📷 PRINT ANEXADO
                    </span>
                  ) : (action.id === 'uber' ? `${action.label} • ${count}` : action.label)
                )}
                {count > 0 && action.id !== 'uber' && (
                  <span className="bg-white text-slate-900 text-[10px] px-1.5 py-0.5 rounded-full shadow-sm animate-in zoom-in duration-300">
                    {count}
                  </span>
                )}
              </span>
              {isFocused && !compact && !isUber && (
                <span className="text-[8px] font-black uppercase tracking-widest mt-1 opacity-80 animate-pulse">ENTER para abrir</span>
              )}
            </div>
            {isFocused && !compact && isUber && (
              <span className="text-[8px] font-black uppercase tracking-widest opacity-80 animate-pulse ml-2">ENTER para abrir</span>
            )}
            {isFocused && !compact && (
              <div className="absolute -top-2 -right-2 bg-white text-slate-900 text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-lg uppercase border border-slate-200">
                Focado
              </div>
            )}

            {/* Casa input box at bottom-right corner */}
            {action.id === 'delivery' && (
              <>
                {/* Left side: Avisar Morador Indicator */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAvisarMorador(!avisarMorador);
                  }}
                  className="absolute bottom-1 left-1 flex items-center gap-1 bg-black/25 hover:bg-black/40 focus-within:bg-black/55 px-1.5 py-0.5 rounded border border-white/10 transition-colors text-white/70 hover:text-white cursor-pointer select-none outline-none"
                >
                  <span className="text-[10px] leading-none text-white/90">{avisarMorador ? '●' : '◯'}</span>
                  <span className="text-[8px] font-black uppercase tracking-wider">Avisar Morador</span>
                </button>

                {/* Right side: CASA & QTD */}
                <div 
                  className="absolute bottom-1 right-1 flex items-center gap-1 bg-black/25 hover:bg-black/40 focus-within:bg-black/55 px-1.5 py-0.5 rounded border border-white/10 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {/* OVERLAY FOR RESIDENTS SELECTOR */}
                  {solicitanteState.activeType === 'delivery' && solicitanteState.residents.length > 1 && !solicitanteState.confirmed && (
                    <div className="absolute right-0 bottom-8 z-50 bg-slate-900 border border-slate-700 rounded-lg p-1.5 shadow-2xl flex flex-col gap-1 w-44 text-left">
                      <div className="text-[8px] font-black uppercase text-slate-400 px-1">Selecione o Morador:</div>
                      {solicitanteState.residents.map((r, idx) => (
                        <div
                          key={r.id}
                          className={cn(
                            "px-2 py-1 rounded text-[10px] font-black cursor-pointer flex justify-between items-center",
                            idx === solicitanteState.selectedIndex ? "bg-amber-400 text-slate-900" : "text-white hover:bg-slate-800"
                          )}
                          onClick={() => selecionarMorador('delivery', r)}
                        >
                          <span>{r.residentName}</span>
                          {idx === solicitanteState.selectedIndex && <span className="text-[8px]">⏎</span>}
                        </div>
                      ))}
                      <div
                        onClick={() => setSolicitanteState(prev => ({ ...prev, isManual: true }))}
                        className="text-[8px] text-amber-400 font-bold px-1 pt-1 border-t border-slate-800 hover:text-amber-300 cursor-pointer"
                      >
                        F2: Informar Manualmente
                      </div>
                    </div>
                  )}

                  {solicitanteState.activeType === 'delivery' && solicitanteState.isManual && !solicitanteState.confirmed && (
                    <div className="absolute right-0 bottom-8 z-50 bg-slate-900 border border-slate-700 rounded-lg p-2 shadow-2xl flex flex-col gap-1 w-44 text-left">
                      <div className="text-[8px] font-black uppercase text-slate-400">Nome do Solicitante (Manual):</div>
                      <input
                        autoFocus
                        type="text"
                        className="w-full h-[24px] bg-slate-800 text-white text-[10px] px-1.5 rounded border border-slate-600 focus:outline-none focus:border-amber-400 font-bold"
                        value={solicitanteState.manualName}
                        onChange={(e) => setSolicitanteState(prev => ({ ...prev, manualName: e.target.value }))}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            setSolicitanteState(prev => ({ ...prev, confirmed: true }));
                            advanceQuickFocus('delivery');
                          }
                        }}
                      />
                    </div>
                  )}

                  <span className="text-[8px] font-black uppercase tracking-wider text-white/80 shrink-0">Casa</span>
                  <input
                    type="text"
                    placeholder="---"
                    className="bg-white/95 text-slate-900 border-none rounded text-center text-[10px] font-black p-0 focus:outline-none focus:ring-1 focus:ring-amber-400 placeholder:text-slate-400 font-sans w-8"
                    value={currentCasaValue}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleUnitChange('delivery', e.target.value);
                    }}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      handleUnitKeyDown(e, 'delivery');
                    }}
                  />
                  <span className="text-[8px] font-black uppercase tracking-wider text-white/80 shrink-0">Qtd</span>
                  <input
                    ref={deliveryQtyRef}
                    type="text"
                    placeholder="1"
                    className="w-5 h-4 bg-white/95 text-slate-900 border-none rounded text-center text-[10px] font-black p-0 focus:outline-none focus:ring-1 focus:ring-amber-400 placeholder:text-slate-400 font-sans shrink-0"
                    value={deliveryQty}
                    onChange={(e) => {
                      e.stopPropagation();
                      const val = e.target.value.replace(/\D/g, '');
                      setDeliveryQty(val);
                    }}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = currentCasaValue.trim();
                        if (val) {
                          handleImmediateRelease('delivery', val, e.currentTarget);
                        }
                      } else if (e.key === 'ArrowLeft' || e.key === 'Left') {
                        const val = currentCasaValue.trim();
                        if (val) {
                          e.preventDefault();
                          if (!avisarMorador) {
                            setAvisarMorador(true);
                            // Keep focus on QTD input
                            setTimeout(() => {
                              deliveryQtyRef.current?.focus();
                            }, 10);
                          } else {
                            handleImmediateRelease('delivery', val, e.currentTarget);
                          }
                        }
                      }
                    }}
                  />
                </div>
              </>
            )}

            {action.id === 'visitor' && (
              <div 
                className="absolute bottom-1 right-1 flex items-center gap-1 bg-black/25 hover:bg-black/40 focus-within:bg-black/55 px-1.5 py-0.5 rounded border border-white/10 transition-colors"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {/* OVERLAY FOR RESIDENTS SELECTOR */}
                {solicitanteState.activeType === 'visitor' && solicitanteState.residents.length > 1 && !solicitanteState.confirmed && (
                  <div className="absolute right-0 bottom-8 z-50 bg-slate-900 border border-slate-700 rounded-lg p-1.5 shadow-2xl flex flex-col gap-1 w-44 text-left">
                    <div className="text-[8px] font-black uppercase text-slate-400 px-1">Selecione o Morador:</div>
                    {solicitanteState.residents.map((r, idx) => (
                      <div
                        key={r.id}
                        className={cn(
                          "px-2 py-1 rounded text-[10px] font-black cursor-pointer flex justify-between items-center",
                          idx === solicitanteState.selectedIndex ? "bg-amber-400 text-slate-900" : "text-white hover:bg-slate-800"
                        )}
                        onClick={() => selecionarMorador('visitor', r)}
                      >
                        <span>{r.residentName}</span>
                        {idx === solicitanteState.selectedIndex && <span className="text-[8px]">⏎</span>}
                      </div>
                    ))}
                    <div
                      onClick={() => setSolicitanteState(prev => ({ ...prev, isManual: true }))}
                      className="text-[8px] text-amber-400 font-bold px-1 pt-1 border-t border-slate-800 hover:text-amber-300 cursor-pointer"
                    >
                      F2: Informar Manualmente
                    </div>
                  </div>
                )}

                {solicitanteState.activeType === 'visitor' && solicitanteState.isManual && !solicitanteState.confirmed && (
                  <div className="absolute right-0 bottom-8 z-50 bg-slate-900 border border-slate-700 rounded-lg p-2 shadow-2xl flex flex-col gap-1 w-44 text-left">
                    <div className="text-[8px] font-black uppercase text-slate-400">Nome do Solicitante (Manual):</div>
                    <input
                      autoFocus
                      type="text"
                      className="w-full h-[24px] bg-slate-800 text-white text-[10px] px-1.5 rounded border border-slate-600 focus:outline-none focus:border-amber-400 font-bold"
                      value={solicitanteState.manualName}
                      onChange={(e) => setSolicitanteState(prev => ({ ...prev, manualName: e.target.value }))}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          setSolicitanteState(prev => ({ ...prev, confirmed: true }));
                          advanceQuickFocus('visitor');
                        }
                      }}
                    />
                  </div>
                )}

                <span className="text-[8px] font-black uppercase tracking-wider text-white/80 shrink-0">Casa</span>
                <input
                  type="text"
                  placeholder="---"
                  className={cn(
                    "bg-white/95 text-slate-900 border-none rounded text-center text-[10px] font-black p-0 focus:outline-none focus:ring-1 focus:ring-amber-400 placeholder:text-slate-400 font-sans",
                    'w-8'
                  )}
                  value={currentCasaValue}
                  onChange={(e) => {
                    e.stopPropagation();
                    handleUnitChange('visitor', e.target.value);
                  }}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    handleUnitKeyDown(e, 'visitor');
                  }}
                />
                <span className="text-[8px] font-black uppercase tracking-wider text-white/80 shrink-0">Qtd</span>
                <input
                  ref={visitorQtyRef}
                  type="text"
                  placeholder="1"
                  className="w-5 h-4 bg-white/95 text-slate-900 border-none rounded text-center text-[10px] font-black p-0 focus:outline-none focus:ring-1 focus:ring-amber-400 placeholder:text-slate-400 font-sans shrink-0"
                  value={visitorQty}
                  onChange={(e) => {
                    e.stopPropagation();
                    const val = e.target.value.replace(/\D/g, '');
                    setVisitorQty(val);
                  }}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const val = currentCasaValue.trim();
                      if (val) {
                        handleImmediateRelease('visitor', val, e.currentTarget);
                      }
                    }
                  }}
                />
              </div>
            )}

            {action.id === 'uber' && uberPrintAttached && (
              <div 
                className="absolute bottom-1 right-1 flex items-center gap-1.5 bg-black/45 hover:bg-black/60 focus-within:bg-black/70 px-2 py-1 rounded-xl border border-white/10 transition-colors"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <span className="text-[8px] font-black uppercase tracking-wider text-white/80 shrink-0">Casa</span>
                <input
                  ref={uberPrintInputRef}
                  type="text"
                  placeholder="---"
                  className="bg-white text-slate-900 border-none rounded text-center text-[10px] font-black p-0.5 focus:outline-none focus:ring-1 focus:ring-emerald-400 placeholder:text-slate-400 font-sans w-10 h-5"
                  value={casaValues.uber || ''}
                  onChange={(e) => {
                    e.stopPropagation();
                    const newVale = e.target.value;
                    setCasaValues({
                      ...casaValues,
                      uber: newVale
                    });

                    // Cancel previous timer
                    if (autoQueueTimerRef.current) {
                      clearTimeout(autoQueueTimerRef.current);
                      autoQueueTimerRef.current = null;
                    }

                    const trimmed = newVale.trim();
                    if (trimmed && uberPrintAttached && onQueueUberPrintAction) {
                      autoQueueTimerRef.current = setTimeout(() => {
                        onQueueUberPrintAction(trimmed, uberPrintAttached);
                        setCasaValues(prev => ({
                          ...prev,
                          uber: ''
                        }));
                        autoQueueTimerRef.current = null;
                      }, 2000);
                    }
                  }}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const val = (casaValues.uber || '').trim();
                      if (val) {
                        if (autoQueueTimerRef.current) {
                          clearTimeout(autoQueueTimerRef.current);
                          autoQueueTimerRef.current = null;
                        }
                        onImmediateUberRelease?.(val, uberPrintAttached);
                        setCasaValues({ ...casaValues, uber: '' });
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const val = (casaValues.uber || '').trim();
                    if (val) {
                      if (autoQueueTimerRef.current) {
                        clearTimeout(autoQueueTimerRef.current);
                        autoQueueTimerRef.current = null;
                      }
                      onImmediateUberRelease?.(val, uberPrintAttached);
                      setCasaValues({ ...casaValues, uber: '' });
                    }
                  }}
                  className="px-2 py-0.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-[8px] font-black uppercase tracking-widest rounded transition-all cursor-pointer"
                >
                  LIBERAR
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (autoQueueTimerRef.current) {
                      clearTimeout(autoQueueTimerRef.current);
                      autoQueueTimerRef.current = null;
                    }
                    onUberPrintAttachedChange?.(null);
                    setCasaValues({ ...casaValues, uber: '' });
                  }}
                  className="px-1.5 py-0.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white text-[8px] font-black uppercase rounded transition-all cursor-pointer"
                  title="Cancelar Print"
                >
                  X
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
