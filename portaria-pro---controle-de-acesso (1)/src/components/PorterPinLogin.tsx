import React, { useState } from 'react';
import { Shield, Check, X, Lock, KeyRound, Building, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Porteiro } from '../types';

interface PorterPinLoginProps {
  condoName: string;
  porteiros: Porteiro[];
  onLogin: (pin: string) => boolean;
}

export function PorterPinLogin({ condoName, porteiros, onLogin }: PorterPinLoginProps) {
  const [pin, setPin] = useState<string>('');
  const [isError, setIsError] = useState(false);

  // Filter porteiros belonging to current condo for the helper display case-insensitively
  const currentCondoPorters = porteiros.filter(
    p => p.condoName && p.condoName.toLowerCase() === condoName.toLowerCase() && p.active
  );

  const handleKeyPress = (num: string) => {
    if (pin.length < 6) {
      const nextPin = pin + num;
      setPin(nextPin);
      
      // Auto-submit on 4 or 6 digits if matched
      if (nextPin.length === 4) {
        // Only auto-submit at 4 digits if there is an active porter in this condo with this exact 4-digit PIN
        const hasMatchingActivePorter = porteiros.some(
          p => p.pin === nextPin && p.active && p.condoName && p.condoName.toLowerCase() === condoName.toLowerCase()
        );
        if (hasMatchingActivePorter) {
          const success = onLogin(nextPin);
          if (success) {
            setPin('');
          } else {
            setIsError(true);
            setTimeout(() => {
              setIsError(false);
              setPin('');
            }, 800);
          }
        }
      } else if (nextPin.length === 6) {
        const success = onLogin(nextPin);
        if (success) {
          setPin('');
        } else {
          setIsError(true);
          setTimeout(() => {
            setIsError(false);
            setPin('');
          }, 800);
        }
      }
    }
  };

  const handleClear = () => {
    setPin('');
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handleManualSubmit = () => {
    if (pin.length >= 4) {
      const success = onLogin(pin);
      if (success) {
        setPin('');
      } else {
        setIsError(true);
        setTimeout(() => {
          setIsError(false);
          setPin('');
        }, 850);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[50] flex items-center justify-center bg-slate-950 overflow-y-auto p-4 md:p-6 select-none leading-normal">
      {/* Absolute decorative gradient backdrops */}
      <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[250px] h-[250px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl p-6 sm:p-8 flex flex-col items-center relative z-10"
      >
        {/* Emblem */}
        <div className="w-16 h-16 bg-blue-500/10 border-2 border-blue-500/25 rounded-3xl flex items-center justify-center text-blue-400 mb-4 animate-pulse">
          <Shield className="w-8 h-8 font-black" />
        </div>

        {/* Header Title */}
        <div className="text-center space-y-2 mb-6">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">
            Início de Plantão
          </h2>
          <div className="inline-flex items-center gap-1.5 bg-slate-800/80 px-4 py-1.5 rounded-full border border-slate-700/50">
            <Building className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[10px] font-black uppercase text-slate-300 tracking-wider">
              {condoName}
            </span>
          </div>
          <p className="text-slate-400 text-xs font-medium max-w-xs mx-auto pt-2">
            Insira seu PIN numérico de 4 ou 6 dígitos para autenticar a jornada neste computador.
          </p>
        </div>

        {/* PIN Entered Bullets Display */}
        <div className={cn(
          "flex justify-center items-center gap-3 w-full bg-slate-950/60 p-4 rounded-3xl border border-slate-800/80 mb-6 relative overflow-hidden",
          isError ? "border-red-500 shadow-md shadow-red-500/10 animate-shake" : "border-slate-800"
        )}>
          {/* Subtle error text banner */}
          <AnimatePresence>
            {isError && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="absolute inset-0 bg-red-950/90 flex items-center justify-center gap-2 text-red-100 font-extrabold text-[11px] uppercase tracking-wider"
              >
                <AlertTriangle className="w-4 h-4 text-red-400 scale-110" />
                PIN Inválido ou Negado
              </motion.div>
            )}
          </AnimatePresence>

          {/* Render 6 placeholders, filled if length is typed */}
          {[0, 1, 2, 3, 4, 5].map((idx) => {
            const hasValue = pin.length > idx;
            return (
              <div
                key={idx}
                className={cn(
                  "w-4 h-4 rounded-full border-2 transition-all duration-150 flex items-center justify-center",
                  hasValue 
                    ? "bg-blue-500 border-blue-500 scale-125" 
                    : "border-slate-700 bg-slate-900"
                )}
              />
            );
          })}
        </div>

        {/* Keyboard layout */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-xs mb-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyPress(num.toString())}
              className="h-14 sm:h-16 bg-slate-800/60 hover:bg-slate-800 hover:border-slate-700 active:scale-95 border border-slate-800 text-lg sm:text-xl font-black text-slate-100 rounded-2xl transition-all uppercase shadow-sm"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="h-14 sm:h-16 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 active:scale-95 border border-slate-800 text-xs font-black text-rose-400 rounded-2xl transition-all uppercase shadow-sm"
          >
            Limpar
          </button>
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="h-14 sm:h-16 bg-slate-800/60 hover:bg-slate-800 hover:border-slate-700 active:scale-95 border border-slate-800 text-lg sm:text-xl font-black text-slate-100 rounded-2xl transition-all uppercase shadow-sm"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-14 sm:h-16 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 active:scale-95 border border-slate-800 text-xs font-black text-slate-350 rounded-2xl transition-all uppercase shadow-sm"
          >
            Apagar
          </button>
        </div>

        {/* Enter manually if they hit backspace or type 5 digits */}
        {pin.length >= 4 && (
          <button
            onClick={handleManualSubmit}
            className="w-full max-w-xs bg-blue-600 hover:bg-blue-500 active:scale-95 border border-blue-500 py-3.5 px-6 rounded-2xl text-xs font-black text-white uppercase tracking-widest transition-all mb-4 mt-2 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
          >
            <KeyRound className="w-4 h-4" />
            Confirmar Acesso
          </button>
        )}

        {/* Test help area */}
        <div className="w-full mt-4 border-t border-slate-850 pt-5 bg-slate-900/60 text-slate-400 rounded-b-2xl">
          <p className="text-center text-[10px] font-black uppercase text-slate-500 tracking-wider mb-3">
            🚪 Ambientes de Teste & Plantões Cadastrados
          </p>
          <div className="grid grid-cols-2 gap-2 text-[10px] font-medium uppercase text-slate-400 px-2 leading-relaxed">
            {porteiros.map((p) => {
              const isCurrentCondo = p.condoName && p.condoName.toLowerCase() === condoName.toLowerCase();
              return (
                <button 
                  type="button"
                  key={p.id} 
                  onClick={() => {
                    if (isCurrentCondo) {
                      onLogin(p.pin);
                    }
                  }}
                  className={cn(
                    "p-2 bg-slate-950/80 rounded-xl border border-slate-800/60 flex flex-col gap-0.5 text-left w-full transition-all duration-150 active:scale-95",
                    !isCurrentCondo ? "opacity-40 cursor-not-allowed" : "hover:border-blue-500/50 hover:bg-slate-950 cursor-pointer"
                  )}
                  disabled={!isCurrentCondo}
                >
                  <span className="font-extrabold text-slate-200 truncate">{p.name}</span>
                  <span className="text-[9px] text-slate-500 truncate leading-none">{p.role}</span>
                  <span className="text-[9px] text-blue-400 font-extrabold mt-1">
                    PIN: {p.pin} • {isCurrentCondo ? 'Simular 🔓' : 'Outro Condo'}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-3.5 text-center text-[9px] text-slate-500 bg-slate-950/40 py-2 rounded-xl border border-slate-800/30">
            ⚠️ Em conformidade com as regras operacionais de segurança.
          </div>
        </div>
      </motion.div>
    </div>
  );
}
