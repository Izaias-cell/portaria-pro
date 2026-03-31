import React from 'react';
import { AccessRecord } from '../types';
import { format } from 'date-fns';
import { User, Package, Wrench, LogOut, Clock, MapPin, Car, Zap, Shield, ShieldAlert, Users, Calendar } from 'lucide-react';
import { cn } from '../lib/utils';

interface AccessLogProps {
  title: string;
  records: AccessRecord[];
  onExit: (id: string) => void;
  emptyMessage?: string;
}

export function AccessLog({ title, records, onExit, emptyMessage = "Nenhum registro encontrado." }: AccessLogProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'visitor': return User;
      case 'delivery': return Package;
      case 'service': return Wrench;
      default: return User;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'visitor': return 'text-emerald-600 bg-emerald-50';
      case 'delivery': return 'text-orange-600 bg-orange-50';
      case 'service': return 'text-blue-600 bg-blue-50';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  const getSubtypeLabel = (subtype?: string) => {
    if (!subtype) return null;
    switch (subtype) {
      case 'motoboy': return 'Motoboy';
      case 'delivery': return 'Delivery (iFood/Rappi)';
      case 'transportadora': return 'Transportadora';
      case 'correios_encomenda': return 'Correios / Encomenda';
      case 'outro': return 'Outro';
      default: return subtype;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'visitor': return 'Visitante';
      case 'delivery': return 'Entrega';
      case 'service': return 'Prestador';
      default: return 'Registro';
    }
  };

  return (
    <div className="p-4 space-y-3">
      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1 mb-2">{title}</h3>
      
      {records.length === 0 ? (
        <div className="p-8 text-center text-slate-400 bg-white/50 rounded-2xl border border-dashed border-slate-200">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-20" />
          <p className="text-xs font-medium">{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((record) => {
            const Icon = getIcon(record.type);
            const isExited = record.status === 'finalizado';

            return (
              <div
                key={record.id}
                className={cn(
                  "bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center gap-4 transition-all",
                  isExited ? "opacity-60 grayscale-[0.5]" : "hover:shadow-md hover:border-slate-200"
                )}
              >
                <div className={cn("p-3 rounded-xl shrink-0", getTypeColor(record.type))}>
                  <Icon className="w-6 h-6" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2 truncate">
                      <h4 className="font-bold text-slate-900 truncate uppercase tracking-tight">{record.name}</h4>
                      {record.fastFlow && (
                        <Zap className="w-3 h-3 text-amber-500 fill-amber-500" title="Fluxo Rápido" />
                      )}
                      {record.origin === 'visitante_frequente' && (
                        <Users className="w-3 h-3 text-blue-500 fill-blue-500" title="Visitante Frequente" />
                      )}
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-500">
                      {format(record.timestamp, 'HH:mm')}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                    <div className="flex items-center gap-1 text-slate-900 text-xs font-bold">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{record.destination}</span>
                    </div>

                    {record.type !== 'delivery' && (
                      <div className={cn("text-[10px] font-black uppercase tracking-wider px-1.5 rounded", getTypeColor(record.type))}>
                        {getTypeLabel(record.type)}
                      </div>
                    )}
                    
                    {record.type === 'delivery' && record.deliverySubtype && (
                      <div className="flex items-center gap-1 text-orange-600 text-[10px] font-black uppercase tracking-wider bg-orange-50 px-1.5 rounded">
                        ENTREGA / {getSubtypeLabel(record.deliverySubtype)}
                      </div>
                    )}

                    {record.origin === 'pre_autorizacao' && (
                      <div className="flex items-center gap-1 text-purple-600 text-[10px] font-black uppercase tracking-wider bg-purple-50 px-1.5 rounded">
                        <Calendar className="w-3 h-3" />
                        PRÉ-AUTORIZAÇÃO
                      </div>
                    )}

                    {record.plate && (
                      <div className="flex items-center gap-1 text-slate-500 text-xs">
                        <Car className="w-3 h-3" />
                        <span className="font-mono font-bold">{record.plate}</span>
                      </div>
                    )}

                    {record.origin === 'visitante_frequente' && record.ruleUsed && (
                      <div className={cn(
                        "flex items-center gap-1 text-[9px] font-black uppercase px-1.5 rounded",
                        record.ruleUsed === 'SEMPRE_LIBERADO' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                      )}>
                        {record.ruleUsed === 'SEMPRE_LIBERADO' ? <Shield className="w-2 h-2" /> : <ShieldAlert className="w-2 h-2" />}
                        VISITANTE FREQUENTE / {record.ruleUsed === 'SEMPRE_LIBERADO' ? 'SEMPRE LIBERADO' : 'AVISAR ANTES'}
                      </div>
                    )}
                  </div>
                </div>

                {!isExited && (
                  <button
                    onClick={() => onExit(record.id)}
                    className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors active:scale-90 flex flex-col items-center gap-1"
                    title="Registrar Saída"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="text-[8px] font-black uppercase tracking-tighter">Saída</span>
                  </button>
                )}
                
                {isExited && (
                  <div className="text-[10px] font-bold text-slate-400 uppercase text-right leading-none flex flex-col gap-1">
                    <span className="text-emerald-500">Finalizado</span>
                    <span>
                      Saída<br />
                      {format(record.exitTimestamp!, 'HH:mm')}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
