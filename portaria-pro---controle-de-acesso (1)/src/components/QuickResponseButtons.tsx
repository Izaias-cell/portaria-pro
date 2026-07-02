import React, { useState } from 'react';
import { cn } from '../lib/utils';
import { Check, X, Clock, MessageSquare, Copy } from 'lucide-react';
import { AccessType } from '../types';

interface QuickResponseButtonsProps {
  unit: string;
  residentName: string;
  onResponse: (type: 'auth' | 'info', message: string, accessType?: AccessType, name?: string) => void;
  vertical?: boolean;
}

export function QuickResponseButtons({ 
  unit, 
  residentName, 
  onResponse,
  vertical = false
}: QuickResponseButtonsProps) {
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Bom dia';
    if (hour >= 12 && hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const greeting = getGreeting();

  const responses = [
    { 
      id: 'delivery_auth', 
      label: 'Entrega Autorizada', 
      type: 'auth' as const,
      accessType: 'delivery' as AccessType,
      message: `${greeting}, *${residentName}*. Entrega autorizada para a unidade ${unit}. Pode liberar.`,
      color: 'bg-orange-600',
      icon: Check
    },
    { 
      id: 'visitor_auth', 
      label: 'Visitante Autorizado', 
      type: 'auth' as const,
      accessType: 'visitor' as AccessType,
      message: `${greeting}, *${residentName}*. Visitante autorizado para a unidade ${unit}. Pode liberar.`,
      color: 'bg-emerald-600',
      icon: Check
    },
    { 
      id: 'service_auth', 
      label: 'Prestador Autorizado', 
      type: 'auth' as const,
      accessType: 'service' as AccessType,
      message: `${greeting}, *${residentName}*. Prestador autorizado para a unidade ${unit}. Pode liberar.`,
      color: 'bg-blue-600',
      icon: Check
    },
    { 
      id: 'waiting', 
      label: 'Aguardando', 
      type: 'info' as const,
      message: `${greeting}, *${residentName}*. Estamos aguardando confirmação do morador da unidade ${unit}.`,
      color: 'bg-slate-600',
      icon: Clock
    },
    { 
      id: 'denied', 
      label: 'Não Autorizado', 
      type: 'info' as const,
      message: `${greeting}, *${residentName}*. A entrada não foi autorizada para a unidade ${unit}.`,
      color: 'bg-red-600',
      icon: X
    },
  ];

  const handleAction = (resp: typeof responses[0]) => {
    onResponse(resp.type, resp.message, resp.accessType, "");
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowRight') {
      const parent = e.currentTarget.parentElement;
      if (parent) {
        const next = (index + 1) % responses.length;
        setFocusedIndex(next);
        (parent.children[next] as HTMLElement).focus();
      }
    } else if (e.key === 'ArrowLeft') {
      const parent = e.currentTarget.parentElement;
      if (parent) {
        const prev = (index - 1 + responses.length) % responses.length;
        setFocusedIndex(prev);
        (parent.children[prev] as HTMLElement).focus();
      }
    }
  };

  return (
    <div className={cn(
      "animate-in fade-in slide-in-from-top-2 duration-500 bg-white border border-slate-100 rounded-2xl shadow-sm",
      vertical ? "mt-0 h-full flex flex-col p-2.5" : "mt-3 p-4"
    )}>
      <div className={cn("flex flex-col px-1", vertical ? "mb-1.5 gap-1" : "mb-3 gap-3")}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-3 h-3 text-slate-400" />
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Respostas Rápidas</span>
          </div>
        </div>
      </div>
      
      <div className={cn(
        "flex focus-within:ring-0",
        vertical ? "flex-col w-full gap-1" : "flex-wrap gap-1.5"
      )}>
        {responses.map((resp, index) => {
          const Icon = resp.icon;
          const isFocused = focusedIndex === index;
          
          return (
            <button
              key={resp.id}
              onClick={() => handleAction(resp)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              onMouseEnter={() => setFocusedIndex(index)}
              onMouseLeave={() => setFocusedIndex(-1)}
              onFocus={() => setFocusedIndex(index)}
              onBlur={() => setFocusedIndex(-1)}
              className={cn(
                "flex items-center gap-2 rounded-lg transition-all duration-200 border cursor-pointer active:scale-95 outline-none text-left",
                vertical ? "w-full justify-start py-1 px-2.5 text-[9px]" : "py-1.5 px-3 text-[9px]",
                resp.color === 'bg-orange-600' ? "bg-orange-50 text-orange-600 border-orange-100 hover:bg-orange-600 hover:text-white" :
                resp.color === 'bg-emerald-600' ? "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-600 hover:text-white" :
                resp.color === 'bg-blue-600' ? "bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-600 hover:text-white" :
                resp.color === 'bg-slate-600' ? "bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-600 hover:text-white" :
                "bg-red-50 text-red-600 border-red-100 hover:bg-red-600 hover:text-white",
                isFocused && "ring-2 ring-blue-500 ring-offset-1 border-blue-500 scale-[1.01] shadow-sm"
              )}
            >
              <Icon className="w-3 h-3 shrink-0" />
              <span className="font-extrabold uppercase tracking-tight truncate">
                {resp.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
