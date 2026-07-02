import React, { useMemo } from 'react';
import { toast } from '../lib/toast';
import { FrequentVisitor, PreAuthorization, AccessRecord, AccessType, UnitRules, UnitPhone, MemorizedPerson, PermanentProfile } from '../types';
import { User, Bike, Wrench, Zap, Shield, ShieldAlert, Calendar, Clock, LogOut, Plus, Search, MapPin, Car, Check, MessageSquare, AlertTriangle, Info, History, Home, Phone, Bell, ArrowRight, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { format, isAfter, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'motion/react';
import { QuickResponseButtons } from './QuickResponseButtons';

const getRelationshipColorClass = (relationship?: string) => {
  if (!relationship) return '';
  const rel = relationship.trim().toLowerCase();
  if (['mãe', 'mae', 'pai'].includes(rel)) {
    return 'text-red-500 font-extrabold';
  }
  if (['irmão', 'irmao', 'irmã', 'irma', 'primo', 'prima', 'tio', 'tia'].includes(rel)) {
    return 'text-blue-500 font-extrabold';
  }
  if (['amigo', 'amiga'].includes(rel)) {
    return 'text-orange-500 font-extrabold';
  }
  return 'text-slate-400';
};

interface UnifiedSearchResultsProps {
  searchTerm: string;
  frequentVisitors: FrequentVisitor[];
  preAuths: PreAuthorization[];
  unitRules: UnitRules[];
  unitPhones: UnitPhone[];
  records: AccessRecord[];
  memorizedPeople: MemorizedPerson[];
  permanentProfiles?: PermanentProfile[];
  onReleaseDirect: (visitor: FrequentVisitor) => void;
  onReleasePreAuth: (preAuth: PreAuthorization) => void;
  onManualEntry: (type: AccessType, initialData?: any) => void;
  onReleaseMemorized: (person: MemorizedPerson) => void;
  onRemoveMemorized?: (person: MemorizedPerson) => void;
  onCancelPreAuth?: (preAuth: PreAuthorization) => void;
  unitActivityThisWeek?: Map<string, number>;
  selectedIndex?: number;
  onResponse?: (type: 'auth' | 'info', message: string, accessType?: AccessType, name?: string) => void;
}

export function UnifiedSearchResults({
  searchTerm,
  frequentVisitors,
  preAuths,
  unitRules,
  unitPhones,
  records,
  memorizedPeople,
  permanentProfiles = [],
  onReleaseDirect,
  onReleasePreAuth,
  onManualEntry,
  onReleaseMemorized,
  onRemoveMemorized,
  onCancelPreAuth,
  unitActivityThisWeek,
  selectedIndex = -1,
  onResponse
}: UnifiedSearchResultsProps) {
  const normalizedSearch = searchTerm.toLowerCase().trim();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Bom dia';
    if (hour >= 12 && hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const getNoticeMessage = (residentName: string, type: AccessType) => {
    const greeting = getGreeting();
    const typeLabel = type === 'delivery' ? 'uma entrega' : type === 'service' ? 'um prestador de serviço' : 'um visitante';
    return `${greeting}, ${residentName}! Há ${typeLabel} aguardando na portaria.`;
  };

  const maskDocument = (doc?: string) => {
    if (!doc) return 'Não informado';
    if (doc.length <= 6) return doc;
    return `${doc.substring(0, 3)}.***.${doc.substring(doc.length - 3)}`;
  };

  const groupedResults = useMemo(() => {
    if (!normalizedSearch) return null;

    const normSearchStr = searchTerm.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    const cleanSearchDigits = normSearchStr.replace(/\D/g, '');

    const matches = (text?: string) => {
      if (!text) return false;
      const normalizedText = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      return normalizedText.includes(normSearchStr);
    };

    // Find all matching PermanentProfiles to check blocks or fetch details dynamically (CPF, RG, Phone)
    const matchingProfiles = (permanentProfiles || []).filter(p => {
      const pName = p.name || '';
      const pCpf = p.cpf || '';
      const pRg = p.rg || '';
      const pPhone = p.phone || '';
      
      const matchName = matches(pName);
      const matchCpf = cleanSearchDigits && pCpf.replace(/\D/g, '').includes(cleanSearchDigits);
      const matchRg = cleanSearchDigits && pRg.replace(/\D/g, '').includes(cleanSearchDigits);
      const matchPhone = cleanSearchDigits && pPhone.replace(/\D/g, '').includes(cleanSearchDigits);
      
      return matchName || matchCpf || matchRg || matchPhone;
    });

    const matchingProfileNames = new Set(matchingProfiles.map(p => p.name.toLowerCase().trim()));

    // Blocked profiles matches directly matching search terms
    const blockedProfilesMatched = matchingProfiles.filter(p => p.status === 'blocked');
    const blockedNames = new Set(
      (permanentProfiles || [])
        .filter(p => p.status === 'blocked')
        .map(p => p.name.toLowerCase().trim())
    );
    
    // 1. Filter all categories
    const allFrequents = frequentVisitors.filter(v => {
      if (!v.active) return false;
      
      // Safety constraint: Blocked visitors cannot be treated as active frequent visitors
      if (blockedNames.has(v.name.toLowerCase().trim())) {
        return false;
      }

      const directMatch = matches(v.name) || matches(v.unit) || matches(v.plate);
      const profileMatch = matchingProfileNames.has(v.name.toLowerCase().trim());
      
      return directMatch || profileMatch;
    });

    const allPreAuths = preAuths.filter(p => {
      // Safety constraint: Blocked visitors cannot receive pre-authorizations or be matched as active
      if (blockedNames.has(p.name.toLowerCase().trim())) {
        return false;
      }
      return (p.status === 'autorizada' || p.status === 'pendente_confirmacao' || p.status === 'pendente') && 
             isAfter(new Date(p.validity), new Date()) &&
             (matches(p.name) || matches(p.unit) || matches(p.plate));
    });

    const allRecords = records.filter(r => 
      matches(r.name) || matches(r.destination) || matches(r.plate)
    );

    const allPhones = unitPhones.filter(p => 
      p.active && (matches(p.unit) || matches(p.residentName))
    );

    const allRules = unitRules.filter(r => matches(r.unit));

    const matchedMemory = memorizedPeople.filter(p => {
      // Safety constraint: Blocked visitors cannot be listed as memorized active checks
      if (blockedNames.has(p.name.toLowerCase().trim())) {
        return false;
      }
      return matches(p.name) || matches(p.document) || matches(p.plate) || matches(p.lastCompany);
    });

    // 2. Identify all units involved
    const units = new Set<string>();
    allFrequents.forEach(v => units.add(v.unit));
    allPreAuths.forEach(p => units.add(p.unit));
    allRecords.forEach(r => units.add(r.destination));
    allPhones.forEach(p => units.add(p.unit));
    allRules.forEach(r => units.add(r.unit));

    // Special behavior: If searching for a number, explicitly try to find that specific unit
    const unitAsNumber = normalizedSearch.replace(/\D/g, '');
    if (unitAsNumber && unitAsNumber.length <= 5) {
      units.add(unitAsNumber);
    }

    // 3. Group by unit
    const groups: {
      unit: string;
      waiting: PreAuthorization[];
      activePreAuths: PreAuthorization[];
      frequents: FrequentVisitor[];
      phones: UnitPhone[];
      rules: UnitRules | undefined;
      recent: AccessRecord[];
    }[] = [];

    Array.from(units).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).forEach(unit => {
      const waiting = allPreAuths.filter(p => p.unit === unit && p.status === 'autorizada');
      const activePreAuths = allPreAuths.filter(p => p.unit === unit && p.status !== 'autorizada');
      const frequents = allFrequents.filter(v => v.unit === unit);
      const phones = allPhones.filter(p => p.unit === unit);
      const rules = unitRules.find(r => r.unit === unit);
      const recent = allRecords.filter(r => r.destination === unit).slice(0, 3);

      if (waiting.length > 0 || activePreAuths.length > 0 || frequents.length > 0 || phones.length > 0 || rules || recent.length > 0) {
        groups.push({ unit, waiting, activePreAuths, frequents, phones, rules, recent });
      }
    });

    return { groups, matchedMemory, blockedProfilesMatched };
  }, [normalizedSearch, frequentVisitors, preAuths, records, unitPhones, unitRules, memorizedPeople, permanentProfiles]);

  const plateMatches = useMemo(() => {
    const term = searchTerm.toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
    if (term.length < 3) return [];

    const matchedPlatesMap = new Map<string, {
      plate: string;
      lastAccess?: Date;
      users: {
        person: any;
        lastTimestamp: Date;
      }[];
    }>();

    // Check memorizedPeople
    memorizedPeople.forEach(p => {
      const plates = p.allPlates || (p.plate ? [p.plate] : []);
      plates.forEach(plate => {
        const cleanPlate = plate.toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
        if (cleanPlate.includes(term)) {
          const key = plate.toUpperCase().trim();
          if (!matchedPlatesMap.has(key)) {
            matchedPlatesMap.set(key, { plate: key, users: [] });
          }
          const entry = matchedPlatesMap.get(key)!;
          if (!entry.users.some(u => u.person.id === p.id)) {
            entry.users.push({
              person: p,
              lastTimestamp: p.lastTimestamp ? new Date(p.lastTimestamp) : new Date(0)
            });
          }
        }
      });
    });

    const result: any[] = [];
    matchedPlatesMap.forEach((entry, key) => {
      entry.users.sort((a, b) => b.lastTimestamp.getTime() - a.lastTimestamp.getTime());
      if (entry.users.length > 0) {
        entry.lastAccess = entry.users[0].lastTimestamp;
        result.push(entry);
      }
    });

    result.sort((a, b) => {
      const tA = a.lastAccess ? a.lastAccess.getTime() : 0;
      const tB = b.lastAccess ? b.lastAccess.getTime() : 0;
      return tB - tA;
    });

    return result;
  }, [searchTerm, memorizedPeople]);

  const isPlateSearch = useMemo(() => {
    const term = searchTerm.toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
    if (term.length < 3) return false;
    return plateMatches.length > 0 && /^[A-Z]{3}[0-9A-Z]{0,4}$/i.test(searchTerm.trim().replace(/[^A-Z0-9]/g, ''));
  }, [plateMatches, searchTerm]);

  if (!groupedResults) return null;

  const { groups, matchedMemory, blockedProfilesMatched = [] } = groupedResults;
  const hasAnyResult = groups.length > 0 || matchedMemory.length > 0 || plateMatches.length > 0 || blockedProfilesMatched.length > 0;

  return (
    <div className="space-y-4 px-4 py-2 pb-12">
      {blockedProfilesMatched.length > 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-[2rem] p-6 shadow-lg shadow-red-100 flex flex-col gap-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 text-red-650 rounded-full shrink-0">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-red-900 font-extrabold uppercase text-sm tracking-tight leading-none">
                🚨 ATENÇÃO: VISITANTE BLOQUEADO ENCONTRADO
              </h3>
              <p className="text-[10px] text-red-600 font-black uppercase mt-1">
                Ação impedida pelo controle de segurança condominial
              </p>
            </div>
          </div>

          <div className="space-y-3 bg-white p-4 rounded-2xl border border-red-100">
            {blockedProfilesMatched.map((profile) => (
              <div key={profile.id} className="border-b border-red-50/50 last:border-0 pb-3 last:pb-0 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-red-800 font-black text-sm uppercase">{profile.name}</span>
                  <span className="bg-red-600 text-white font-black text-[8px] tracking-widest uppercase px-2 py-0.5 rounded-md">
                    BLOQUEADO
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 font-bold uppercase">
                  <div>CPF: <span className="text-slate-850 font-mono font-black">{profile.cpf ? maskDocument(profile.cpf) : 'Não informado'}</span></div>
                  <div>RG: <span className="text-slate-850 font-mono font-black">{profile.rg ? maskDocument(profile.rg) : 'Não informado'}</span></div>
                  <div>Telefone: <span className="text-slate-850 font-mono font-black">{profile.phone || 'Não informado'}</span></div>
                  <div>Unidade Ref: <span className="text-slate-850 font-mono font-black">CASA {profile.unit || '-'}</span></div>
                </div>
                {profile.blockReason && (
                  <div className="bg-red-50/70 border border-red-100 p-2.5 rounded-xl text-[10px] font-bold text-red-700 italic">
                    <strong className="uppercase text-red-800 not-italic">Motivo do Bloqueio: </strong>
                    {profile.blockReason}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="text-[10px] text-red-800 font-black text-center uppercase tracking-wide bg-red-100/50 py-2 rounded-xl border border-red-200">
            🚫 Atenção: Contate a administração do condomínio para remover este bloqueio.
          </div>
        </div>
      )}

      {!hasAnyResult && (
        <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200">
          <Search className="w-12 h-12 mx-auto mb-3 text-slate-200" />
          <p className="text-slate-500 font-bold">Nenhum cadastro encontrado para "{searchTerm}"</p>
          <div className="mt-4 flex justify-center gap-2">
            <button
              onClick={() => onManualEntry('visitor', { name: searchTerm })}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-200 active:scale-95 transition-all"
            >
              LIBERAR / CADASTRAR ENTRADA
            </button>
          </div>
        </div>
      )}

      {/* SUGGESTÕES INTELIGENTES POR PLACA - SISTEMA DE CONFIANÇA */}
      {plateMatches.length > 0 && (
        <div className="space-y-3 pb-2 border-b border-dashed border-slate-200">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <Car className="w-4 h-4 text-amber-500 animate-pulse" />
              Sugestão Inteligente por Placa
            </h3>
            <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full uppercase border border-amber-200/50">
              {plateMatches.length} {plateMatches.length === 1 ? 'veículo' : 'veículos'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {plateMatches.map((match: any) => {
              const primaryUser = match.users[0]?.person;
              const lastTimestamp = match.users[0]?.lastTimestamp;
              
              return (
                <div 
                  key={match.plate} 
                  className="bg-amber-50/20 border-2 border-amber-200/50 rounded-[1.5rem] p-4 shadow-sm relative overflow-hidden flex flex-col justify-between hover:border-amber-400 transition-all"
                >
                  <div className="absolute top-0 right-0 p-3 opacity-[0.08]">
                    <Car className="w-16 h-16 text-amber-500" />
                  </div>

                  {isPlateSearch ? (
                    /* LAYOUT PARA BUSCA POR PLACA (Aumentar visualização, ordem: placa first, name below, doc below) */
                    <div className="space-y-3 mb-4">
                      {/* PLACA DA BUSCA (Primeiro) */}
                      <div>
                        <p className="text-[8px] font-black text-amber-600 uppercase tracking-widest mb-1">🚗 Placa do Veículo</p>
                        <div className="inline-flex bg-slate-900 text-white font-mono px-4 py-1.5 rounded-lg text-sm font-black tracking-widest border border-slate-700 shadow-md uppercase" style={{ fontVariantNumeric: 'slashed-zero' }}>
                          {match.plate}
                        </div>
                      </div>

                      {/* NOME (Abaixo da placa) */}
                      <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">👤 Último Usuário</p>
                        <p className="text-xs font-black text-slate-800 uppercase leading-snug">
                          {primaryUser?.name || 'Não informado'}
                        </p>
                      </div>

                      {/* DOCUMENTO (Abaixo do nome) */}
                      <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">🪪 Documento</p>
                        <p className="text-[11px] font-mono font-bold text-slate-600">
                          {primaryUser?.document ? maskDocument(primaryUser.document) : 'Não informado'}
                        </p>
                      </div>

                      {/* DATA ACESSO */}
                      <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">⏱️ Último Acesso</p>
                        <p className="text-[10px] font-semibold text-slate-500">
                          {lastTimestamp ? format(new Date(lastTimestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'Sem histórico'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* LAYOUT ORIGINAL PARA BUSCA POR NOME (Drives exact unmodified layout design) */
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="bg-slate-900 text-white font-mono px-3 py-1 rounded-md text-xs font-bold tracking-widest border border-slate-700 shadow-sm uppercase">
                          {match.plate}
                        </div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          Placa Identificada
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 bg-white/70 rounded-2xl p-3 border border-amber-100 shadow-xs mb-3">
                        <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Último Usuário</p>
                          <p className="text-xs font-black text-slate-800 uppercase truncate mt-0.5" title={primaryUser?.name}>
                            {primaryUser?.name || 'Não informado'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Último Acesso</p>
                          <p className="text-[10px] font-bold text-slate-600 mt-0.5">
                            {lastTimestamp ? format(new Date(lastTimestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'Sem histórico'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-2 pt-2 border-t border-dashed border-amber-200/50">
                    <p className="text-[9px] font-bold text-amber-700 uppercase tracking-wide flex items-center gap-1">
                      <Info className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                      É o(a) mesmo(a) condutor(a) do histórico?
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => onReleaseMemorized(primaryUser)}
                        className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1 border border-emerald-700 shadow-sm cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Sim, é o(a) {primaryUser?.name?.split(' ')[0]}
                      </button>
                      <button
                        type="button"
                        onClick={() => onManualEntry(primaryUser?.lastType || 'delivery', { 
                          plate: match.plate,
                          vehicleModel: primaryUser?.vehicleModel,
                          vehicleColor: primaryUser?.vehicleColor
                        })}
                        className="bg-slate-100 hover:bg-slate-205 active:scale-95 text-slate-600 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1 border border-slate-200 shadow-sm cursor-pointer"
                      >
                        <User className="w-3.5 h-3.5 text-slate-500" />
                        Não, outra pessoa
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 0. MEMÓRIA INTELIGENTE (PESSOAS) */}
      {matchedMemory.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2">
              <Zap className="w-4 h-4 fill-blue-500" />
              Memória Inteligente de Pessoas
            </h3>
            <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full uppercase">
              {matchedMemory.length} {matchedMemory.length === 1 ? 'resultado' : 'resultados'}
            </span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {matchedMemory.map((person, index) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                key={person.id}
                onClick={() => onReleaseMemorized(person)}
                className={cn(
                  "bg-white border-2 rounded-[1.5rem] p-4 shadow-xl transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] group/person flex flex-col justify-between",
                  index === (selectedIndex % (matchedMemory.length || 1)) && "ring-8 ring-blue-500/10 border-blue-500 scale-[1.02]",
                  person.lastType === 'delivery' 
                    ? "border-slate-100 shadow-slate-900/5 hover:border-[#133d47]" 
                    : person.lastType === 'visitor'
                    ? "border-emerald-100 shadow-emerald-500/5 hover:border-emerald-500"
                    : "border-blue-100 shadow-blue-500/5 hover:border-blue-500"
                )}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg relative",
                      person.lastType === 'delivery' ? "bg-orange-50 text-orange-600 border border-orange-100 shadow-orange-100/20" :
                      person.lastType === 'visitor' ? "bg-emerald-500 text-white shadow-emerald-200" :
                      "bg-blue-500 text-white shadow-blue-200"
                    )}>
                      {person.lastType === 'delivery' ? <Bike className="w-6 h-6" /> : 
                       person.lastType === 'visitor' ? <User className="w-6 h-6" /> : 
                       <Wrench className="w-6 h-6" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-slate-900 uppercase text-sm leading-tight group-hover/person:text-[#133d47] transition-colors">
                          {person.name}
                        </h4>
                        {person.count >= 3 && (
                          <div className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest border border-blue-100">
                            CONFIÁVEL
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight">
                          {person.count} {person.count === 1 ? 'acesso' : 'acessos'}
                        </span>
                      </div>
                      
                      {person.lastType === 'delivery' && person.allPlates && person.allPlates.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Veículos cadastrados:</p>
                          <div className="flex flex-col gap-1">
                            {person.allPlates.map((plate, pIdx) => (
                              <div key={pIdx} className="flex items-center gap-1.5 mt-0.5">
                                <span className="w-1 h-1 rounded-full bg-slate-400 shrink-0" />
                                <span className="text-[10px] sm:text-xs font-mono font-black text-slate-950 tracking-widest bg-white px-2 py-0.5 rounded-md border-[1.5px] border-slate-400 shadow-xs" style={{ fontVariantNumeric: 'slashed-zero' }}>
                                  {plate.toUpperCase()}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {!person.allPlates?.length && (
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mt-1.5 flex flex-wrap items-center gap-1.5">
                          {person.plate ? (
                            <span className="flex items-center gap-1.5">
                              <span className="text-[8px] text-slate-400 font-extrabold uppercase">PLACA:</span>
                              <span className="bg-white border border-slate-400 text-slate-950 font-mono font-black tracking-widest px-1.5 py-0.5 rounded text-[10px]" style={{ fontVariantNumeric: 'slashed-zero' }}>
                                {person.plate.toUpperCase()}
                              </span>
                            </span>
                          ) : (
                            <span>DOC: {maskDocument(person.document)}</span>
                          )}
                          {person.lastCompany && <span> • EMPRESA: {person.lastCompany.toUpperCase()}</span>}
                          {person.vehicleModel && <span> • MODELO: {person.vehicleModel.toUpperCase()}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className={cn(
                    "flex flex-col items-end gap-1",
                  )}>
                    <div className={cn(
                      "text-[8px] font-black uppercase px-2 py-1 rounded-lg border",
                      person.lastType === 'delivery' ? "bg-orange-50 text-orange-600 border-orange-100" :
                      person.lastType === 'visitor' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                      "bg-blue-50 text-blue-600 border-blue-100"
                    )}>
                      {person.lastType === 'delivery' ? 'Entregador' : person.lastType === 'visitor' ? 'Visitante' : 'Prestador'}
                    </div>
                    {person.count >= 5 && (
                       <span className="text-[7px] font-black text-slate-400 animate-pulse uppercase tracking-[0.2em]">RECORRENTE</span>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50/50 rounded-2xl p-3 flex items-center justify-between gap-2 border border-slate-100/50">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Home className="w-3 h-3 text-slate-400" />
                      <span className="text-[10px] font-black text-slate-700 uppercase tracking-tighter">Última Unidade: {person.lastUnit}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                        {isToday(new Date(person.lastTimestamp)) 
                          ? `Hoje, às ${format(new Date(person.lastTimestamp), 'HH:mm')}`
                          : format(new Date(person.lastTimestamp), "dd 'de' MMMM", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                  
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-all group-hover/person:translate-x-1",
                    person.lastType === 'delivery' ? "bg-[#133d47] text-white shadow-lg shadow-slate-900/10" : "bg-slate-200 text-slate-500"
                  )}>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
                
                <div className="flex items-center gap-2 w-full pt-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveMemorized?.(person);
                      toast.error('Sugestão removida');
                    }}
                    className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-[0.95] border border-red-500 shadow-md shadow-red-200/50"
                  >
                    CANCELAR
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onReleaseMemorized(person);
                    }}
                    className="flex-[2] px-6 py-2.5 rounded-xl text-white font-black text-[10px] uppercase tracking-widest shadow-lg whitespace-nowrap border transition-all bg-emerald-600 border-emerald-400 shadow-emerald-200/50 hover:bg-emerald-700 active:scale-[0.95]"
                  >
                    LIBERAR
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {groups.map((group) => (
        <div key={group.unit} className="space-y-1.5">
          <div className="flex items-center gap-3 px-1">
            <div className="h-[2px] flex-1 bg-slate-100" />
            <div className="flex items-center gap-2 bg-slate-900 text-white px-3 py-1 rounded-full shadow-md shadow-slate-100">
              <Home className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[10px] font-black uppercase tracking-widest">UNIDADE {group.unit}</span>
              {unitActivityThisWeek && (unitActivityThisWeek.get(group.unit) || 0) >= 3 && (
                <span 
                  className="bg-blue-500/20 text-blue-400 p-0.5 rounded-full"
                  title="Casa com liberações frequentes nesta semana"
                >
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="flex items-center justify-center"
                  >
                    👍
                  </motion.div>
                </span>
              )}
            </div>
            <div className="h-[2px] flex-1 bg-slate-100" />
          </div>
          <div className="flex flex-col gap-1.5">
            {/* 1. AGUARDANDO LIBERAÇÃO (PRÉ-AUTORIZADOS) - HIGHLIGHTED & PULSING */}
            {group.waiting.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest px-1 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  Aguardando Liberação
                </h3>
                <div className="grid gap-2">
                  {group.waiting.map(p => (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      key={p.id}
                      onClick={() => onReleasePreAuth(p)}
                      className={cn(
                        "bg-white border rounded-xl p-2.5 transition-all flex flex-col sm:flex-row items-center justify-between gap-3 cursor-pointer hover:shadow-md active:scale-[0.99] group/card shadow-sm w-full max-w-full box-border overflow-hidden border-emerald-200 pulse-strong",
                      )}
                    >
                       <div className="flex items-center gap-3 min-w-0 flex-1 w-full">
                          <div className={cn(
                            "w-10 h-10 rounded-lg shrink-0 flex items-center justify-center transition-transform group-hover/card:scale-105 bg-emerald-600 text-white",
                          )}>
                            {p.type === 'visitor' ? <User className="w-5 h-5" /> :
                             p.type === 'delivery' ? <Bike className="w-5 h-5" /> :
                             <Wrench className="w-5 h-5" />}
                          </div>
                          <div className="min-w-0 flex-1 flex flex-col text-left">
                            <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{(p.type === 'delivery' || p.type === 'visitor') ? `CASA ${p.unit}` : ''}</span>
                            <h4 className="text-sm font-black text-slate-900 uppercase truncate leading-none">
                              {p.type === 'delivery' ? 'ENTREGADOR' : p.type === 'service' ? 'PRESTADOR' : 'VISITANTE'}
                              {p.name && p.name !== 'Pendente' && ` - ${p.name}`}
                            </h4>
                            <span className={cn(
                              "text-[10px] font-black uppercase tracking-widest mt-1 leading-none text-red-500",
                            )}>
                              {p.origin === 'porter_entry' ? 'AGUARDANDO LIBERAÇÃO' : 'AUTORIZADO'}
                            </span>
                          </div>
                       </div>
                       <div className="flex items-center gap-2 w-full pt-2">
                         <button
                           onClick={(e) => {
                             e.stopPropagation();
                             onCancelPreAuth?.(p);
                             toast.error('Ação cancelada');
                           }}
                           className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-[0.95] border border-red-500 shadow-md shadow-red-200/50"
                         >
                           CANCELAR
                         </button>
                         <button 
                           onClick={(e) => {
                             e.stopPropagation();
                             onReleasePreAuth(p);
                           }}
                           className="flex-[2] px-6 py-2.5 rounded-xl text-white font-black text-[10px] uppercase tracking-widest shadow-lg whitespace-nowrap border transition-all bg-emerald-600 border-emerald-400 shadow-emerald-200/50 hover:bg-emerald-700 active:scale-[0.95]"
                         >
                           LIBERAR
                         </button>
                       </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              {/* ENTRADAS LADO A LADO: VISITANTES FREQUENTES E RESPOSTAS RÁPIDAS */}
              <div className="grid grid-cols-12 gap-4 items-stretch w-full">
                {/* 2. VISITANTES FREQUENTES (≈ 65% -> col-span-8) */}
                <div className="col-span-8 bg-white border border-slate-100 rounded-[1.5rem] p-3 shadow-sm flex flex-col group/section transition-all hover:shadow-md h-full">
                  <h3 className="text-[9px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2 mb-1.5">
                    <Zap className="w-3.5 h-3.5 fill-blue-500" />
                    Visitantes Frequentes
                  </h3>
                  
                  <div className="flex-1 flex flex-col justify-start">
                    {group.frequents.length > 0 ? (
                      <div className="space-y-1">
                        {group.frequents.map(v => (
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={v.id}
                            className="bg-slate-50/50 border border-slate-100 rounded-xl py-1 px-2 flex items-center justify-between gap-3 transition-all hover:bg-white hover:shadow-md hover:border-emerald-500/30 group/item"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={cn(
                                "w-7 h-7 rounded-md shrink-0 flex items-center justify-center shadow-inner",
                                v.type === 'visitor' ? "bg-emerald-50 text-emerald-600" :
                                v.type === 'delivery' ? "bg-orange-50 text-orange-600" :
                                "bg-blue-50 text-blue-600"
                              )}>
                                {v.type === 'visitor' ? <User className="w-4 h-4" /> : 
                                 v.type === 'delivery' ? <Bike className="w-4 h-4" /> : 
                                 <Wrench className="w-4 h-4" />}
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-extrabold text-slate-900 truncate uppercase text-[10.5px] leading-tight flex items-center gap-1">
                                  <span>{v.name}</span>
                                  {v.relationship && v.relationship.trim() && (
                                    <span className={cn("text-[9px] uppercase font-black tracking-tight normal-case", getRelationshipColorClass(v.relationship))}>
                                      ({v.relationship.trim().toUpperCase()})
                                    </span>
                                  )}
                                </h4>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className={cn(
                                    "text-[7px] font-black uppercase px-1 py-0.5 rounded-md tracking-tighter border",
                                    v.rule === 'SEMPRE_LIBERADO' 
                                      ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                                      : "bg-amber-50 text-amber-600 border-amber-100"
                                  )}>
                                    {v.rule === 'SEMPRE_LIBERADO' ? 'SEMPRE LIBERADO' : 'AVISAR ANTES'}
                                  </span>
                                  {v.plate && <span className="text-[7.5px] font-mono font-bold text-slate-400 bg-white/50 px-1 py-0.5 rounded border border-slate-100">{v.plate}</span>}
                                </div>
                              </div>
                            </div>
                            
                            <button
                              onClick={() => onReleaseDirect(v)}
                              className="flex items-center justify-center gap-1 px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all active:scale-95 shadow-sm shadow-emerald-100"
                            >
                              <Check className="w-2.5 h-2.5" />
                              LIBERAR
                            </button>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl opacity-60 flex items-center justify-center gap-2 h-full">
                        <Zap className="w-4 h-4 text-slate-200" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Nenhum frequente</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* COLUNA DIREITA: REGRAS DA UNIDADE */}
                <div className="col-span-4 flex flex-col h-full">
                  <div className="bg-white border border-slate-100 rounded-[1.5rem] p-4 shadow-sm flex flex-col group/section transition-all hover:shadow-md h-full">
                    <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-3">
                      <Bell className="w-3.5 h-3.5" />
                      Regras da Unidade
                    </h3>
                    
                    <div className={cn(
                      "flex-1 flex flex-col justify-center rounded-xl",
                      (!group.rules || (!group.rules.requireVisitorConfirmation && !group.rules.requireDeliveryConfirmation && !group.rules.fixedObservation)) 
                        ? "items-center border border-dashed border-slate-100 bg-slate-50/30 p-4"
                        : "bg-slate-50/50 border border-slate-100 p-3"
                    )}>
                      {(group.rules && (group.rules.requireVisitorConfirmation || group.rules.requireDeliveryConfirmation || group.rules.fixedObservation)) ? (
                        <div className="space-y-2 w-full">
                          <div className="grid grid-cols-2 gap-2">
                            {group.rules.requireVisitorConfirmation && (
                              <div className="flex items-center gap-2 text-[8px] font-black text-blue-600 bg-white px-2 py-2 rounded-lg uppercase border border-blue-100/50 shadow-sm">
                                <Shield className="w-3 h-3 text-blue-400" />
                                Avisar Visitantes
                              </div>
                            )}
                            {group.rules.requireDeliveryConfirmation && (
                              <div className="flex items-center gap-2 text-[8px] font-black text-orange-600 bg-white px-2 py-2 rounded-lg uppercase border border-orange-100/50 shadow-sm">
                                <Bike className="w-3 h-3 text-orange-400" />
                                Avisar Entregas
                              </div>
                            )}
                          </div>
                          {group.rules.fixedObservation && (
                            <div className="flex items-start gap-2 text-[10px] font-bold text-slate-600 bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" />
                              <span className="italic leading-tight">"{group.rules.fixedObservation}"</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center flex items-center gap-2">
                          <Bell className="w-4 h-4 text-slate-200" />
                          <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest bg-slate-100/50 px-2 py-1 rounded-full">Sem restrições</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 5. REGISTROS RECENTES */}
            {group.recent.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                  <History className="w-3.5 h-3.5" />
                  Registros Recentes
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {group.recent.map(r => (
                    <div
                      key={r.id}
                      className="bg-slate-50/50 border border-slate-100 rounded-xl p-2 flex items-center gap-2 hover:bg-white transition-colors"
                    >
                      <div className={cn(
                        "p-1.5 rounded-lg shrink-0 bg-white border border-slate-100",
                        r.type === 'visitor' ? "text-emerald-500" :
                        r.type === 'delivery' ? "text-orange-500" :
                        "text-blue-500"
                      )}>
                        {r.type === 'visitor' ? <User className="w-3.5 h-3.5" /> : 
                         r.type === 'delivery' ? <Bike className="w-3.5 h-3.5" /> : 
                         <Wrench className="w-3.5 h-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-extrabold text-slate-700 text-[10px] truncate uppercase leading-tight block">{r.name}</span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase">{format(new Date(r.timestamp), 'HH:mm')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}


    </div>
  );
}
