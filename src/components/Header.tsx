import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Shield, Clock } from 'lucide-react';

export function Header() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="bg-slate-900 text-white p-4 flex justify-between items-center shadow-lg border-b border-slate-800">
      <div className="flex items-center gap-3">
        <div className="bg-blue-600 p-2 rounded-lg">
          <Shield className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-lg font-bold leading-tight">Portaria Pro</h1>
          <p className="text-xs text-slate-400 font-mono uppercase tracking-wider">Controle de Acesso</p>
        </div>
      </div>
      
      <div className="text-right flex flex-col items-end">
        <div className="flex items-center gap-2 text-blue-400 font-mono text-xl font-bold">
          <Clock className="w-4 h-4" />
          {format(time, 'HH:mm:ss')}
        </div>
        <p className="text-xs text-slate-400">
          {format(time, "EEEE, d 'de' MMMM", { locale: ptBR })}
        </p>
      </div>
    </header>
  );
}
