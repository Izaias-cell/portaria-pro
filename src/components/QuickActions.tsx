import React from 'react';
import { UserPlus, Package, Wrench, UserCheck } from 'lucide-react';
import { AccessType } from '../types';
import { cn } from '../lib/utils';

interface QuickActionsProps {
  onAction: (type: AccessType) => void;
  activeType: AccessType | null;
}

export function QuickActions({ onAction, activeType }: QuickActionsProps) {
  const actions = [
    { id: 'visitor', label: 'Visitante', icon: UserPlus, color: 'bg-emerald-600', hover: 'hover:bg-emerald-700' },
    { id: 'delivery', label: 'Entrega', icon: Package, color: 'bg-orange-600', hover: 'hover:bg-orange-700' },
    { id: 'service', label: 'Prestador', icon: Wrench, color: 'bg-blue-600', hover: 'hover:bg-blue-700' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4">
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={() => onAction(action.id as AccessType)}
          className={cn(
            "flex flex-col items-center justify-center p-4 rounded-xl transition-all active:scale-95 shadow-md",
            action.color,
            action.hover,
            "text-white font-bold gap-2 border-2",
            activeType === action.id ? "border-white scale-105 ring-4 ring-white/20" : "border-transparent"
          )}
        >
          <action.icon className="w-8 h-8" />
          <span className="text-sm uppercase tracking-wide">{action.label}</span>
        </button>
      ))}
    </div>
  );
}
