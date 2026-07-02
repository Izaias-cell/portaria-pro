import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { Prisma } from '../types';
import { cn } from '../lib/utils';
import { toast } from '../lib/toast';

interface PrismaModalProps {
  isOpen: boolean;
  onClose: () => void;
  prismas: Prisma[];
  onSavePrismas: (updated: Prisma[]) => void;
}

const PRISMA_COLORS = ["Amarelo", "Vermelho", "Azul", "Verde", "Branco", "Preto", "Outro"];

const COLOR_EMOJIS: Record<string, string> = {
  Amarelo: '🟨',
  Vermelho: '🟥',
  Azul: '🟦',
  Verde: '🟩',
  Branco: '⬜',
  Preto: '⬛',
  Outro: '🎨',
};

// Safe identifier generator
const generateSafeId = () => {
  return 'prisma_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
};

export const PrismaModal: React.FC<PrismaModalProps> = ({
  isOpen,
  onClose,
  prismas = [],
  onSavePrismas,
}) => {
  // Local list of prismas so we can apply changes and only save on Clicking SAVE
  const [localPrismasList, setLocalPrismasList] = useState<Prisma[]>([]);

  // Add inputs
  const [newNumber, setNewNumber] = useState('');
  const [newColor, setNewColor] = useState('Amarelo');
  const [newQuantity, setNewQuantity] = useState(1);

  // Sync with prop when modal opens
  useEffect(() => {
    if (isOpen) {
      const sanitized = (Array.isArray(prismas) ? prismas : [])
        .filter(p => p !== null && p !== undefined && typeof p === 'object')
        .map(p => ({
          id: p.id || generateSafeId(),
          number: String(p.number || ''),
          color: String(p.color || 'Amarelo'),
          status: p.status === 'em_uso' ? 'em_uso' : 'disponivel',
          currentUnit: p.currentUnit || undefined,
          currentRecordId: p.currentRecordId || undefined
        }));
      setLocalPrismasList(sanitized);
    }
  }, [isOpen, prismas]);

  if (!isOpen) return null;

  // Sorted list of current local prismas
  const sortedPrismas = useMemo(() => {
    return [...localPrismasList]
      .filter(p => p && p.number !== undefined && p.number !== null)
      .sort((a, b) => {
        const numA = parseInt(String(a.number), 10);
        const numB = parseInt(String(b.number), 10);
        if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB;
        }
        return String(a.number || '').localeCompare(String(b.number || ''));
      });
  }, [localPrismasList]);

  // Statistics
  const stats = useMemo(() => {
    const total = localPrismasList.length;
    const disponiveis = localPrismasList.filter(p => p && p.status === 'disponivel').length;
    const emUso = localPrismasList.filter(p => p && p.status === 'em_uso').length;
    return { total, disponiveis, emUso };
  }, [localPrismasList]);

  // Add function
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNum = newNumber.trim();
    if (!cleanNum) {
      toast.error('NÚMERO OBRIGATÓRIO', {
        description: 'É necessário informar o número do prisma.'
      });
      return;
    }

    const qty = Math.max(1, Math.floor(newQuantity));
    
    // Check duplication in the local inventory (same number and same color)
    const duplicate = localPrismasList.some(
      p => p && String(p.number || '').trim().toUpperCase() === cleanNum.toUpperCase() && String(p.color || '') === newColor
    );

    if (duplicate) {
      toast.error('JÁ CADASTRADO', {
        description: `Prisma ${cleanNum} ${newColor} já existe no inventário do plantão.`
      });
      return;
    }

    // Add specified quantity
    const newItems: Prisma[] = [];
    for (let i = 0; i < qty; i++) {
      newItems.push({
        id: generateSafeId(),
        number: cleanNum,
        color: newColor,
        status: 'disponivel'
      });
    }

    setLocalPrismasList(prev => [...prev, ...newItems]);
    
    toast.success('Prisma adicionado!', {
      description: `${qty}x Prisma ${cleanNum} (${newColor}) registrado como disponível para o plantão.`
    });

    // Reset fields
    setNewNumber('');
    setNewQuantity(1);
  };

  // Delete function (local only)
  const handleDeleteLocal = (id: string, number: string, color: string) => {
    setLocalPrismasList(prev => prev.filter(p => p.id !== id));
    toast.info('Prisma removido da lista', {
      description: `Prisma Nº ${number} (${color}) removido.`
    });
  };

  // Save all changes function
  const handleSave = () => {
    onSavePrismas(localPrismasList);
    toast.success('Configurações salvas!', {
      description: 'Inventário de prismas do plantão atualizado com sucesso.'
    });
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100 bg-[#0c1f24] text-white shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔷</span>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-teal-400 font-mono">Gerenciamento de Prismas</h4>
              <p className="text-[9px] font-bold text-teal-200 tracking-tight">Insira, remova e configure os prismas do plantão</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-full text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* STATS BAR */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-150 flex items-center justify-between text-[11px] font-bold text-slate-600 shrink-0">
          <div className="flex gap-4">
            <span>Disponíveis: <strong className="text-emerald-600 font-black">{stats.disponiveis}</strong></span>
            <span>Em uso: <strong className="text-red-500 font-black">{stats.emUso}</strong></span>
          </div>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">TOTAL: {stats.total}</span>
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/20">
          
          {/* DIRECT ADD FORM (100% compliant with specs) */}
          <form onSubmit={handleAddSubmit} className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col gap-3 shadow-xs text-left">
            <span className="text-[9.5px] font-black uppercase tracking-widest text-slate-500 pb-1 border-b border-slate-100 block">
              ✨ ADICIONAR NOVO PRISMA AO PLANTÃO
            </span>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 1. NÚMERO DO PRISMA */}
              <div className="space-y-1">
                <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest block">1. Número do Prisma</label>
                <input
                  type="text"
                  placeholder="Ex: 11"
                  className="w-full h-9 px-3 bg-slate-50 border-2 border-slate-150 rounded-xl text-xs font-black uppercase outline-none focus:border-blue-500 focus:bg-white transition"
                  value={newNumber}
                  onChange={(e) => setNewNumber(e.target.value.toUpperCase())}
                />
              </div>

              {/* 2. COR DO PRISMA */}
              <div className="space-y-1">
                <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest block">2. Cor do Prisma</label>
                <select
                  className="w-full h-9 px-2 bg-slate-50 border-2 border-slate-150 rounded-xl text-xs font-black outline-none focus:border-blue-500 focus:bg-white transition"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                >
                  {PRISMA_COLORS.map(color => (
                    <option key={color} value={color}>
                      {COLOR_EMOJIS[color] || '🔷'} {color.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. QUANTIDADE */}
              <div className="space-y-1">
                <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest block">3. Quantidade</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  className="w-full h-9 px-3 bg-slate-50 border-2 border-slate-150 rounded-xl text-xs font-black outline-none focus:border-blue-500 focus:bg-white transition"
                  value={newQuantity}
                  onChange={(e) => setNewQuantity(parseInt(e.target.value, 10) || 1)}
                />
              </div>
            </div>

            {/* 4. BOTÃO ADICIONAR */}
            <div className="flex justify-end mt-1">
              <button
                type="submit"
                className="h-9 px-5 bg-teal-600 hover:bg-teal-700 text-white font-extrabold rounded-xl text-[10px] uppercase tracking-wider transition-all border-b-2 border-teal-850 flex items-center gap-1.5 shadow-sm active:scale-98 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                ADICIONAR PRISMA(S)
              </button>
            </div>
          </form>

          {/* LIST OF CURRENT LOCAL PRISMAS */}
          <div className="text-left py-1">
            <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2.5 font-mono">
              📋 INVENTÁRIO DE PRISMAS DO PLANTÃO ({sortedPrismas.length})
            </h5>
            
            {sortedPrismas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 bg-white border border-slate-200 rounded-3xl text-center text-slate-300">
                <span className="text-3xl mb-1.5">🔷</span>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nenhum prisma ativo</p>
                <p className="text-[8.5px] font-semibold text-slate-450 mt-1">Cadastre novos prismas utilizando o formulário acima.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {sortedPrismas.map(p => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border bg-white border-slate-150 shadow-xs hover:border-slate-350 transition duration-150"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg shrink-0 leading-none">{COLOR_EMOJIS[p.color] || '🔷'}</span>
                      <div className="min-w-0 flex flex-col">
                        <span className="text-xs font-black text-slate-800 truncate">PRISMA {p.number}</span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase">{p.color}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteLocal(p.id, p.number, p.color)}
                      className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-all cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-150 flex gap-2 justify-end items-center shrink-0">
          {/* 6. BOTÃO FECHAR */}
          <button
            type="button"
            onClick={onClose}
            className="px-4 h-9 border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-extrabold rounded-xl text-[10px] uppercase tracking-wider transition-all active:scale-95 shadow-xs cursor-pointer"
          >
            FECHAR
          </button>

          {/* 5. BOTÃO SALVAR */}
          <button
            type="button"
            onClick={handleSave}
            className="px-5 h-9 bg-teal-600 hover:bg-teal-700 text-white font-extrabold rounded-xl text-[10px] uppercase tracking-wider transition-all border-b-2 border-teal-850 flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
          >
            💾 SALVAR ALTERAÇÕES
          </button>
        </div>

      </div>
    </div>
  );
};
