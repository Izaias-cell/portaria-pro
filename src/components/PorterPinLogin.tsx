import React, { useState } from 'react';
import { Shield, AlertTriangle, KeyRound, Mail, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Porteiro } from '../types';

interface PorterPinLoginProps {
  condoName: string;
  onLogin: (email: string, pin: string) => Promise<boolean>;
}

export function PorterPinLogin({ condoName, onLogin }: PorterPinLoginProps) {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setIsLoading(true);
    setIsError(false);

    try {
      const success = await onLogin(email.trim(), password.trim());
      setIsLoading(false);
      if (!success) {
        setIsError(true);
        setErrorMessage('E-mail ou senha inválidos.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setIsError(true);
      setErrorMessage(err.message || 'Erro de conexão com o servidor.');
    }
  };

  return (
    <div className="fixed inset-0 z-[50] flex items-center justify-center bg-slate-950 overflow-y-auto p-4 md:p-6 select-none leading-normal font-sans">
      {/* Decorative gradient backdrops */}
      <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[250px] h-[250px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-[2rem] shadow-2xl p-6 sm:p-8 flex flex-col items-center relative z-10"
      >
        {/* Emblem */}
        <div className="w-20 h-20 bg-transparent rounded-3xl overflow-hidden flex items-center justify-center mb-4">
          <img 
            src="/favicon.png" 
            alt="ACCEPASS Logo" 
            className="w-full h-full object-cover" 
            referrerPolicy="no-referrer" 
          />
        </div>

        {/* Header Title */}
        <div className="text-center space-y-1.5 mb-6">
          <h2 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">
            ACCEPASS
          </h2>
          <p className="text-[10px] text-blue-400 font-extrabold uppercase tracking-wider">
            Acesso inteligente. Liberação imediata.
          </p>
          <div className="inline-flex items-center gap-1.5 bg-slate-800/80 px-4 py-1.5 rounded-full border border-slate-700/50 mt-1">
            <span className="text-[10px] font-black uppercase text-slate-300 tracking-wider">
              {condoName}
            </span>
          </div>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">
              E-mail de Acesso
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemplo@email.com"
                className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/35 focus:border-blue-500 transition-all lowercase"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">
              Senha de Acesso
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/35 focus:border-blue-500 transition-all font-mono tracking-widest"
              />
            </div>
          </div>

          {/* Error message Banner */}
          <AnimatePresence>
            {isError && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-red-950/50 border border-red-500/30 p-3 rounded-xl flex items-center gap-2.5 text-red-200 font-bold text-[11px] uppercase tracking-wider"
              >
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-500 active:scale-95 border border-blue-500 py-3.5 px-6 rounded-2xl text-xs font-black text-white uppercase tracking-widest transition-all mt-6 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:pointer-events-none"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>Entrar</span>
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
