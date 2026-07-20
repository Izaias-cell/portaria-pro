import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Shield, Clock, Volume2, VolumeX, UserCheck, LogOut } from 'lucide-react';

interface HeaderProps {
  condoName?: string;
  isMuted?: boolean;
  onToggleMute?: () => void;
  loggedPorterName?: string;
  loggedPorterRole?: string;
  loggedPorterEmail?: string;
  onLogoutShift?: () => void;
}

export function Header({ 
  condoName, 
  isMuted, 
  onToggleMute,
  loggedPorterName,
  loggedPorterRole,
  loggedPorterEmail,
  onLogoutShift
}: HeaderProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let timeoutId: number;
    
    const tick = () => {
      const currentTime = Date.now();
      setNow(currentTime);
      
      const delay = 1000 - (currentTime % 1000);
      timeoutId = window.setTimeout(tick, delay);
    };

    tick();

    return () => window.clearTimeout(timeoutId);
  }, []);

  const time = new Date(now);

  return (
    <header className="bg-slate-900 text-white p-4 sm:p-6 flex flex-row justify-between items-center shadow-xl border-b border-slate-800 w-full overflow-hidden box-border">
      <div className="flex items-center gap-4 sm:gap-5">
        <div className="bg-transparent rounded-2xl overflow-hidden shrink-0 w-11 h-11 sm:w-13 sm:h-13 flex items-center justify-center shadow-lg shadow-blue-500/10">
          <img 
            src="/favicon.png" 
            alt="ACCEPASS Logo" 
            className="w-full h-full object-cover" 
            referrerPolicy="no-referrer" 
          />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-black uppercase tracking-tighter leading-none whitespace-nowrap">
              ACCEPASS <span className="text-blue-500 mx-1">-</span> <span className="text-slate-400 font-bold">Acesso</span>
            </h1>
          </div>
          <p className="text-[10px] sm:text-xs text-slate-500 font-black uppercase tracking-[0.2em] mt-1.5 truncate">
            {condoName || 'CONDOMÍNIO'}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-3 sm:gap-6 shrink-0 ml-4">
        {(loggedPorterName || loggedPorterEmail) && (
          <div 
            onClick={onLogoutShift}
            className="flex items-center gap-2 xs:gap-3 bg-slate-800/50 hover:bg-slate-700/60 hover:border-slate-700 active:scale-[0.98] px-3 py-1.5 rounded-2xl border border-slate-800/50 min-w-0 text-left cursor-pointer transition-all group"
            title="Encerrar Plantão"
          >
            <div className="hidden sm:flex w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 group-hover:bg-blue-500/20 items-center justify-center text-blue-400 shrink-0 transition-colors">
              <UserCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[9px] font-black text-slate-500 group-hover:text-slate-400 leading-none tracking-wider transition-colors">
                {(() => {
                  const r = (loggedPorterRole || '').toLowerCase();
                  if (r.includes('admin')) return 'Administrador logado';
                  if (r.includes('sindico') || r.includes('síndico')) return 'Síndico logado';
                  return 'Porteiro logado';
                })()}
              </div>
              <div className="text-[10px] font-black uppercase text-slate-200 mt-1 truncate max-w-[100px] xs:max-w-[130px] group-hover:text-white transition-colors">
                {loggedPorterName || loggedPorterEmail || 'Usuário'}
              </div>
              {loggedPorterRole && (
                <div className="text-[7px] font-black uppercase text-blue-400 mt-0.5 tracking-wider hidden sm:block truncate leading-none">
                  {loggedPorterRole}
                </div>
              )}
            </div>
            {onLogoutShift && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onLogoutShift();
                }}
                className="ml-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-750 font-extrabold text-[8px] sm:text-[9.5px] uppercase tracking-widest text-white rounded-xl transition-all flex items-center gap-1 shrink-0 active:scale-95 leading-none cursor-pointer shadow-sm"
                title="Encerrar Plantão e liberar tela para novo PIN"
              >
                <LogOut className="w-3 h-3" />
                <span className="hidden xs:inline">Encerrar Plantão</span>
                <span className="xs:hidden">Sair</span>
              </button>
            )}
          </div>
        )}

        {onToggleMute && (
          <button
            onClick={onToggleMute}
            className="p-2 sm:p-2.5 bg-slate-800/80 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all active:scale-95 border border-slate-700/50 flex items-center justify-center shrink-0"
            title={isMuted ? "Ativar som operacional" : "Desativar som operacional"}
          >
            {isMuted ? <VolumeX className="w-4.5 h-4.5 text-rose-400" /> : <Volume2 className="w-4.5 h-4.5 text-emerald-400" />}
          </button>
        )}
        <div className="hidden xs:flex flex-col items-end">
          <div className="flex items-center gap-1.5 text-blue-400 mb-0.5">
            <Clock className="w-4 h-4 sm:w-5 h-5 text-blue-500/50" />
            <span className="text-base sm:text-2xl font-mono font-black tracking-wider leading-none">
              {format(time, 'HH:mm:ss')}
            </span>
          </div>
          <p className="text-[10px] sm:text-[11px] font-black text-slate-500 uppercase tracking-widest leading-none">
            {format(time, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
      </div>
    </header>
  );
}
