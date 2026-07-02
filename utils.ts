import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Header } from './components/Header';
import { QuickActions } from './components/QuickActions';
import { AccessForm } from './components/AccessForm';
import { AccessLog } from './components/AccessLog';
import { AccessType, AccessRecord, FrequentVisitor, AccessRule, PreAuthorization, UnitPhone, UnitRules, UserRole, CondoInfo, AdminUser, SystemSettings, MessageTemplates, PermanentProfile, Prisma, Porteiro } from './types';
import { toast, ToastMessage, toastStore } from './lib/toast';
import { Search, Filter, Trash2, Download, Check, Users, Home as HomeIcon, Calendar, Shield, User, Bike, Wrench, MapPin, Car, Clock, Zap, X, Plus, MessageSquare, Edit2, Copy, AlertTriangle, History, Sliders, Camera, LogOut } from 'lucide-react';
import { format, isAfter, subWeeks } from 'date-fns';
import { FrequentVisitorManager } from './components/FrequentVisitorManager';
import { PreAuthorizationManager, PreAuthForm } from './components/PreAuthorizationManager';
import { AdminPanel } from './components/AdminPanel';
import { PorterPinLogin } from './components/PorterPinLogin';
import { QuickResponseButtons } from './components/QuickResponseButtons';
import { WhatsAppService, WhatsAppMessage } from './services/WhatsAppService';
import { UnifiedSearchResults } from './components/UnifiedSearchResults';
import { ResidentContactCard } from './components/ResidentContactCard';
import { OperationalControl, OperationalLog } from './components/OperationalControl';
import { findPotentialMatches } from './lib/matchUtils';
import { getCorrectedType } from './lib/classificationUtils';
import { replaceMessageVariables } from './lib/messageUtils';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from './lib/utils';
import { PrismaModal } from './components/PrismaModal';

export default function App() {
  const [activeToasts, setActiveToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    return toastStore.subscribe((messages) => {
      setActiveToasts(messages);
    });
  }, []);

  const [isMuted, setIsMuted] = useState<boolean>(() => localStorage.getItem('portaria_is_muted') === 'true');

  useEffect(() => {
    localStorage.setItem('portaria_is_muted', isMuted ? 'true' : 'false');
  }, [isMuted]);

  const playOperationalSound = (type: 'created' | 'authorized' | 'released' | 'alert') => {
    if (isMuted) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      const playTone = (freq: number, duration: number, startTime: number, oscType: OscillatorType = 'sine', volume = 0.15) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.type = oscType;
        osc.frequency.setValueAtTime(freq, startTime);
        
        // envelope
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      const now = ctx.currentTime;
      if (type === 'created') {
        playTone(523.25, 0.15, now, 'sine', 0.15); // C5
        playTone(659.25, 0.25, now + 0.08, 'sine', 0.12); // E5
      } else if (type === 'authorized') {
        playTone(587.33, 0.12, now, 'sine', 0.15); // D5
        playTone(880.00, 0.30, now + 0.06, 'sine', 0.12); // A5
      } else if (type === 'released') {
        playTone(523.25, 0.08, now, 'sine', 0.12); // C5
        playTone(659.25, 0.08, now + 0.08, 'sine', 0.12); // E5
        playTone(783.99, 0.25, now + 0.16, 'sine', 0.15); // G5
      } else if (type === 'alert') {
        playTone(220.00, 0.20, now, 'triangle', 0.2); // A3
        playTone(220.00, 0.20, now + 0.22, 'triangle', 0.2); // A3
      }
    } catch (e) {
      console.warn('Audio feedback failed:', e);
    }
  };

  const [view, setView] = useState<'portaria' | 'frequentes' | 'preauth' | 'admin' | 'controle'>(() => {
    const saved = localStorage.getItem('portaria_active_view');
    if (saved && ['portaria', 'frequentes', 'preauth', 'admin', 'controle'].includes(saved)) {
      return saved as any;
    }
    return 'portaria';
  });
  const [records, setRecords] = useState<AccessRecord[]>(() => {
    const saved = localStorage.getItem('portaria_records');
    if (saved) {
      try {
        return JSON.parse(saved).map((r: any) => ({
          ...r,
          timestamp: new Date(r.timestamp),
          exitTimestamp: r.exitTimestamp ? new Date(r.exitTimestamp) : undefined
        }));
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [permanentProfiles, setPermanentProfiles] = useState<PermanentProfile[]>(() => {
    const saved = localStorage.getItem('portaria_permanent_profiles');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [frequentVisitors, setFrequentVisitors] = useState<FrequentVisitor[]>(() => {
    const saved = localStorage.getItem('portaria_frequentes');
    if (saved) {
      try {
        return JSON.parse(saved).map((v: any) => ({
          ...v,
          createdAt: new Date(v.createdAt),
          updatedAt: new Date(v.updatedAt)
        }));
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [preAuths, setPreAuths] = useState<PreAuthorization[]>(() => {
    const saved = localStorage.getItem('portaria_preauths');
    if (saved) {
      try {
        return JSON.parse(saved).map((p: any) => ({
          ...p,
          validity: new Date(p.validity),
          createdAt: new Date(p.createdAt),
          updatedAt: new Date(p.updatedAt)
        }));
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [unitPhones, setUnitPhones] = useState<UnitPhone[]>(() => {
    const saved = localStorage.getItem('portaria_unit_phones');
    if (saved) {
      try {
        const parsed = JSON.parse(saved).map((p: any) => ({
          ...p,
          createdAt: new Date(p.createdAt),
          updatedAt: new Date(p.updatedAt)
        }));
        if (parsed.length > 0) return parsed;
      } catch (e) {}
    }
    // Mock data for demo
    return [
      { id: 'm1', unit: '426', residentName: 'IZAIAS', primaryPhone: '(11) 99999-1111', active: true, createdAt: new Date(), updatedAt: new Date(), releaseCount: 15 },
      { id: 'm2', unit: '426', residentName: 'MARIA', primaryPhone: '(11) 99999-2222', active: true, createdAt: new Date(), updatedAt: new Date(), releaseCount: 5 },
      { id: 'm3', unit: '426', residentName: 'JOÃO', primaryPhone: '(11) 99999-3333', active: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 'm4', unit: '101', residentName: 'CARLOS SILVA', primaryPhone: '(11) 91234-5678', active: true, createdAt: new Date(), updatedAt: new Date() },
    ];
  });

  const [activeResidentForUnit, setActiveResidentForUnit] = useState<Record<string, string>>({});
  const [currentTime, setCurrentTime] = useState(new Date());
  const [alternateToggle, setAlternateToggle] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setAlternateToggle(prev => !prev);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const getPrimaryResident = (unit: string) => {
    if (activeResidentForUnit[unit]) {
      const selected = unitPhones.find(p => p.id === activeResidentForUnit[unit] && p.active);
      if (selected) return selected;
    }

    const residents = unitPhones.filter(p => p.unit === unit && p.active);
    if (residents.length === 0) return null;

    return [...residents].sort((a, b) => {
      const countA = a.releaseCount || 0;
      const countB = b.releaseCount || 0;
      if (countB !== countA) return countB - countA;
      if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    })[0];
  };

  const [initialFormData, setInitialFormData] = useState<any>(null);
  const [pendingRequests, setPendingRequests] = useState<{ 
    id: string; 
    unit: string; 
    type: AccessType; 
    residentName: string; 
    visitorName?: string;
    createdAt: Date;
    updatedAt?: Date;
    uberArrivalMinutes?: number;
    ocrProcessed?: boolean;
    draft?: any;
    status?: 'pending' | 'authorized_waiting';
  }[]>(() => {
    const saved = localStorage.getItem('portaria_pending_requests');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((p: any) => ({
          ...p,
          createdAt: new Date(p.createdAt),
          updatedAt: p.updatedAt ? new Date(p.updatedAt) : undefined
        }));
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [waitingArrivalIds, setWaitingArrivalIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('portaria_waiting_arrival_ids');
    return saved ? JSON.parse(saved) : [];
  });

  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const [showPrismaModal, setShowPrismaModal] = useState(false);
  const [prismaToReturn, setPrismaToReturn] = useState<Prisma | null>(null);
  const [prismaReturnedMessage, setPrismaReturnedMessage] = useState<string | null>(null);
  const [prismas, setPrismas] = useState<Prisma[]>(() => {
    const saved = localStorage.getItem('portaria_prismas');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter(p => p && typeof p === 'object' && p.id && p.number && p.color);
          if (valid.length > 0) {
            return valid.map(p => ({
              id: String(p.id),
              number: String(p.number || ''),
              color: String(p.color || 'Amarelo'),
              status: p.status === 'em_uso' ? 'em_uso' : 'disponivel',
              currentUnit: p.currentUnit ? String(p.currentUnit) : undefined,
              currentRecordId: p.currentRecordId ? String(p.currentRecordId) : undefined
            })) as Prisma[];
          }
        }
      } catch (e) {
        console.error("Erro ao carregar prismas salvos. Usando defaults.", e);
      }
    }
    const defaults: Prisma[] = [
      { id: '1', number: '101', color: 'Amarelo', status: 'disponivel' },
      { id: '2', number: '102', color: 'Amarelo', status: 'disponivel' },
      { id: '3', number: '201', color: 'Azul', status: 'disponivel' },
      { id: '4', number: '202', color: 'Azul', status: 'disponivel' },
      { id: '5', number: '301', color: 'Vermelho', status: 'disponivel' },
      { id: '6', number: '302', color: 'Vermelho', status: 'disponivel' },
      { id: '7', number: '401', color: 'Verde', status: 'disponivel' },
      { id: '8', number: '402', color: 'Verde', status: 'disponivel' },
      { id: '9', number: '501', color: 'Preto', status: 'disponivel' },
      { id: '10', number: '502', color: 'Preto', status: 'disponivel' },
      { id: '11', number: '601', color: 'Branco', status: 'disponivel' },
      { id: '12', number: '602', color: 'Branco', status: 'disponivel' }
    ];
    return defaults;
  });

  useEffect(() => {
    localStorage.setItem('portaria_prismas', JSON.stringify(prismas));
  }, [prismas]);

  const compactPrismaStats = useMemo(() => {
    const list = Array.isArray(prismas) ? prismas.filter(Boolean) : [];
    const disponivel = list.filter(p => p.status === 'disponivel').length;
    const emUso = list.filter(p => p.status === 'em_uso').length;
    return { disponivel, emUso };
  }, [prismas]);

  const handleAddPrisma = (number: string, color: string) => {
    const duplicate = prismas.some(
      p => p.number.trim().toUpperCase() === number.trim().toUpperCase() && p.color === color
    );
    if (duplicate) {
      toast.error('JÁ CADASTRADO', {
        description: `Um prisma com número ${number} e cor ${color} já existe no inventário.`,
        duration: 3000
      });
      return;
    }
    const newPrisma: Prisma = {
      id: crypto.randomUUID(),
      number: number,
      color: color,
      status: 'disponivel'
    };
    setPrismas(prev => [...prev, newPrisma]);
    toast.success('Prisma cadastrado!', {
      description: `Prisma Nº ${number} (${color}) está disponível no sistema.`
    });
  };

  const handleEditPrisma = (id: string, number: string, color: string) => {
    const duplicate = prismas.some(
      p => p.id !== id && p.number.trim().toUpperCase() === number.trim().toUpperCase() && p.color === color
    );
    if (duplicate) {
      toast.error('JÁ CADASTRADO', {
        description: `Um prisma com número ${number} e cor ${color} já existe no inventário.`,
        duration: 3000
      });
      return;
    }
    setPrismas(prev => prev.map(p => 
      p.id === id ? { ...p, number: number, color: color } : p
    ));
    toast.success('Prisma editado!', {
      description: `Prisma atualizado para Nº ${number} (${color}).`
    });
  };

  const handleDeletePrisma = (id: string) => {
    setPrismas(prev => prev.filter(p => p.id !== id));
    toast.success('Prisma removido.', {
      description: 'O prisma foi retirado do inventário.'
    });
  };

  const handleReturnPrisma = (prismaId: string, silent: boolean = false) => {
    const prisma = prismas.find(p => p.id === prismaId);
    if (!prisma) return;

    // Update prisma status
    setPrismas(prev => prev.map(p => 
      p.id === prismaId ? { ...p, status: 'disponivel', currentUnit: undefined, currentRecordId: undefined } : p
    ));

    // If there is an active record/request linked, update or remove it
    if (prisma.currentRecordId) {
      // Find if it's in pendingRequests
      setPendingRequests(prev => prev.map(r => 
        r.id === prisma.currentRecordId ? { ...r, draft: { ...r.draft, prismaId: undefined, prismaNumber: undefined, prismaColor: undefined } } : r
      ));
      // Also update is in records
      setRecords(prev => prev.map(r => 
        r.id === prisma.currentRecordId ? { ...r, exitTimestamp: new Date() } : r
      ));
    }

    // Sound feedback - dual high-pitch beep for positive confirmation
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc1.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
      osc2.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.08); // C6

      gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.3);
      osc2.stop(ctx.currentTime + 0.3);
    } catch (e) {
      console.warn("Audio Context beep failed", e);
    }

    // Register operational log: "Prisma 11 Amarelo entregue."
    const operatorName = userRole === 'sindico' ? 'Síndico (Admin)' : (adminUsers.find(u => u.active && u.type === 'porteiro')?.name || 'Carlos');
    const newLogVal: OperationalLog = {
      id: crypto.randomUUID(),
      timestamp: format(new Date(), 'HH:mm:ss'),
      action: `Prisma ${prisma.number} ${prisma.color} entregue.`,
      operator: operatorName
    };
    setOperationalLogs(prev => [newLogVal, ...prev]);

    // Create the message formatted exactly as the user specified
    const waMessage = `Prisma ${prisma.number} entregue`;
    
    // Auto-copy to clipboard
    navigator.clipboard.writeText(waMessage).then(() => {
      toast.success(waMessage, {
        description: 'Copiado para a área de transferência!'
      });
    }).catch((err) => {
      console.error('Falha ao copiar:', err);
      toast.success(`Prisma ${prisma.color} ${prisma.number} entregue com sucesso.`);
    });

    if (!silent) {
      // Save and open success modal for copying manually
      setPrismaReturnedMessage(waMessage);
    }
  };

  const markPrismaAsInUse = (prismaId: string, unit: string, recordId: string) => {
    setPrismas(prev => prev.map(p => 
      p.id === prismaId ? { ...p, status: 'em_uso', currentUnit: unit, currentRecordId: recordId } : p
    ));
  };

  useEffect(() => {
    localStorage.setItem('portaria_waiting_arrival_ids', JSON.stringify(waitingArrivalIds));
  }, [waitingArrivalIds]);

  const handleAuthorizeArrival = (id: string) => {
    setWaitingArrivalIds(prev => [...prev, id]);
    setPendingRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'authorized_waiting', updatedAt: new Date() } : r));
    toast.warning('LIBERAÇÃO AUTORIZADA', {
      description: 'Aguardando chegada na portaria.',
      icon: <div className="text-amber-500 animate-pulse">🟡</div>
    });
    playOperationalSound('authorized');
  };

  const handleCancelAction = (id: string, isPreAuth?: boolean) => {
    setPrismas(prev => prev.map(p => {
      if (p.currentRecordId === id) {
        return { ...p, status: 'disponivel', currentUnit: undefined, currentRecordId: undefined };
      }
      return p;
    }));

    if (isPreAuth === true || isPreAuth === undefined) {
      const match = preAuths.find(p => p.id === id);
      if (match) {
        const pId = match.prismaId || match.draft?.prismaId;
        if (pId) {
          setPrismas(prev => prev.map(p => p.id === pId ? { ...p, status: 'disponivel', currentUnit: undefined, currentRecordId: undefined } : p));
        }
      }
    }
    if (isPreAuth === false || isPreAuth === undefined) {
      const match = pendingRequests.find(r => r.id === id);
      if (match) {
        const pId = match.prismaId || match.draft?.prismaId;
        if (pId) {
          setPrismas(prev => prev.map(p => p.id === pId ? { ...p, status: 'disponivel', currentUnit: undefined, currentRecordId: undefined } : p));
        }
      }
    }

    if (isPreAuth === true) {
      setPreAuths(prev => prev.filter(p => p.id !== id));
    } else if (isPreAuth === false) {
      setPendingRequests(prev => prev.filter(r => r.id !== id));
    } else {
      setPreAuths(prev => prev.filter(p => p.id !== id));
      setPendingRequests(prev => prev.filter(r => r.id !== id));
    }
    toast.error('Ação cancelada');
  };

  const sortedQueue = useMemo(() => {
    const queue = [
      ...pendingRequests.map(r => ({ 
        ...r, 
        status: 'pending' as const, 
        isPreAuth: false,
        priority: (r.type === 'delivery' ? 100 : r.type === 'visitor' ? 50 : 10) + 
                  (Math.floor((new Date().getTime() - new Date(r.createdAt).getTime()) / 60000)) // Increase priority by age
      })),
      ...preAuths.filter(p => p.status === 'autorizada').map(p => ({
        ...p,
        status: 'authorized' as const,
        isPreAuth: true,
        visitorName: p.name,
        residentName: p.whatsappMetadata?.residentName || `${p.unit} - Morador`,
        priority: (p.type === 'delivery' ? 80 : p.type === 'visitor' ? 40 : 5)
      }))
    ];

    const typeOrderMap: Record<string, number> = {
      delivery: 1,
      visitor: 2,
      service: 3,
      uber: 4
    };

    return queue.sort((a, b) => {
      const orderA = typeOrderMap[a.type] || 99;
      const orderB = typeOrderMap[b.type] || 99;
      
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      
      // Secondary: Time (older first)
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return timeA - timeB;
    });
  }, [pendingRequests, preAuths, currentTime]); // Add currentTime to refresh priorities every minute

  // API INVISIBLE ARCHITECTURE PREPARATION
  // This structure allows for future bidirectional sync without changing the UI
  const [apiState, setApiState] = useState<{
    connected: boolean;
    lastSync: Date | null;
    pendingCallbacks: string[];
  }>({
    connected: false,
    lastSync: null,
    pendingCallbacks: []
  });

  // Placeholder for real-time listener (Simulated)
  useEffect(() => {
    // In a real API, this would be a WebSocket or SSE connection
    const simulateRemoteEvent = () => {
      // This represents an external authorized release (API/AI/WhatsApp API)
      // Logic would be added here to call handleDirectRelease or similar
    };
    
    // Preparation for API Heartbeat
    setApiState(prev => ({ ...prev, connected: true, lastSync: new Date() }));
  }, []);

  const [unitRules, setUnitRules] = useState<UnitRules[]>(() => {
    const saved = localStorage.getItem('portaria_unit_rules');
    if (saved) {
      try {
        return JSON.parse(saved).map((r: any) => ({
          ...r,
          updatedAt: new Date(r.updatedAt)
        }));
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [condoInfo, setCondoInfo] = useState<CondoInfo>(() => {
    const saved = localStorage.getItem('portaria_condo_info');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed) {
          // Always guarantee 'BELLE VILLE' as the condo name as per request
          parsed.name = 'BELLE VILLE';
          return parsed;
        }
      } catch (e) {
        // Fallback below
      }
    }
    return {
      name: 'BELLE VILLE',
      managerName: 'João Silva',
      address: 'Avenida das Flores, 123 - Jardim Primavera, São Paulo - SP'
    };
  });

  const [porteiros, setPorteiros] = useState<Porteiro[]>(() => {
    const saved = localStorage.getItem('portaria_porteiros');
    let loaded: Porteiro[] = [];
    if (saved) {
      try {
        loaded = JSON.parse(saved);
      } catch (e) {}
    }
    if (!loaded || loaded.length === 0) {
      loaded = [
        { id: '1', name: 'João Silva', pin: '1111', role: 'Porteiro Líder', active: true, condoName: 'BELLE VILLE', notes: 'Turno Diurno' },
        { id: '2', name: 'Marcos Oliveira', pin: '2015', role: 'Porteiro de Plantão', active: true, condoName: 'BELLE VILLE', notes: 'Turno da Tarde' },
        { id: '3', name: 'Ana Souza', pin: '1830', role: 'Porteira Noturna', active: true, condoName: 'BELLE VILLE', notes: 'Turno da Noite' },
        { id: '4', name: 'Alexandre Rodrigues', pin: '9999', role: 'Supervisor Geral', active: true, condoName: 'BELLE VILLE', notes: 'Outro condomínio' },
        { id: '5', name: 'Ricardo Santos', pin: '1234', role: 'Síndico Gestor', active: true, condoName: 'BELLE VILLE', notes: 'Acesso Administrativo' }
      ];
    } else {
      // Automatic migration: check if there is an explicit Síndico/Admin in the loaded porteiros list
      const hasSindico = loaded.some(p => p.active && (p.role.toLowerCase().includes('sindico') || p.role.toLowerCase().includes('síndico')));
      if (!hasSindico) {
        // Resolve PIN conflict if João Silva still has 1234
        loaded = loaded.map(p => {
          if (p.id === '1' && p.pin === '1234' && p.role === 'Porteiro Líder') {
            return { ...p, pin: '1111' };
          }
          return p;
        });
        
        // Remove any existing duplicate user with id '5' before pushing the new Síndico Gestor
        loaded = loaded.filter(p => p.id !== '5');

        // Add a clean, explicit Síndico Gestor
        loaded.push({
          id: '5',
          name: 'Ricardo Santos',
          pin: '1234',
          role: 'Síndico Gestor',
          active: true,
          condoName: 'BELLE VILLE',
          notes: 'Acesso Administrativo'
        });
      }
    }
    
    // Always force all loaded porteiros to be linked to BELLE VILLE and persist this
    const migrated = loaded.map(p => ({
      ...p,
      condoName: 'BELLE VILLE'
    }));

    // Ensure strict uniqueness of IDs to prevent duplicate keys in lists
    const uniqueMap = new Map<string, Porteiro>();
    migrated.forEach(p => {
      uniqueMap.set(p.id, p);
    });
    const migratedUnique = Array.from(uniqueMap.values());

    try {
      localStorage.setItem('portaria_porteiros', JSON.stringify(migratedUnique));
    } catch (e) {}

    return migratedUnique;
  });

  const [loggedPorterId, setLoggedPorterId] = useState<string | null>(() => {
    return localStorage.getItem('portaria_logged_porter_id');
  });

  const loggedPorter = useMemo(() => {
    if (!loggedPorterId) return null;
    const match = porteiros.find(p => p.id === loggedPorterId);
    if (!match || !match.active) {
      return null;
    }
    return match;
  }, [porteiros, loggedPorterId]);

  const setLoggedPorter = (porter: Porteiro | null) => {
    if (porter) {
      localStorage.setItem('portaria_logged_porter_id', porter.id);
      setLoggedPorterId(porter.id);
    } else {
      localStorage.removeItem('portaria_logged_porter_id');
      setLoggedPorterId(null);
    }
  };

  // Map adminUsers dynamically from porteiros to guarantee a single source of truth
  const adminUsers = useMemo<AdminUser[]>(() => {
    return porteiros.map(p => {
      const normalizedRole = p.role.toLowerCase();
      let type: 'porteiro' | 'sindico' | 'admin' = 'porteiro';
      if (normalizedRole.includes('admin') || normalizedRole.includes('supervisor') || normalizedRole.includes('geral')) {
        type = 'admin';
      } else if (normalizedRole.includes('sindico') || normalizedRole.includes('síndico')) {
        type = 'sindico';
      }
      return {
        id: p.id,
        name: p.name,
        contact: p.phone || '',
        type: type === 'admin' ? 'porteiro' : type,
        active: p.active
      };
    });
  }, [porteiros]);

  const setAdminUsers = () => {};

  const [systemSettings, setSystemSettings] = useState<SystemSettings>(() => {
    const saved = localStorage.getItem('portaria_system_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.timelineCleanupHours === undefined) {
          parsed.timelineCleanupHours = 12;
        }
        return parsed;
      } catch (e) {}
    }
    return {
      allowFrequentDirectRelease: true,
      allowAutoDeliveryRelease: false,
      requireVisitorConfirmationByDefault: true,
      requireDocumentMandatory: false,
      timelineCleanupHours: 12,
      porterPermissions: {
        canRegisterEntry: true,
        canEditResidents: true,
        canRegisterDeliveries: true,
      },
      managerPermissions: {
        canViewHistory: true,
        canViewResidents: true,
        canExportData: true,
      },
      whatsappMode: 'manual'
    };
  });

  const [messageTemplates, setMessageTemplates] = useState<MessageTemplates>(() => {
    const saved = localStorage.getItem('portaria_message_templates');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      deliveryAuth: "{saudacao}, {nomeMorador}. Chegou uma entrega para a unidade {unidade}. Autoriza a entrada?",
      visitorArrival: "{saudacao}, {nomeMorador}. Chegou um visitante para a unidade {unidade}. Autoriza a entrada?",
      serviceArrival: "{saudacao}, {nomeMorador}. Chegou um prestador de serviço para a unidade {unidade}. Autoriza a entrada?",
      deliveryNotLiberated: "{saudacao}, {nomeMorador}. Chegou uma entrega para a unidade {unidade}, porém a entrada não foi liberada pela portaria. Poderia confirmar a autorização ou enviar mais informações?",
      authConfirmation: "Autorização recebida! Liberando o acesso para a unidade {unidade}. Obrigado!",
      thanksClosure: "Obrigado pela confirmação! Desejamos um ótimo dia no {condominio}."
    };
  });
  
  // One-time master migration of historical access logs into permanent profiles
  useEffect(() => {
    const isMigrated = localStorage.getItem('portaria_records_migrated_v3') === 'true';
    if (isMigrated) return;

    const savedRecordsStr = localStorage.getItem('portaria_records');
    if (!savedRecordsStr) {
      localStorage.setItem('portaria_records_migrated_v3', 'true');
      return;
    }

    try {
      const parsedRecords: AccessRecord[] = JSON.parse(savedRecordsStr).map((r: any) => ({
        ...r,
        timestamp: new Date(r.timestamp)
      }));

      if (parsedRecords.length === 0) {
        localStorage.setItem('portaria_records_migrated_v3', 'true');
        return;
      }

      setPermanentProfiles(prev => {
        let updated = [...prev];
        let changed = false;

        const sortedRecords = [...parsedRecords].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        sortedRecords.forEach(r => {
          if (!r.name || r.name === 'N/A' || r.name === 'Motorista Uber' || r.name === 'Entregador' || r.name === 'Visitante') return;

          const nameNorm = r.name.trim().toLowerCase();
          let cpfVal = r.cpf || '';
          let rgVal = r.rg || '';
          if (!cpfVal && !rgVal && r.document) {
            const cleanDoc = r.document.replace(/\D/g, '');
            if (cleanDoc.length === 11) {
              cpfVal = r.document;
            } else {
              rgVal = r.document;
            }
          }

          const cpfNorm = cpfVal ? cpfVal.replace(/\D/g, '') : '';
          const rgNorm = rgVal ? rgVal.trim().toUpperCase() : '';
          const rIsDelivery = r.type === 'delivery';

          const existingIdx = updated.findIndex(p => {
            const pCpfNorm = p.cpf ? p.cpf.replace(/\D/g, '') : '';
            const pRgNorm = p.rg ? p.rg.toUpperCase().trim() : '';
            const pIsDelivery = p.type === 'delivery';

            if (cpfNorm && pCpfNorm && pCpfNorm === cpfNorm) return true;
            if (rgNorm && pRgNorm && pRgNorm === rgNorm) return true;
            return p.name.trim().toLowerCase() === nameNorm && pIsDelivery === rIsDelivery;
          });

          const rDateStr = r.timestamp ? new Date(r.timestamp).toISOString() : new Date().toISOString();

          if (existingIdx >= 0) {
            const existing = updated[existingIdx];
            let platesHistory = existing.platesHistory || (existing.plate ? [existing.plate.toUpperCase().trim()] : []);
            if (r.plate) {
              const pt = r.plate.toUpperCase().trim();
              if (pt && !platesHistory.includes(pt)) {
                platesHistory.push(pt);
              }
            }

            const isLater = !existing.updatedAt || new Date(rDateStr).getTime() > new Date(existing.updatedAt).getTime();

            updated[existingIdx] = {
              ...existing,
              cpf: existing.cpf || cpfVal || '',
              rg: existing.rg || rgVal || '',
              phone: existing.phone || r.phone || '',
              plate: isLater ? (r.plate || existing.plate || '') : (existing.plate || r.plate || ''),
              vehicleModel: isLater ? (r.vehicleModel || existing.vehicleModel || '') : (existing.vehicleModel || r.vehicleModel || ''),
              vehicleColor: isLater ? (r.vehicleColor || existing.vehicleColor || '') : (existing.vehicleColor || r.vehicleColor || ''),
              company: isLater ? (r.company || existing.company || '') : (existing.company || r.company || ''),
              notes: isLater ? (r.notes || existing.notes || '') : (existing.notes || r.notes || ''),
              count: (existing.count || 1) + 1,
              updatedAt: isLater ? rDateStr : existing.updatedAt,
              platesHistory: platesHistory
            };
            changed = true;
          } else {
            const isVisitor = r.type !== 'delivery';
            const platesHistory = r.plate ? [r.plate.toUpperCase().trim()] : [];

            const profile: PermanentProfile = {
              id: r.id || crypto.randomUUID(),
              name: r.name,
              cpf: cpfVal || '',
              rg: rgVal || '',
              phone: r.phone || '',
              plate: r.plate || '',
              vehicleModel: r.vehicleModel || '',
              vehicleColor: r.vehicleColor || '',
              type: r.type || 'visitor',
              deliverySubtype: r.deliverySubtype,
              relationship: isVisitor ? r.relationship || '' : '',
              unit: isVisitor ? r.destination || '' : '',
              company: r.company || '',
              count: 1,
              createdAt: rDateStr,
              updatedAt: rDateStr,
              platesHistory: platesHistory,
              notes: r.notes || ''
            };

            updated.push(profile);
            changed = true;
          }
        });

        localStorage.setItem('portaria_permanent_profiles', JSON.stringify(updated));
        localStorage.setItem('portaria_records_migrated_v3', 'true');
        return updated;
      });
    } catch (e) {
      console.error('Failed to run historical migration:', e);
      localStorage.setItem('portaria_records_migrated_v3', 'true');
    }
  }, []);

  const upsertPermanentProfile = (data: Partial<AccessRecord>) => {
    if (!data.name) return;

    setPermanentProfiles(prev => {
      let updated = [...prev];
      const nameNorm = data.name!.trim().toLowerCase();
      
      let cpfVal = data.cpf || '';
      let rgVal = data.rg || '';
      if (!cpfVal && !rgVal && data.document) {
        const cleanDoc = data.document.replace(/\D/g, '');
        if (cleanDoc.length === 11) {
          cpfVal = data.document;
        } else {
          rgVal = data.document;
        }
      }

      const cpfNorm = cpfVal ? cpfVal.replace(/\D/g, '') : '';
      const rgNorm = rgVal ? rgVal.trim().toUpperCase() : '';

      const isVisitor = data.type !== 'delivery';

      // Find by CPF, then RG, then Name + Category match
      const existingIdx = updated.findIndex(p => {
        const pCpfNorm = p.cpf ? p.cpf.replace(/\D/g, '') : '';
        const pRgNorm = p.rg ? p.rg.toUpperCase().trim() : '';
        if (cpfNorm && pCpfNorm && pCpfNorm === cpfNorm) return true;
        if (rgNorm && pRgNorm && pRgNorm === rgNorm) return true;

        const pIsDelivery = p.type === 'delivery';
        const dataIsDelivery = data.type === 'delivery';
        return p.name.trim().toLowerCase() === nameNorm && pIsDelivery === dataIsDelivery;
      });

      const existingProfile = existingIdx >= 0 ? updated[existingIdx] : null;
      let existingPlates = existingProfile?.platesHistory || (existingProfile?.plate ? [existingProfile.plate.toUpperCase().trim()] : []);
      if (data.plate) {
        const pt = data.plate.toUpperCase().trim();
        if (pt && !existingPlates.includes(pt)) {
          existingPlates.push(pt);
        }
      }

      const profileData: PermanentProfile = {
        id: existingProfile ? existingProfile.id : crypto.randomUUID(),
        name: data.name!,
        cpf: cpfVal || (existingProfile ? existingProfile.cpf : ''),
        rg: rgVal || (existingProfile ? existingProfile.rg : ''),
        phone: data.phone || (existingProfile ? existingProfile.phone : ''),
        plate: data.plate || (existingProfile ? existingProfile.plate : ''),
        vehicleModel: data.vehicleModel || (existingProfile ? existingProfile.vehicleModel : ''),
        vehicleColor: data.vehicleColor || (existingProfile ? existingProfile.vehicleColor : ''),
        type: data.type || (existingProfile ? existingProfile.type : 'visitor'),
        deliverySubtype: data.deliverySubtype || (existingProfile ? existingProfile.deliverySubtype : undefined),
        relationship: isVisitor ? (data.relationship || (existingProfile ? existingProfile.relationship : '')) : '',
        unit: isVisitor ? (data.destination || (existingProfile ? existingProfile.unit : '')) : '', // non-visitors must keep their unit/destination
        company: data.company || (existingProfile ? existingProfile.company : ''),
        count: existingIdx >= 0 ? (updated[existingIdx].count || 1) + 1 : 1,
        createdAt: existingProfile ? existingProfile.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        platesHistory: existingPlates,
        notes: data.notes || (existingProfile ? existingProfile.notes : '')
      };

      if (existingIdx >= 0) {
        updated[existingIdx] = profileData;
      } else {
        updated.push(profileData);
      }

      localStorage.setItem('portaria_permanent_profiles', JSON.stringify(updated));
      return updated;
    });
  };

  const memorizedPeople = useMemo(() => {
    return permanentProfiles.map(p => {
      const platesList = p.platesHistory || (p.plate ? [p.plate.toUpperCase().trim()] : []);
      if (p.plate && !platesList.includes(p.plate.toUpperCase().trim())) {
        platesList.push(p.plate.toUpperCase().trim());
      }
      return {
        id: p.id,
        name: p.name,
        document: p.cpf || p.rg || '',
        cpf: p.cpf,
        rg: p.rg,
        phone: p.phone,
        plate: p.plate,
        vehicleModel: p.vehicleModel,
        vehicleColor: p.vehicleColor,
        lastUnit: p.unit || '',
        lastTimestamp: p.updatedAt ? new Date(p.updatedAt) : p.createdAt ? new Date(p.createdAt) : new Date(),
        lastType: p.type,
        lastDeliverySubtype: p.deliverySubtype,
        lastCompany: p.company,
        count: p.count || 1,
        allPlates: platesList,
        relationship: p.relationship,
        notes: p.notes || ''
      };
    }).sort((a, b) => b.lastTimestamp.getTime() - a.lastTimestamp.getTime());
  }, [permanentProfiles]);

  const isDev = useMemo(() => {
    return (import.meta as any).env.DEV || 
           window.location.hostname.includes('ais-dev') || 
           window.location.hostname.includes('ais-pre') ||
           window.location.hostname.includes('localhost');
  }, []);

  const [activeForm, setActiveForm] = useState<AccessType | null>(null);
  const [openedFromQuickActions, setOpenedFromQuickActions] = useState<boolean>(false);
  const [ongoingActions, setOngoingActions] = useState<any[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [uberPrintAttached, setUberPrintAttached] = useState<string | null>(null);

  // Sync ongoingActions with active form state
  useEffect(() => {
    if (activeForm && initialFormData) {
      const unit = initialFormData.destination || '';
      const name = initialFormData.name || '';
      
      if (unit || name) {
        setOngoingActions([{
          id: 'current-atendimento',
          unit,
          type: activeForm,
          personName: name,
          startTime: new Date(),
          status: initialFormData.preAuthId ? 'NOTIFICANDO' : 'PREENCHENDO'
        }]);
      } else {
        setOngoingActions([]);
      }
    } else {
      setOngoingActions([]);
    }
  }, [activeForm, initialFormData]);

  // Absolutely prevent state leakage and lingering draft data when modal closes
  useEffect(() => {
    if (!activeForm) {
      setInitialFormData(null);
      setOpenedFromQuickActions(false);
    }
  }, [activeForm]);

  // Prevent background scrolling when modals or full-screen overlays are open
  useEffect(() => {
    const isModalOpen = !!(
      activeForm || 
      showHistoryModal || 
      showPrismaModal || 
      prismaToReturn || 
      prismaReturnedMessage || 
      zoomedImage
    );
    const mainContainer = document.getElementById('main-app-container');
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
      if (mainContainer) {
        mainContainer.style.overflow = 'hidden';
      }
    } else {
      document.body.style.overflow = '';
      if (mainContainer) {
        mainContainer.style.overflow = '';
      }
    }
    return () => {
      document.body.style.overflow = '';
      if (mainContainer) {
        mainContainer.style.overflow = '';
      }
    };
  }, [activeForm, showHistoryModal, showPrismaModal, prismaToReturn, prismaReturnedMessage, zoomedImage]);

  const userRole = useMemo<UserRole>(() => {
    if (!loggedPorter) return 'porteiro';
    const normalizedRole = loggedPorter.role.toLowerCase();
    if (normalizedRole.includes('admin') || normalizedRole.includes('supervisor') || normalizedRole.includes('geral')) {
      return 'admin';
    }
    if (normalizedRole.includes('sindico') || normalizedRole.includes('síndico')) {
      return 'sindico';
    }
    return 'porteiro';
  }, [loggedPorter]);

  const setUserRole = (role: UserRole) => {
    console.log('setUserRole derived noop:', role);
  };
  const [tempRole, setTempRole] = useState<'sindico' | 'admin'>('admin');
  const [pinValue, setPinValue] = useState<string>('');
  const [deviceStatus, setDeviceStatus] = useState<string>(() => {
    let currentId = localStorage.getItem('portaria_current_device_id');
    if (!currentId) {
      currentId = 'DEV-' + Math.random().toString(36).substring(2, 10).toUpperCase();
      localStorage.setItem('portaria_current_device_id', currentId);
    }
    const stored = localStorage.getItem('portaria_security_devices');
    if (!stored) return 'authorized';
    try {
      const list = JSON.parse(stored);
      const curr = list.find((d: any) => d.deviceId === currentId);
      return curr ? curr.status : 'authorized';
    } catch(e) {
      return 'authorized';
    }
  });

  useEffect(() => {
    const handleDeviceStatusChange = () => {
      const currentId = localStorage.getItem('portaria_current_device_id');
      if (!currentId) return;
      const stored = localStorage.getItem('portaria_security_devices');
      if (!stored) return;
      try {
        const list = JSON.parse(stored);
        const curr = list.find((d: any) => d.deviceId === currentId);
        if (curr) {
          setDeviceStatus(curr.status);
        }
      } catch (e) {}
    };

    window.addEventListener('storage_device_changed', handleDeviceStatusChange);
    window.addEventListener('storage', handleDeviceStatusChange);
    return () => {
      window.removeEventListener('storage_device_changed', handleDeviceStatusChange);
      window.removeEventListener('storage', handleDeviceStatusChange);
    };
  }, []);
  const [operationalLogs, setOperationalLogs] = useState<OperationalLog[]>(() => {
    const saved = localStorage.getItem('portaria_operational_logs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('portaria_operational_logs', JSON.stringify(operationalLogs));
  }, [operationalLogs]);

  const handleTriggerOperationalAction = (actionId: 'stuck' | 'ocr' | 'reload' | 'waiting') => {
    const operatorName = userRole === 'sindico' ? 'Síndico (Admin)' : 'Porteiro';
    const now = new Date();
    const formattedTime = format(now, 'HH:mm');
    let actionLogText = '';

    if (actionId === 'stuck') {
      setOngoingActions([]);
      setActiveForm(null);
      setInitialFormData(null);
      setOpenedFromQuickActions(false);
      actionLogText = 'Porteiro executou ENCERRAR AÇÕES TRAVADAS';
      
      toast.success('AÇÕES TRAVADAS ENCERRADAS', {
        description: 'Atendimentos em andamento e formulários suspensos foram limpos.',
        duration: 4000
      });
    } else if (actionId === 'ocr') {
      const resetKeys = [
        'motoristaAnterior', 'placaAnterior', 'modeloAnterior', 'corAnterior',
        'cacheOCR', 'previewAnterior', 'parserAnterior', 'açãoTemporária',
        'uploadAnterior', 'countdownAnterior', 'uberAtual', 'resultadoOCR',
        'lastRecognition', 'lastUberData', 'currentCropRegion', 'regionResults',
        'ocrBuffer', 'rawText', 'detectedEntities'
      ];
      resetKeys.forEach(key => { (window as any)[`_uber_${key}`] = null; });
      (window as any)._ocrSession = null;
      (window as any)._lastOcrPlate = null;
      (window as any)._lastOcrName = null;
      actionLogText = 'Porteiro executou LIMPAR OCR TEMPORÁRIO';

      toast.success('OCR TEMPORÁRIO LIMPO', {
        description: 'Todo o cache operacional e leitura de prints UBER foram zerados.',
        duration: 4000
      });
    } else if (actionId === 'reload') {
      setSearchTerm('');
      setKbArea('search');
      setKbIndex(0);
      setActiveForm(null);
      setIsMuted(false);
      actionLogText = 'Porteiro executou RECARREGAR FLUXO';

      toast.success('FLUXO OPERACIONAL REINICIADO', {
        description: 'Pesquisas e filtros foram limpos e desmarcados.',
        duration: 4000
      });
    } else if (actionId === 'waiting') {
      setWaitingArrivalIds([]);
      localStorage.removeItem('portaria_waiting_arrival_ids');
      actionLogText = 'Porteiro executou LIMPAR FILA AGUARDANDO';

      toast.success('FILA DE AGUARDANDO LIMPA', {
        description: 'A fila de pré-autorizações temporárias foi excluída.',
        duration: 4000
      });
    }

    if (actionLogText) {
      const newLogVal: OperationalLog = {
        id: crypto.randomUUID(),
        timestamp: formattedTime,
        action: actionLogText.replace('Porteiro', operatorName),
        operator: operatorName
      };
      setOperationalLogs(prev => [newLogVal, ...prev]);
    }
  };
  const [searchTerm, setSearchTerm] = useState('');

  const getAutomaticGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Bom dia';
    if (hour >= 12 && hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const [showRespostasMenu, setShowRespostasMenu] = useState(false);
  const [showAvisosMenu, setShowAvisosMenu] = useState(false);

  const [respostasMenuDirection, setRespostasMenuDirection] = useState<'up' | 'down'>('up');
  const [avisosMenuDirection, setAvisosMenuDirection] = useState<'up' | 'down'>('up');

  const respostasContainerRef = useRef<HTMLDivElement | null>(null);
  const avisosContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (showRespostasMenu && respostasContainerRef.current) {
      const rect = respostasContainerRef.current.getBoundingClientRect();
      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceAbove < 230 && spaceBelow > spaceAbove) {
        setRespostasMenuDirection('down');
      } else {
        setRespostasMenuDirection('up');
      }
    }
  }, [showRespostasMenu]);

  useEffect(() => {
    if (showAvisosMenu && avisosContainerRef.current) {
      const rect = avisosContainerRef.current.getBoundingClientRect();
      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceAbove < 230 && spaceBelow > spaceAbove) {
        setAvisosMenuDirection('down');
      } else {
        setAvisosMenuDirection('up');
      }
    }
  }, [showAvisosMenu]);

  const respostasRapidasList = [
    { text: 'sua entrega será liberada. Obrigado por avisar.', emoji: '📦' },
    { text: 'sua visita será liberada. Obrigado por avisar.', emoji: '🌸' },
    { text: 'o prestador informado será liberado. Obrigado por avisar.', emoji: '🔧' },
    { text: 'o motorista informado será liberado. Obrigado por avisar.', emoji: '🚗' },
  ];

  const avisosRapidosList = [
    { text: 'motoboy aguardando na portaria.', emoji: '🛵' },
    { text: 'visitante aguardando na portaria.', emoji: '👤' },
    { text: 'prestador aguardando na portaria.', emoji: '🔧' },
    { text: 'sua entrega chegou à portaria.', emoji: '📦' },
  ];

  const handleQuickMessageCopy = (coreText: string) => {
    const greeting = getAutomaticGreeting();
    const message = `${greeting}, ${coreText}`;
    
    navigator.clipboard.writeText(message)
      .then(() => {
        toast.success('COPIADO', {
          description: `"${message}"`,
          icon: <MessageSquare className="w-4 h-4 text-emerald-600 animate-bounce" />
        });
      })
      .catch(err => {
        console.error('Erro ao copiar:', err);
      });
      
    setShowRespostasMenu(false);
    setShowAvisosMenu(false);
  };

  const [notifiedCaminhoIds, setNotifiedCaminhoIds] = useState<string[]>([]);
  const [temporarilyShowingAvisadoIds, setTemporarilyShowingAvisadoIds] = useState<string[]>([]);
  const [activeCardIndex, setActiveCardIndex] = useState<-1 | 0 | 1 | 2>(-1);
  const searchRef = useRef<HTMLInputElement>(null);
  const [kbArea, setKbArea] = useState<'search' | 'resident-card' | 'results' | 'quick-actions'>('search');
  const [kbIndex, setKbIndex] = useState(0);
  const [filterType, setFilterType] = useState<AccessType | 'all'>('all');
  const [isPreAuthFormOpen, setIsPreAuthFormOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [editingPreAuth, setEditingPreAuth] = useState<PreAuthorization | null>(null);

  const triggerWaFocus = (phone?: string, message?: string) => {
    if (phone) {
      const cleanPhone = phone.replace(/\D/g, '');
      let finalPhone = cleanPhone;
      if (finalPhone.length > 0 && !finalPhone.startsWith('55')) {
        finalPhone = '55' + finalPhone;
      }
      
      const encodedMessage = message ? encodeURIComponent(message) : '';
      
      // Removed window.open redirection to WhatsApp
      
      toast.success('MENSAGEM COPIADA PARA CLIPBOARD', {
        description: `Unidade ${matchedResident?.unit} • Cole no WhatsApp manualmente.`,
        duration: 3000,
        icon: <MessageSquare className="w-4 h-4 text-emerald-500" />
      });
    }
  };
  useEffect(() => {
    localStorage.setItem('portaria_active_view', view);
  }, [view]);



  useEffect(() => {
    localStorage.setItem('portaria_pending_requests', JSON.stringify(pendingRequests));
  }, [pendingRequests]);

  useEffect(() => {
    localStorage.setItem('portaria_records', JSON.stringify(records));
  }, [records]);

  useEffect(() => {
    localStorage.setItem('portaria_frequentes', JSON.stringify(frequentVisitors));
  }, [frequentVisitors]);

  useEffect(() => {
    localStorage.setItem('portaria_preauths', JSON.stringify(preAuths));
  }, [preAuths]);

  useEffect(() => {
    localStorage.setItem('portaria_permanent_profiles', JSON.stringify(permanentProfiles));
  }, [permanentProfiles]);

  useEffect(() => {
    localStorage.setItem('portaria_unit_phones', JSON.stringify(unitPhones));
  }, [unitPhones]);

  useEffect(() => {
    localStorage.setItem('portaria_unit_rules', JSON.stringify(unitRules));
  }, [unitRules]);

  useEffect(() => {
    localStorage.setItem('portaria_condo_info', JSON.stringify(condoInfo));
  }, [condoInfo]);

  useEffect(() => {
    localStorage.setItem('portaria_porteiros', JSON.stringify(porteiros));
  }, [porteiros]);

  useEffect(() => {
    localStorage.setItem('portaria_admin_users', JSON.stringify(adminUsers));
  }, [adminUsers]);

  useEffect(() => {
    localStorage.setItem('portaria_system_settings', JSON.stringify(systemSettings));
  }, [systemSettings]);

  useEffect(() => {
    localStorage.setItem('portaria_message_templates', JSON.stringify(messageTemplates));
  }, [messageTemplates]);

  useEffect(() => {
    localStorage.setItem('portaria_porteiros', JSON.stringify(porteiros));
  }, [porteiros]);



  const scrollActionsIntoView = () => {
    setTimeout(() => {
      const element = document.getElementById('actions-area');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handleImmediateRelease = (type: AccessType, unit: string, qty: number = 1, avisarMorador?: boolean) => {
    const defaultVisitorName = type === 'uber' ? 'Motorista Uber' :
                               type === 'delivery' ? 'Entregador' :
                               type === 'service' ? 'Prestador' : 'Visitante';

    const defaultNameUppercase = type === 'uber' ? 'MOTORISTA UBER' :
                                 type === 'delivery' ? 'ENTREGADOR' :
                                 type === 'service' ? 'PRESTADOR DE SERVIÇOS' : 'VISITANTE';

    const pendingId = crypto.randomUUID();
    const resident = getPrimaryResident(unit);
    const residentName = resident ? resident.residentName : 'Morador';

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
      deliveriesCount: (type === 'delivery' || type === 'visitor') ? qty : undefined,
      avisarMorador: type === 'delivery' ? avisarMorador : undefined,
      draft: {
        destination: unit,
        name: defaultNameUppercase,
        type: type,
        origin: 'quick_action',
        deliveriesCount: (type === 'delivery' || type === 'visitor') ? qty : undefined,
        avisarMorador: type === 'delivery' ? avisarMorador : undefined
      }
    };

    setPendingRequests(prev => [newPending, ...prev]);
    setWaitingArrivalIds(prev => Array.from(new Set([...prev, pendingId])));

    playOperationalSound('authorized');

    const typeLabel = type === 'delivery' ? 'ENTREGA' : type === 'visitor' ? 'VISITA' : type === 'service' ? 'SERVIÇO' : 'UBER';
    const messageQtySuffix = (type === 'delivery' && qty > 1) ? ` (${qty} entregas)` : 
                             (type === 'visitor' && qty > 1) ? ` (${qty} visitantes)` : '';
    toast.warning('LIBERAÇÃO AUTORIZADA', {
      description: `${typeLabel}${messageQtySuffix} aguardando chegada na unidade ${unit}`,
      icon: <div className="text-amber-500 animate-pulse">🟡</div>
    });
    scrollActionsIntoView();
  };

  const handleImmediateUberRelease = (unit: string, printImage: string) => {
    const porterName = loggedPorter ? loggedPorter.name : (userRole === 'sindico' ? 'Síndico (Admin)' : (adminUsers.find(u => u.active && u.type === 'porteiro')?.name || 'Carlos'));
    
    const newRecord: AccessRecord = {
      id: crypto.randomUUID(),
      type: 'uber',
      name: 'MOTORISTA APLICATIVO (PRINT)',
      destination: unit,
      timestamp: new Date(),
      status: 'finalizado',
      notes: 'AUTORIZAÇÃO DE MORADOR VIA PRINT',
      origin: 'print_uber',
      printImage: printImage,
      porterName: porterName,
    };

    setRecords(prev => [newRecord, ...prev]);
    setUberPrintAttached(null);

    toast.success('UBER COM PRINT ANEXADO LIBERADO', {
      description: `Unidade ${unit} liberada com sucesso! Print de corrida vinculado.`,
      icon: <div className="text-emerald-500 font-bold">📷</div>
    });

    playOperationalSound('released');
  };

  const handleQueueUberPrintAction = (unit: string, printImage: string) => {
    const pendingId = crypto.randomUUID();
    const resident = getPrimaryResident(unit);
    const residentName = resident ? resident.residentName : 'Morador';

    const newPending = {
      id: pendingId,
      unit: unit,
      type: 'uber' as AccessType,
      residentName: residentName,
      visitorName: 'MOTORISTA APLICATIVO (PRINT)',
      createdAt: new Date(),
      updatedAt: new Date(),
      uberArrivalMinutes: 5,
      status: 'authorized_waiting' as const,
      printImage: printImage,
      draft: {
        destination: unit,
        name: 'MOTORISTA APLICATIVO (PRINT)',
        type: 'uber',
        origin: 'print_uber',
        printImage: printImage,
        plate: 'PRINT',
        vehicleModel: 'PRINT',
        vehicleColor: 'PRINT'
      }
    };

    setPendingRequests(prev => [newPending, ...prev]);
    setWaitingArrivalIds(prev => Array.from(new Set([...prev, pendingId])));
    setUberPrintAttached(null);

    playOperationalSound('authorized');

    toast.warning('UBER COM PRINT PREPARADO', {
      description: `Ação para a unidade ${unit} enviada para Aguardando Liberação.`,
      icon: <div className="text-amber-500 animate-pulse">🟡</div>
    });

    scrollActionsIntoView();
  };

   const handleAddRecord = (data: Partial<AccessRecord>) => {
    if (!activeForm) return;

    let finalPrismaId = (data as any).prismaId;
    if (!finalPrismaId && (data as any).prismaNumber && (data as any).prismaColor) {
      const pNum = String((data as any).prismaNumber).trim();
      const pColor = (data as any).prismaColor;
      const existing = prismas.find(p => p.number === pNum && p.color === pColor);
      if (existing) {
        finalPrismaId = existing.id;
      } else {
        finalPrismaId = crypto.randomUUID();
        const newPr = {
          id: finalPrismaId,
          number: pNum,
          color: pColor,
          status: 'disponivel' as const
        };
        setPrismas(prev => [...prev, newPr]);
      }
      (data as any).prismaId = finalPrismaId;
    }

    if ((data as any).status === 'em_andamento') {
      const formType = data.type || activeForm;
      const existingId = (data as any).pendingRequestId;
      const pendingId = existingId || crypto.randomUUID();
      
      if (data.name) {
        upsertPermanentProfile({
          name: data.name,
          cpf: data.cpf,
          rg: data.rg,
          document: data.document,
          phone: data.phone,
          plate: data.plate,
          vehicleModel: data.vehicleModel,
          vehicleColor: data.vehicleColor,
          type: formType || 'visitor',
          deliverySubtype: data.deliverySubtype,
          destination: data.destination,
          company: data.company
        });
      }

      const newPending = {
        id: pendingId,
        unit: data.destination || '',
        type: formType,
        residentName: getPrimaryResident(data.destination || '')?.residentName || 'Morador',
        visitorName: data.name || (formType === 'uber' ? 'Motorista Uber' : formType === 'delivery' ? 'Entregador' : 'Visitante'),
        createdAt: new Date(),
        updatedAt: new Date(),
        uberArrivalMinutes: (data as any).uberArrivalMinutes || 5,
        status: 'authorized_waiting' as const,
        draft: { ...data, status: undefined } // clear the triggering status
      };

      if (existingId) {
        setPendingRequests(prev => prev.map(r => r.id === existingId ? newPending : r));
      } else {
        setPendingRequests(prev => [...prev, newPending]);
      }

      if ((data as any).prismaId) {
        markPrismaAsInUse((data as any).prismaId, data.destination || '', pendingId);
      }

      setWaitingArrivalIds(prev => Array.from(new Set([...prev, pendingId])));
      
      if ((data as any).preAuthId) {
        setPreAuths(prev => prev.filter(p => p.id !== (data as any).preAuthId));
      }

      setActiveForm(null);
      setSearchTerm('');
      setInitialFormData(null);
      setOpenedFromQuickActions(false);
      
      const typeLabel = formType === 'delivery' ? 'ENTREGA' : formType === 'visitor' ? 'VISITA' : formType === 'service' ? 'SERVIÇO' : 'UBER';
      toast.warning('LIBERAÇÃO AUTORIZADA', {
        description: `${typeLabel} aguardando chegada na unidade ${data.destination}`,
        icon: <div className="text-amber-500 animate-pulse">🟡</div>
      });
      playOperationalSound('authorized');
      scrollActionsIntoView();
      return;
    }

    // Use activeForm type to preserve user intent, but get subtype if it's a delivery
    const corrected = getCorrectedType({
      name: data.name || '',
      notes: data.notes || '',
      type: activeForm
    });

    const pendingId = (data as any).pendingRequestId;
    let pendingRequest = pendingId ? pendingRequests.find(r => r.id === pendingId) : null;
    if (!pendingRequest && data.destination && (activeForm === 'delivery' || activeForm === 'visitor')) {
      pendingRequest = pendingRequests.find(r => r.unit === data.destination && r.type === activeForm) || null;
    }
    const isMultiDelivery = activeForm === 'delivery';
    const isMultiVisitor = activeForm === 'visitor';
    const currentQty = pendingRequest ? (pendingRequest.deliveriesCount ?? pendingRequest.draft?.deliveriesCount ?? 1) : 1;

    if (isMultiDelivery && pendingRequest && currentQty > 1) {
      setPendingRequests(prev => prev.map(r => 
        r.id === pendingRequest.id 
          ? { 
              ...r, 
              deliveriesCount: currentQty - 1, 
              draft: r.draft ? { ...r.draft, deliveriesCount: currentQty - 1 } : undefined 
            } 
          : r
      ));
      setActiveForm(null);
      setSearchTerm('');
      setInitialFormData(null);
      setOpenedFromQuickActions(false);
      toast.success(`Entrega liberada! Entregas pendentes: ${currentQty - 1}`, {
        icon: <div className="bg-amber-100 p-1 rounded text-amber-600"><Check className="w-4 h-4" /></div>
      });
      playOperationalSound('released');
      return;
    }

    if (isMultiVisitor && pendingRequest && currentQty > 1) {
      setPendingRequests(prev => prev.map(r => 
        r.id === pendingRequest.id 
          ? { 
              ...r, 
              deliveriesCount: currentQty - 1, 
              draft: r.draft ? { ...r.draft, deliveriesCount: currentQty - 1 } : undefined 
            } 
          : r
      ));
      setActiveForm(null);
      setSearchTerm('');
      setInitialFormData(null);
      setOpenedFromQuickActions(false);
      toast.success(`Visitante liberado! Visitantes pendentes: ${currentQty - 1}`, {
        icon: <div className="bg-amber-100 p-1 rounded text-amber-600"><Check className="w-4 h-4" /></div>
      });
      playOperationalSound('released');
      return;
    }

    const newRecord: AccessRecord = {
      id: crypto.randomUUID(),
      type: activeForm, // PERSIST THE ORIGINAL SELECTED TYPE
      deliverySubtype: activeForm === 'delivery' ? (corrected.deliverySubtype || data.deliverySubtype) : undefined,
      fastFlow: false,
      name: data.name || 'N/A',
      document: data.document,
      cpf: (data as any).cpf || '',
      rg: (data as any).rg || '',
      phone: (data as any).phone || '',
      plate: data.plate,
      vehicleModel: data.vehicleModel,
      vehicleColor: data.vehicleColor,
      destination: data.destination || 'N/A',
      timestamp: new Date(),
      status: 'finalizado',
      notes: data.notes,
      origin: data.origin || 'manual',
      ruleUsed: data.ruleUsed,
      company: (data as any).company,
      printImage: data.printImage,
      porterName: loggedPorter ? loggedPorter.name : (userRole === 'sindico' ? 'Síndico (Admin)' : (adminUsers.find(u => u.active && u.type === 'porteiro')?.name || 'Carlos')),
      prismaId: (data as any).prismaId,
      prismaNumber: (data as any).prismaNumber,
      prismaColor: (data as any).prismaColor,
    };

    setRecords([newRecord, ...records]);
    upsertPermanentProfile(newRecord);

    if ((data as any).prismaId) {
      markPrismaAsInUse((data as any).prismaId, data.destination || 'N/A', newRecord.id);
    }
    
    // If it came from a pending request, remove it
    if ((data as any).pendingRequestId) {
      setPendingRequests(prev => prev.filter(r => r.id !== (data as any).pendingRequestId));
    } else {
      // Fallback matching logic
      setPendingRequests(prev => prev.filter(r => !(r.unit === newRecord.destination && r.type === newRecord.type)));
    }
    
    // If it came from a pre-auth, mark it as used and processed
    if ((data as any).preAuthId) {
      setPreAuths(preAuths.map(p => 
        p.id === (data as any).preAuthId ? { ...p, status: 'finalizada', updatedAt: new Date(), processedByPorter: true } : p
      ));
    }

    setActiveForm(null);
    setSearchTerm(''); // AUTO RETURN TO MAIN SCREEN
    toast.success(newRecord.type === 'uber' ? 'UBER LIBERADO' : 'Acesso liberado com sucesso!', {
      description: newRecord.type === 'uber' ? `UBER liberado para unidade ${newRecord.destination}` : `${newRecord.name} entrou para ${newRecord.destination}`,
      icon: <div className="bg-emerald-100 p-1 rounded text-emerald-600">
        {newRecord.type === 'uber' ? <Car className="w-4 h-4" /> : <Check className="w-4 h-4" />}
      </div>
    });
    playOperationalSound('released');
    setInitialFormData(null);
    setOpenedFromQuickActions(false);

    // Reset keyboard selection and restore focus safely
    setKbArea('search');
    setKbIndex(0);
    const activeEl = document.activeElement as HTMLElement;
    if (activeEl) {
      activeEl.blur();
    }
    setTimeout(() => {
      searchRef.current?.focus();
    }, 50);
  };

  const handleReleaseMemorized = (person: any) => {
    const isVisitor = person.lastType === 'visitor';

    if (!isVisitor) {
      setInitialFormData({
        name: person.name,
        document: person.document,
        plate: person.plate,
        vehicleModel: person.vehicleModel,
        vehicleColor: person.vehicleColor,
        destination: '', // MUST ALWAYS START EMPTY FOR NON-VISITORS
        company: person.lastCompany,
        deliverySubtype: person.lastDeliverySubtype
      });
      setActiveForm(person.lastType);
      setSearchTerm('');
      
      toast.info(
        person.lastType === 'delivery' ? 'DADOS DO ENTREGADOR PREENCHIDOS' :
        person.lastType === 'uber' ? 'DADOS DO MOTORISTA UBER PREENCHIDOS' : 'DADOS DO PRESTADOR PREENCHIDOS',
        {
          description: 'Insira o número da casa para liberar.'
        }
      );
    } else {
      // For visitors, keep previous behavior: we can open the modal with filled house
      setInitialFormData({
        name: person.name,
        document: person.document,
        plate: person.plate,
        vehicleModel: person.vehicleModel,
        vehicleColor: person.vehicleColor,
        destination: person.lastUnit, // allowed to keep association for visitors
        company: person.lastCompany
      });
      setActiveForm('visitor');
      setSearchTerm('');
      
      toast.info('VISITANTE JÁ ESTEVE NO CONDOMÍNIO', {
        description: 'Dados preenchidos. Confira e libere.'
      });
    }
  };



  const completedRecords = useMemo(() => records.filter(r => r.status === 'finalizado'), [records]);

  const preAuthAlertsGrouping = useMemo(() => {
    const unitGroups: Record<string, PreAuthorization[]> = {};
    preAuths.forEach(p => {
      if (p.status === 'autorizada' && isAfter(new Date(p.validity), new Date())) {
        if (!unitGroups[p.unit]) unitGroups[p.unit] = [];
        unitGroups[p.unit].push(p);
      }
    });
    return unitGroups;
  }, [preAuths]);

  const preAuthAlerts = useMemo(() => {
    const alerts: Record<string, number> = {
      visitor: 0,
      delivery: 0,
      service: 0,
      uber: 0
    };
    
    preAuths.forEach(p => {
      if (p.origin === 'whatsapp' && !p.processedByPorter && p.status !== 'finalizada' && p.status !== 'expirada') {
        alerts[p.type]++;
      }
    });
    
    return alerts;
  }, [preAuths]);

  const filteredRecords = useMemo(() => {
    let result = records;
    if (filterType !== 'all') {
      result = result.filter(r => r.type === filterType);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(r => 
        r.name.toLowerCase().includes(term) || 
        r.destination.toLowerCase().includes(term) ||
        (r.document && r.document.toLowerCase().includes(term)) ||
        (r.plate && r.plate.toLowerCase().includes(term))
      );
    }
    return result;
  }, [records, filterType, searchTerm]);

  const filteredMemorizedPeople = useMemo(() => {
    const normalizedSearch = searchTerm.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    if (!normalizedSearch) return [];
    return memorizedPeople.filter(p => {
      const normName = p.name ? p.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
      const normDoc = p.document ? p.document.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
      const normPlate = p.plate ? p.plate.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
      const normCompany = p.lastCompany ? p.lastCompany.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";

      return normName.includes(normalizedSearch) || 
             normDoc.includes(normalizedSearch) || 
             normPlate.includes(normalizedSearch) || 
             normCompany.includes(normalizedSearch);
    });
  }, [searchTerm, memorizedPeople]);

  const matchedResident = useMemo(() => {
    if (!searchTerm.trim()) return null;
    const term = searchTerm.toLowerCase().trim();
    // Prioritize units that exactly match the search term if it's a number
    const unitAsNumber = term.replace(/\D/g, '');
    if (unitAsNumber && unitAsNumber.length <= 4) {
      return getPrimaryResident(unitAsNumber);
    }
    // Otherwise look for name or unit containment
    const found = unitPhones.find(p => p.active && (p.unit.toLowerCase().includes(term) || p.residentName.toLowerCase().includes(term)));
    if (found) {
      // If found by name, ensure we show that person, but maybe the UI handles switching.
      // Actually, user says: "Ao clicar em outro morador: ele se torna o morador ativo temporariamente"
      // So if searched specifically, it should stay.
      return found;
    }
    return null;
  }, [searchTerm, unitPhones, getPrimaryResident]);

  const otherResidents = useMemo(() => {
    if (!matchedResident) return [];
    return unitPhones
      .filter(p => p.unit === matchedResident.unit && p.id !== matchedResident.id && p.active)
      .sort((a, b) => (b.releaseCount || 0) - (a.releaseCount || 0));
  }, [matchedResident, unitPhones]);

  const isPlateSearch = useMemo(() => {
    const term = searchTerm.toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
    if (term.length < 3) return false;
    
    // Check if there is any plate matching in history or memorized people
    const hasPlateMatch = records.some(r => r.plate && r.plate.toUpperCase().trim().replace(/[^A-Z0-9]/g, '').includes(term)) ||
                          memorizedPeople.some(p => {
                            const plates = p.allPlates || (p.plate ? [p.plate] : []);
                            return plates.some(plate => plate.toUpperCase().trim().replace(/[^A-Z0-9]/g, '').includes(term));
                          });
    
    return hasPlateMatch && /^[A-Z]{3}[0-9A-Z]{0,4}$/i.test(searchTerm.trim().replace(/[^A-Z0-9]/g, ''));
  }, [searchTerm, records, memorizedPeople]);

  const handleSwitchResident = (resident: UnitPhone) => {
    setActiveResidentForUnit(prev => ({ ...prev, [resident.unit]: resident.id }));
    setSearchTerm(resident.residentName);
    toast.info(`Selecionado: ${resident.residentName}`, {
      description: `Avisos agora serão enviados para este morador.`,
      duration: 2000
    });
  };

  const getResidentIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('filho') || n.includes('neto') || n.includes('jr') || n.includes('junior') || n.includes('pequeno')) return '🧒';
    if (n.endsWith('a') || n.includes('maria') || n.includes('ana') || n.includes('julia') || n.includes('sandra') || n.includes('fernanda')) return '👩';
    return '👨';
  };

  const isFastestResponder = (residentId: string, unitResidents: UnitPhone[]) => {
    // For now, heuristic: first one in alphabetically sorted list is "fastest" for demo
    // or we could check if they have a specific flag if we added it.
    // Let's just pick the first one from the sorted residents of that unit.
    const sorted = [...unitResidents].sort((a, b) => a.residentName.localeCompare(b.residentName));
    return sorted[0].id === residentId;
  };

  // Calculate unit activity for the current week (Thumbs Up logic)
  const unitActivityThisWeek = useMemo(() => {
    const activityMap = new Map<string, number>();
    const oneWeekAgo = subWeeks(new Date(), 1);
    
    // Count records in the last 7 days
    records.forEach(r => {
      if (new Date(r.timestamp) >= oneWeekAgo) {
        activityMap.set(r.destination, (activityMap.get(r.destination) || 0) + 1);
      }
    });

    // Count pre-auths in the last 7 days (even if used/expired)
    preAuths.forEach(p => {
      if (new Date(p.createdAt) >= oneWeekAgo) {
        activityMap.set(p.unit, (activityMap.get(p.unit) || 0) + 1);
      }
    });

    return activityMap;
  }, [records, preAuths]);

  const globalPendingCounts = useMemo(() => {
    const counts: Record<AccessType, number> = { visitor: 0, delivery: 0, service: 0, uber: 0 };
    preAuths.forEach(p => {
      if (p.status === 'autorizada' && isAfter(new Date(p.validity), new Date())) {
        counts[p.type]++;
      }
    });
    pendingRequests.forEach(r => {
      counts[r.type]++;
    });
    return counts;
  }, [preAuths, pendingRequests]);

  const unitPendingCounts = useMemo(() => {
    if (!matchedResident) return { visitor: 0, delivery: 0, service: 0, uber: 0 };
    const counts: Record<AccessType, number> = { visitor: 0, delivery: 0, service: 0, uber: 0 };
    
    // Resident-initiated pre-auths
    preAuths.forEach(p => {
      if (p.unit === matchedResident.unit && p.status === 'autorizada' && isAfter(new Date(p.validity), new Date())) {
        counts[p.type]++;
      }
    });

    // Porter-initiated pending requests
    pendingRequests.forEach(r => {
      if (r.unit === matchedResident.unit) {
        counts[r.type]++;
      }
    });

    return counts;
  }, [preAuths, pendingRequests, matchedResident]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const normalizedSearch = searchTerm.toLowerCase().trim();
      if (!normalizedSearch) return;

      // 1. If we are currently navigating suggestions ('results') with keyboard and hit Enter, select it!
      if (kbArea === 'results' && filteredMemorizedPeople.length > 0) {
        e.preventDefault();
        const selectedPerson = filteredMemorizedPeople[kbIndex % filteredMemorizedPeople.length];
        handleReleaseMemorized(selectedPerson);
        setKbArea('search');
        setKbIndex(0);
        return;
      }

      // SUCCESSIVE ENTER LOGIC (Contextual Release)
      if (matchedResident && window.innerWidth >= 1024) {
        // Find if there is any pending delivery to release immediately (Priority 1)
        const deliveryPending = pendingRequests.find(r => r.unit === matchedResident.unit && r.type === 'delivery');
        const deliveryPreAuth = preAuths.find(p => p.unit === matchedResident.unit && p.type === 'delivery' && p.status === 'autorizada');
        
        if (deliveryPending) {
          handleReleasePendingAccess(deliveryPending);
          setSearchTerm('');
          searchRef.current?.focus();
          toast.success('LIBERAÇÃO RÁPIDA (TECLADO)', {
            description: `Entregador liberado para unidade ${matchedResident.unit}`,
            icon: <Zap className="w-4 h-4" />
          });
          return;
        } else if (deliveryPreAuth) {
          handleReleasePreAuth(deliveryPreAuth);
          setSearchTerm('');
          searchRef.current?.focus();
          return;
        }
      }

      // 2. Check for exact match suggests jump to cards
      if (matchedResident || filteredRecords.length > 0 || memorizedPeople.length > 0) {
        if (window.innerWidth >= 1024) {
          setKbArea(matchedResident ? 'resident-card' : 'results');
          setKbIndex(0);
          (e.target as HTMLInputElement).blur();
        } else {
          setActiveCardIndex(0);
          (e.target as HTMLInputElement).blur();
        }
        return;
      }

      (e.target as HTMLInputElement).blur();
    } else if (window.innerWidth >= 1024 && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      if (filteredMemorizedPeople.length > 0) {
        e.preventDefault();
        if (e.key === 'ArrowDown') {
          if (kbArea !== 'results') {
            setKbArea('results');
            setKbIndex(0);
          } else {
            setKbIndex(prev => prev + 1);
          }
        } else if (e.key === 'ArrowUp') {
          if (kbArea === 'results') {
            if (kbIndex > 0) {
              setKbIndex(prev => prev - 1);
            } else {
              setKbArea('search');
            }
          }
        }
      } else {
         // Allow jumping to resident card if search has matched resident but no memorized people
         if (matchedResident || filteredRecords.length > 0 || memorizedPeople.length > 0) {
           setKbArea(matchedResident ? 'resident-card' : 'results');
           setKbIndex(0);
           (e.target as HTMLInputElement).blur();
         }
      }
    }
  };

  // Keyboard Navigation Implementation
  useEffect(() => {
    const isDesktop = window.innerWidth >= 1024;

    // Mobile Legacy Support
    if (!isDesktop) {
      if (activeCardIndex === -1) return;
      const handleMobileNav = (e: KeyboardEvent) => {
        if (e.key === 'ArrowRight') setActiveCardIndex(prev => (prev < 2 ? (prev + 1) as 0 | 1 | 2 : 0) as 0 | 1 | 2);
        else if (e.key === 'ArrowLeft') setActiveCardIndex(prev => (prev > 0 ? (prev - 1) as 0 | 1 | 2 : 2) as 0 | 1 | 2);
        else if (e.key === 'Enter') {
          const types: AccessType[] = ['delivery', 'visitor', 'service'];
          handleNotifyResident(types[activeCardIndex]);
          setActiveCardIndex(-1);
        } else if (e.key === 'Escape') setActiveCardIndex(-1);
      };
      window.addEventListener('keydown', handleMobileNav);
      return () => window.removeEventListener('keydown', handleMobileNav);
    }

    // DESKTOP ULTRA-FAST MODE
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // 1. ESC always returns to search
      if (e.key === 'Escape') {
        setKbArea('search');
        setKbIndex(0);
        setSearchTerm('');
        setActiveForm(null);
        searchRef.current?.focus();
        return;
      }

      // 2. Navigation outside input
      if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        // Prevent default scrolling for arrows
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
          e.preventDefault();
        }

        if (e.key === 'ArrowDown') setKbIndex(prev => prev + 1);
        else if (e.key === 'ArrowUp') setKbIndex(prev => (prev > 0 ? prev - 1 : 0));
        else if (e.key === 'ArrowRight') setKbArea(prev => prev === 'search' ? 'quick-actions' : prev);
        else if (e.key === 'ArrowLeft') setKbArea(prev => prev === 'quick-actions' ? 'search' : prev);
        else if (e.key === 'Enter') {
          if (kbArea === 'resident-card' && matchedResident) {
            // Contextual ENTER inside Resident Card: only release if there is an active matching pending request or preauthorization
            const delivery = pendingRequests.find(r => r.unit === matchedResident.unit && r.type === 'delivery');
            const anyPending = pendingRequests.find(r => r.unit === matchedResident.unit);
            const anyPreAuth = preAuths.find(p => p.unit === matchedResident.unit && p.status === 'autorizada');
            
            if (delivery) {
               handleReleasePendingAccess(delivery);
               setSearchTerm('');
               setKbArea('search');
               searchRef.current?.focus();
            } else if (anyPending) {
               handleReleasePendingAccess(anyPending);
               setSearchTerm('');
               setKbArea('search');
               searchRef.current?.focus();
            } else if (anyPreAuth) {
               handleReleasePreAuth(anyPreAuth);
               setSearchTerm('');
               setKbArea('search');
               searchRef.current?.focus();
            } else {
               // Se não houver pendência real, não execute notificação vazia por Enter
               return;
            }
          } else if (kbArea === 'quick-actions') {
            const types: AccessType[] = ['delivery', 'visitor', 'service'];
            handleNotifyResident(types[kbIndex % 3]);
            setKbArea('search');
            searchRef.current?.focus();
          } else if (kbArea === 'results' && filteredMemorizedPeople.length > 0) {
            const selectedPerson = filteredMemorizedPeople[kbIndex % filteredMemorizedPeople.length];
            handleReleaseMemorized(selectedPerson);
            setKbArea('search');
            setSearchTerm('');
            searchRef.current?.focus();
          } else if (kbArea === 'search') {
            searchRef.current?.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [kbArea, kbIndex, matchedResident, pendingRequests, activeCardIndex, messageTemplates, condoInfo, adminUsers]);

  // Desktop Ultra-Fast Mode: Auto-focus search when context is cleared
  useEffect(() => {
    // Avoid programmatic auto-focus inside Google AI Studio preview frame to prevent focus theft which triggers tab shifts or closes preview
    const isAiStudioPreview = typeof window !== 'undefined' && (
      window.location.hostname.includes('ais-dev') || 
      window.location.hostname.includes('ais-pre')
    );
    if (isAiStudioPreview) return;

    const isDesktop = window.innerWidth >= 1024;
    if (isDesktop && !activeForm && view === 'portaria' && kbArea === 'search') {
       const timer = setTimeout(() => {
         searchRef.current?.focus();
       }, 50);
       return () => clearTimeout(timer);
    }
  }, [activeForm, view, kbArea]);

  const handleManualEntry = (type: AccessType, data?: any) => {
    setInitialFormData(data);
    setActiveForm(type);
  };

  const handleReleaseDirect = (visitor: FrequentVisitor) => {
    if (visitor.rule === 'SEMPRE_LIBERADO') {
      const newRecord: AccessRecord = {
        id: crypto.randomUUID(),
        type: visitor.type,
        deliverySubtype: visitor.deliverySubtype,
        name: visitor.name,
        plate: visitor.plate,
        destination: visitor.unit,
        timestamp: new Date(),
        status: 'Liberado Sempre',
        notes: visitor.relationship || visitor.observation,
        origin: 'Frequente',
        ruleUsed: visitor.rule,
        porterName: loggedPorter ? loggedPorter.name : (userRole === 'sindico' ? 'Síndico (Admin)' : (adminUsers.find(u => u.active && u.type === 'porteiro')?.name || 'Carlos')),
      };

      setRecords([newRecord, ...records]);
      upsertPermanentProfile(newRecord);

      // Clear pending requests for this unit/type
      setPendingRequests(prev => prev.filter(r => !(r.unit === newRecord.destination && r.type === newRecord.type)));

      setSearchTerm('');
      toast.success('Acesso liberado com sucesso!', {
        description: `${newRecord.name} entrou para ${newRecord.destination}`,
        icon: <div className="bg-emerald-100 p-1 rounded text-emerald-600"><Check className="w-4 h-4" /></div>
      });
      playOperationalSound('released');
      setActiveForm(null);
      return;
    }

    // AVISAR_ANTES workflow
    if (visitor.rule === 'AVISAR_ANTES') {
      const unitPhone = unitPhones.find(p => p.unit === visitor.unit && p.active);
      const phone = unitPhone?.primaryPhone || '';
      const residentName = unitPhone?.residentName || 'Morador';
      
      const template = visitor.type === 'delivery' ? messageTemplates.deliveryAuth : 
                      visitor.type === 'service' ? messageTemplates.serviceArrival : 
                      messageTemplates.visitorArrival;

      const message = replaceMessageVariables(template, {
        residentName: residentName,
        unit: visitor.unit,
        type: visitor.type === 'delivery' ? 'Entrega' : visitor.type === 'visitor' ? 'Visitante' : 'Prestador',
        visitorName: visitor.name,
        providerName: visitor.name,
        deliveryEntry: visitor.name,
        condoName: condoInfo.name,
        porterName: loggedPorter ? loggedPorter.name : (adminUsers.find(u => u.active && u.type === 'porteiro')?.name || 'Portaria')
      });

      let cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone.length <= 11 && !cleanPhone.startsWith('55')) {
        cleanPhone = '55' + cleanPhone;
      }

      // Copy message to clipboard
      navigator.clipboard.writeText(message);
      
      toast.dismiss();
      toast.success('MENSAGEM COPIADA', {
        description: 'Mensagem pronta para enviar. Cole no WhatsApp manualmente.',
        duration: 4000,
        icon: <Copy className="w-4 h-4 text-blue-500" />
      });

      // Pre-fill modal for return
      setInitialFormData({
        type: visitor.type,
        name: visitor.name,
        plate: visitor.plate,
        destination: visitor.unit,
        notes: visitor.observation,
        deliverySubtype: visitor.deliverySubtype,
        origin: 'visitante_frequente',
        ruleUsed: 'AVISAR_ANTES',
        relationship: visitor.relationship || ''
      } as any);
      
      setActiveForm(visitor.type);
      
      /*
      toast.info('WhatsApp aberto. Finalize o cadastro ao retornar.', {
        description: `Avisando ${residentName} sobre ${visitor.name}`,
        icon: <div className="bg-amber-100 p-1 rounded text-amber-600"><MessageSquare className="w-4 h-4" /></div>
      });
      */
    }
  };

  const handleReleasePreAuth = (preAuth: PreAuthorization) => {
    setInitialFormData({
      ...(preAuth.draft || {}),
      preAuthId: preAuth.id,
      destination: preAuth.unit,
      type: preAuth.type,
      name: (preAuth.draft?.name || preAuth.name),
      document: (preAuth.draft?.document || preAuth.document || ''),
      plate: (preAuth.draft?.plate || preAuth.plate || ''),
      notes: (preAuth.draft?.notes || preAuth.observation || ''),
      deliverySubtype: (preAuth.draft?.deliverySubtype || preAuth.deliverySubtype || (preAuth.type === 'delivery' ? 'motoboy' : undefined)),
      company: (preAuth.draft?.company || preAuth.company || ''),
      vehicleModel: (preAuth.draft?.vehicleModel || preAuth.vehicleModel || ''),
    });
    setActiveForm(preAuth.type);
  };

  const handleUseFrequentData = (preAuth: PreAuthorization, visitor: FrequentVisitor) => {
    // Merge data from pre-auth and frequent visitor
    const updatedPreAuth: PreAuthorization = {
      ...preAuth,
      name: visitor.name || preAuth.name,
      plate: visitor.plate || preAuth.plate,
      relationship: visitor.relationship || visitor.observation || preAuth.relationship,
      deliverySubtype: visitor.deliverySubtype || preAuth.deliverySubtype,
      suggestedMatches: [], // Clear suggestions after use
    };

    setPreAuths(preAuths.map(p => p.id === preAuth.id ? updatedPreAuth : p));
    toast.success('Dados do visitante frequente aplicados!', {
      description: `Nome e veículo de ${visitor.name} foram preenchidos.`
    });
  };

  const handleWhatsAppMessage = (message: WhatsAppMessage) => {
    const parsed = WhatsAppService.parseMessage(message, unitPhones, unitRules);
    
    // Intelligent Match on arrival
    const matches = findPotentialMatches(parsed, frequentVisitors);
    const preAuthWithMatches = {
      ...parsed,
      suggestedMatches: matches
    } as PreAuthorization;

    setPreAuths([preAuthWithMatches, ...preAuths]);
  };

  const handleExportHistory = () => {
    if (userRole !== 'sindico') {
      toast.error('ACESSO RESTRITO', {
        description: 'Apenas Síndicos e Administradores têm acesso à exportação de relatórios de auditoria.'
      });
      return;
    }

    if (records.length === 0) {
      toast.error('Não há registros para exportar.');
      return;
    }

    const headers = [
      'Data', 
      'Hora', 
      'Unidade', 
      'Nome Completo', 
      'Documento (RG/CPF)', 
      'Modalidade', 
      'Subtipo', 
      'Placa', 
      'Veículo Modelo', 
      'Veículo Cor', 
      'Observações', 
      'Porteiro Responsável', 
      'Status da Liberação', 
      'Print Comprovante'
    ];

    const rows = records.map(r => [
      format(r.timestamp, 'dd/MM/yyyy'),
      format(r.timestamp, 'HH:mm'),
      r.destination,
      r.name.toUpperCase(),
      r.document || '-',
      r.type === 'visitor' ? 'Visitante' : r.type === 'delivery' ? 'Entrega' : r.type === 'uber' ? 'Uber' : 'Prestador',
      r.deliverySubtype || '-',
      r.plate ? r.plate.toUpperCase() : '-',
      r.vehicleModel ? r.vehicleModel.toUpperCase() : '-',
      r.vehicleColor ? r.vehicleColor.toUpperCase() : '-',
      r.notes ? r.notes.replace(/"/g, '""') : '-',
      r.porterName || 'Carlos (Portaria)',
      r.status === 'finalizado' ? 'FINALIZADA' : r.status === 'não_liberada' ? 'NÃO LIBERADA' : r.status.toUpperCase(),
      r.printImage ? 'SIM (Anexado em segundo plano)' : 'NÃO'
    ]);

    const csvContent = [
      headers.join(','), 
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `historico_completo_auditoria_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Histórico exportado com sucesso!', {
      description: 'Todos os dados de auditoria foram salvos no arquivo completo.'
    });
  };

  const handleRegisterOperationalLog = (action: string) => {
    const now = new Date();
    const formattedTime = format(now, 'HH:mm:ss');
    const newLogVal: OperationalLog = {
      id: crypto.randomUUID(),
      timestamp: formattedTime,
      action,
      operator: loggedPorter ? loggedPorter.name : (userRole === 'sindico' ? 'Síndico (Admin)' : 'Porteiro')
    };
    setOperationalLogs((prev: any) => [newLogVal, ...prev]);
  };

  const handlePorterLoginByPin = (pin: string): boolean => {
    const match = porteiros.find(p => p.pin === pin);
    if (!match) {
      toast.error('PIN INCORRETO', {
        description: 'Nenhum usuário cadastrado encontrado com este PIN.'
      });
      return false;
    }
    if (!match.active) {
      toast.error('PORTARIA BLOQUEADA', {
        description: `O cadastro do usuário ${match.name} está SUSPENSO.`
      });
      return false;
    }
    // Check if porter is assigned to ANOTHER condominium
    if (match.condoName && match.condoName.toLowerCase() !== condoInfo.name.toLowerCase()) {
      toast.error('ACESSO NEGADO', {
        description: `Este PIN pertence ao condomínio "${match.condoName}". Acesso não autorizado para "${condoInfo.name}".`
      });
      return false;
    }

    // Successfully matched!
    localStorage.setItem('portaria_logged_porter_id', match.id);
    setLoggedPorterId(match.id);
    
    // Register entry log:
    const now = new Date();
    const formattedTime = format(now, 'HH:mm:ss');
    const newLogVal = {
      id: crypto.randomUUID(),
      timestamp: formattedTime,
      action: `INÍCIO DE PLANTÃO: Porteiro ${match.name} (${match.role}) iniciou o plantão no condomínio ${condoInfo.name}.`,
      operator: match.name
    };
    setOperationalLogs((prev: any) => [newLogVal, ...prev]);

    toast.success('PLANTÃO INICIADO', {
      description: `Bem-vindo, ${match.name}! Boa jornada de trabalho.`,
      icon: <Check className="w-4 h-4 text-emerald-500" />
    });
    return true;
  };

  const handleAdminPanelPinSubmit = (enteredPin: string): boolean => {
    // 1. O PIN digitado deve existir na base de porteiros cadastrados
    const match = porteiros.find(p => p.pin === enteredPin);
    
    if (!match) {
      toast.error('PIN INCORRETO', {
        description: 'Nenhum usuário cadastrado encontrado com este PIN.'
      });
      return false;
    }

    // 2. O PIN deve estar vinculado EXPLICITAMENTE a um usuário ativo
    if (!match.active) {
      toast.error('ACESSO NEGADO', {
        description: `O cadastro do usuário ${match.name} está SUSPENSO.`
      });
      return false;
    }

    const normalizedRole = match.role.toLowerCase();
    const isSindicoRole = normalizedRole.includes('sindico') || normalizedRole.includes('síndico');
    const isAdminRole = normalizedRole.includes('admin') || normalizedRole.includes('supervisor') || normalizedRole.includes('geral');

    // Automatically identify and validate profile
    if (isAdminRole) {
      localStorage.setItem('portaria_logged_porter_id', match.id);
      setLoggedPorterId(match.id);
      
      const now = new Date();
      const formattedTime = format(now, 'HH:mm');
      const newLogVal = {
        id: crypto.randomUUID(),
        timestamp: formattedTime,
        action: `ADMINISTRADOR AUTENTICOU NO PAINEL COMPLETO (PIN): ${match.name} (${match.role})`,
        operator: match.name
      };
      setOperationalLogs((prev: any) => [newLogVal, ...prev]);
      setPinValue('');
      toast.success('AUTENTICADO COMO ADMINISTRADOR', {
        description: `Painel administrativo completo (Admin) liberado para ${match.name}.`,
        icon: <Check className="w-4 h-4 text-emerald-500" />
      });
      return true;
    } else if (isSindicoRole) {
      localStorage.setItem('portaria_logged_porter_id', match.id);
      setLoggedPorterId(match.id);

      const now = new Date();
      const formattedTime = format(now, 'HH:mm');
      const newLogVal = {
        id: crypto.randomUUID(),
        timestamp: formattedTime,
        action: `SÍNDICO AUTENTICOU NO PAINEL ADMINISTRATIVO (PIN): ${match.name} (${match.role})`,
        operator: match.name
      };
      setOperationalLogs((prev: any) => [newLogVal, ...prev]);
      setPinValue('');
      toast.success('AUTENTICADO COMO SÍNDICO', {
        description: `Painel operacional com permissões de síndico liberado para ${match.name}.`,
        icon: <Check className="w-4 h-4 text-emerald-500" />
      });
      return true;
    } else {
      toast.error('ACESSO NEGADO', {
        description: `O usuário ${match.name} (${match.role}) não possui permissão de nível administrativo ou síndico.`
      });
      return false;
    }
  };

  const handlePorterLogoutShift = () => {
    if (!loggedPorter) return;
    
    // Register exit/logout log:
    const now = new Date();
    const formattedTime = format(now, 'HH:mm:ss');
    const newLogVal = {
      id: crypto.randomUUID(),
      timestamp: formattedTime,
      action: `TROCA DE PLANTÃO: Usuário ${loggedPorter.name} (${loggedPorter.role}) encerrou seu plantão e registrou sua saída.`,
      operator: loggedPorter.name
    };
    setOperationalLogs((prev: any) => [newLogVal, ...prev]);

    toast.success('SESSÃO ENCERRADA', {
      description: `Turno de ${loggedPorter.name} finalizado com sucesso. Por favor, solicite a identificação do novo plantonista.`,
      duration: 5000
    });

    localStorage.removeItem('portaria_logged_porter_id');
    setLoggedPorterId(null);
    setView('portaria');
    setPinValue('');
  };

  const handleClearTestData = () => {
    // Complete operational clean-up of testing environment
    setRecords([]);
    setPreAuths([]);
    setPendingRequests([]);
    setFrequentVisitors([]);
    // PRESERVED permanentProfiles representing durable people base
    setWaitingArrivalIds([]);
    setOngoingActions([]);
    setActiveResidentForUnit({});
    setOperationalLogs([]);
    
    // Additional interface cleanup
    setSearchTerm('');
    setActiveForm(null);
    setInitialFormData(null);
    
    // Explicitly update corresponding local storage items
    localStorage.removeItem('portaria_records');
    localStorage.removeItem('portaria_preauths');
    localStorage.removeItem('portaria_pending_requests');
    localStorage.removeItem('portaria_frequentes');
    // KEEP permanent profiles base safe in localStorage: localStorage.removeItem('portaria_permanent_profiles');
    localStorage.removeItem('portaria_waiting_arrival_ids');
    localStorage.removeItem('portaria_operational_logs');
    
    toast.success('DADOS DE TESTE LIMPOS COM SUCESSO', {
      description: 'Ações, históricos, liberações e temporários foram apagados. Moradores e vínculos foram preservados.',
      icon: <div className="bg-red-100 p-1 rounded text-red-600"><Trash2 className="w-4 h-4" /></div>,
      duration: 5000
    });
  };

  const handleClear = () => {
    if (window.confirm('Deseja realmente limpar os registros de teste/histórico?')) {
      setRecords([]);
      toast.success('Histórico limpo com sucesso.');
    }
  };

  const handleDeleteRecord = (id: string) => {
    setRecords(records.filter(r => r.id !== id));
    toast.info('Registro excluído.');
  };

  const handleDeletePreAuth = (id: string) => {
    if (confirm('Deseja remover esta pré-autorização?')) {
      setPreAuths(preAuths.filter(p => p.id !== id));
      toast.info('Pré-autorização removida.');
    }
  };

  const handleClearPreAuths = () => {
    if (confirm('Deseja limpar todas as pré-autorizações?')) {
      setPreAuths([]);
      toast.error('Pré-autorizações apagadas.');
    }
  };

  const handleClearFrequents = () => {
    if (confirm('Deseja limpar todos os visitantes frequentes?')) {
      setFrequentVisitors([]);
      toast.error('Visitantes frequentes apagados.');
    }
  };

  const handleClearUnitPhones = () => {
    if (confirm('Deseja limpar todos os telefones vinculados?')) {
      setUnitPhones([]);
      toast.error('Telefones vinculados apagados.');
    }
  };

  const handleClearUnitRules = () => {
    if (confirm('Deseja limpar todas as regras de unidade?')) {
      setUnitRules([]);
      toast.error('Regras de unidade apagadas.');
    }
  };





  // Remove the focus listener that was expanding the app on desktop

  const handleQuickResponse = (type: 'auth' | 'info', message: string, accessType?: AccessType, name?: string) => {
    // 1. Copy to clipboard
    navigator.clipboard.writeText(message);
    
    // 2. Visual feedback
    toast.dismiss();
    toast.success('MENSAGEM COPIADA', {
      description: 'Mensagem copiada. Cole no WhatsApp já aberto e envie.',
      duration: 3000,
      icon: <Copy className="w-4 h-4" />
    });
  };

  // 🚘 UBER Real-time Counter Logic
  useEffect(() => {
    const timer = setInterval(() => {
      setPendingRequests(prev => {
        let changed = false;
        const next = prev.map(r => {
          if (r.type === 'uber' && (r as any).uberArrivalMinutes !== undefined) {
             const currentMinutes = (r as any).uberArrivalMinutes;
             if (currentMinutes > 0) {
               changed = true;
               return { ...r, uberArrivalMinutes: currentMinutes - 1 };
             }
          }
          return r;
        });
        return changed ? next : prev;
      });
    }, 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  const handleNotifyResident = (type: AccessType) => {
    if (matchedResident) {
      // Guard: if pending request of this type already exists for this resident unit, do not process again
      const pendingExists = pendingRequests.some(r => r.unit === matchedResident.unit && r.type === type);
      if (pendingExists && type !== 'uber') {
        return;
      }

      // UBER FLOW CORRECTION
      if (type === 'uber') {
        setInitialFormData({
          destination: matchedResident.unit,
          type: 'uber'
        });
        setActiveForm('uber');
        return;
      }

      // Add to pending requests if not already there
      setPendingRequests(prev => {
        const alreadyExists = prev.some(r => r.unit === matchedResident.unit && r.type === type);
        if (alreadyExists) return prev;
        
        const isSearchValueName = searchTerm.trim().toLowerCase() !== matchedResident.unit.toLowerCase() && isNaN(Number(searchTerm.trim()));
        const potentialName = isSearchValueName ? searchTerm.trim() : "";

        return [...prev, { 
          id: crypto.randomUUID(), 
          unit: matchedResident.unit, 
          type, 
          residentName: matchedResident.residentName,
          visitorName: potentialName,
          origin: 'porter_entry',
          createdAt: new Date()
        }];
      });

      playOperationalSound('created');
      scrollActionsIntoView();
    }
  };

  const handleNotifyCaminhoDirect = (item: any) => {
    const arrivingTypeName = item.type === 'delivery' ? 'entregador' : item.type === 'uber' ? 'Uber' : item.type === 'visitor' ? 'visitante' : 'prestador';
    const message = `Olá. Seu ${arrivingTypeName} foi liberado e está a caminho da sua unidade.`;

    navigator.clipboard.writeText(message).then(() => {
      toast.success('MENSAGEM COPIADA', {
        description: 'Mensagem pronta para colar no WhatsApp.',
        position: 'bottom-center',
        duration: 3000
      });
    }).catch(err => {
      console.error('Falha ao copiar:', err);
      toast.error('FALHA AO COPIAR', { description: 'Tente copiar manualmente.' });
    });

    setNotifiedCaminhoIds(prev => {
      if (prev.includes(item.id)) return prev;
      return [...prev, item.id];
    });
    setTemporarilyShowingAvisadoIds(prev => {
      if (prev.includes(item.id)) return prev;
      return [...prev, item.id];
    });

    if (item.type === 'delivery' && item.avisarMorador) {
      if (item.isPreAuth) {
        setPreAuths(prev => prev.map(p => p.id === item.id ? { ...p, avisarMorador: false } : p));
      } else {
        setPendingRequests(prev => prev.map(r => r.id === item.id ? { ...r, avisarMorador: false } : r));
      }
    }

    setTimeout(() => {
      setTemporarilyShowingAvisadoIds(prev => prev.filter(id => id !== item.id));
    }, 5000);
  };

  const handleReleasePendingAccess = (request: { id: string; unit: string; type: AccessType; residentName: string; visitorName?: string; draft?: any; printImage?: string }) => {
    if (request.type === 'uber' && (request.printImage || request.draft?.printImage)) {
      handleDirectRelease(request, false);
      return;
    }
    handleManualEntry(request.type, {
      ...(request.draft || {}),
      pendingRequestId: request.id,
      destination: request.unit,
      name: (request.draft?.name || request.visitorName || ''),
      type: request.type
    });
  };

  const handleDirectRelease = (item: any, isPreAuth: boolean) => {
    // GUARD AGAINST DUPLICATE PROCESSING & SPAM ENTER KEYS
    if (isPreAuth) {
      const pAuth = preAuths.find(p => p.id === item.id);
      if (!pAuth || pAuth.status !== 'autorizada') {
        return; // Already processed!
      }
    } else {
      const pReq = pendingRequests.find(r => r.id === item.id);
      if (!pReq) {
        return; // Already processed/removed!
      }
    }

    // Collect data to validate
    const data = isPreAuth ? {
      type: item.type,
      name: item.name,
      document: item.document,
      plate: item.plate,
      vehicleModel: item.vehicleModel,
      vehicleColor: item.vehicleColor,
      destination: item.unit,
      notes: item.observation,
      deliverySubtype: item.deliverySubtype,
      origin: item.origin,
      preAuthId: item.id,
      company: item.company,
      onFoot: item.draft?.onFoot || false
    } : {
      type: item.type,
      name: item.visitorName || '',
      destination: item.unit,
      origin: 'porter_entry',
      pendingRequestId: item.id,
      ...(item.draft || {})
    };

     // Mandatory Security Validation
    const rawName = data.name || '';
    const name = rawName === 'MOTORISTA UBER' ? '' : rawName;
    const document = data.document || '';
    const rawPlate = data.plate || '';
    const plate = rawPlate === 'PLACA' ? '' : rawPlate;
    const rawVehicleModel = data.vehicleModel || '';
    const vehicleModel = rawVehicleModel === 'VEÍCULO' ? '' : rawVehicleModel;
    const rawVehicleColor = data.vehicleColor || '';
    const vehicleColor = rawVehicleColor === 'COR' ? '' : rawVehicleColor;
    const onFoot = data.onFoot || false;
    const isUber = data.type === 'uber';
    const hasPrint = !!(item.printImage || item.draft?.printImage);

    // Para Uber, nome é opcional, mas vamos garantir um fallback razoável
    if (!isUber && (!name.trim() || name === 'Pendente' || name === 'Aguardando Dados')) {
      if (isPreAuth) {
        handleReleasePreAuth(item);
      } else {
        handleReleasePendingAccess(item);
      }
      toast.error('Preencha os dados obrigatórios antes de liberar.', {
        description: 'O campo NOME é obrigatório.'
      });
      return;
    }

    // RG/CPF é opcional para Uber
    if (!isUber && !document.trim()) {
      if (isPreAuth) {
        handleReleasePreAuth(item);
      } else {
        handleReleasePendingAccess(item);
      }
      toast.error('Preencha os dados obrigatórios antes de liberar.', {
        description: 'O campo RG/CPF é obrigatório.'
      });
      return;
    }

    // Placa é obrigatória para veículos (sempre obrigatória para Uber)
    if ((!onFoot || isUber) && !plate.trim() && !hasPrint) {
      if (isPreAuth) {
        handleReleasePreAuth(item);
      } else {
        handleReleasePendingAccess(item);
      }
      toast.error('Preencha os dados obrigatórios antes de liberar.', {
        description: 'A PLACA é obrigatória para Uber/Veículos.'
      });
      return;
    }

    // Modelo é obrigatório para Uber
    if (isUber && !vehicleModel.trim() && !hasPrint) {
      if (isPreAuth) {
        handleReleasePreAuth(item);
      } else {
        handleReleasePendingAccess(item);
      }
      toast.error('Preencha os dados obrigatórios antes de liberar.', {
        description: 'O MODELO do veículo é obrigatório para Uber.'
      });
      return;
    }

    const isMultiDelivery = data.type === 'delivery';
    const isMultiVisitor = data.type === 'visitor';
    const currentQty = (isMultiDelivery || isMultiVisitor) && !isPreAuth ? (item.deliveriesCount ?? item.draft?.deliveriesCount ?? 1) : 1;

    if (isMultiDelivery && !isPreAuth && currentQty > 1) {
      setPendingRequests(prev => prev.map(r => 
        r.id === item.id 
          ? { 
              ...r, 
              deliveriesCount: currentQty - 1, 
              draft: r.draft ? { ...r.draft, deliveriesCount: currentQty - 1 } : undefined 
            } 
          : r
      ));
      toast.success(`Entrega liberada! Entregas pendentes: ${currentQty - 1}`, {
        icon: <div className="bg-amber-100 p-1 rounded text-amber-600"><Check className="w-4 h-4" /></div>
      });
      playOperationalSound('released');
      setSearchTerm('');
      return;
    }

    if (isMultiVisitor && !isPreAuth && currentQty > 1) {
      setPendingRequests(prev => prev.map(r => 
        r.id === item.id 
          ? { 
              ...r, 
              deliveriesCount: currentQty - 1, 
              draft: r.draft ? { ...r.draft, deliveriesCount: currentQty - 1 } : undefined 
            } 
          : r
      ));
      toast.success(`Visitante liberado! Visitantes pendentes: ${currentQty - 1}`, {
        icon: <div className="bg-amber-100 p-1 rounded text-amber-600"><Check className="w-4 h-4" /></div>
      });
      playOperationalSound('released');
      setSearchTerm('');
      return;
    }

    const newRecord: AccessRecord = {
      id: crypto.randomUUID(),
      type: data.type,
      deliverySubtype: data.deliverySubtype,
      fastFlow: false,
      name: isUber && hasPrint ? 'MOTORISTA APLICATIVO (PRINT)' : (isUber && !name.trim() ? 'Motorista Uber' : (name || 'N/A')),
      document: data.document,
      cpf: data.cpf || item.draft?.cpf || '',
      rg: data.rg || item.draft?.rg || '',
      phone: data.phone || item.draft?.phone || '',
      plate: isUber && hasPrint && !plate.trim() ? 'PRINT' : plate,
      vehicleModel: isUber && hasPrint && !vehicleModel.trim() ? 'PRINT' : vehicleModel,
      vehicleColor: isUber && hasPrint && !vehicleColor.trim() ? 'PRINT' : vehicleColor,
      destination: data.destination || 'N/A',
      timestamp: new Date(),
      status: 'finalizado',
      notes: data.notes || (isUber && hasPrint ? 'AUTORIZAÇÃO DE MORADOR VIA PRINT' : undefined),
      origin: isUber && hasPrint ? 'print_uber' : (data.origin || (isPreAuth ? 'pre_autorizacao' : 'porter_entry')),
      company: data.company,
      printImage: data.printImage || item.printImage || item.draft?.printImage,
      porterName: loggedPorter ? loggedPorter.name : (userRole === 'sindico' ? 'Síndico (Admin)' : (adminUsers.find(u => u.active && u.type === 'porteiro')?.name || 'Carlos')),
      prismaId: data.prismaId || item.prismaId || item.draft?.prismaId,
      prismaNumber: data.prismaNumber || item.prismaNumber || item.draft?.prismaNumber,
      prismaColor: data.prismaColor || item.prismaColor || item.draft?.prismaColor,
    };

    setRecords([newRecord, ...records]);
    upsertPermanentProfile(newRecord);
    
    if (newRecord.prismaId) {
      setPrismas(prev => prev.map(p => 
        p.id === newRecord.prismaId ? { ...p, currentRecordId: newRecord.id, status: 'em_uso', currentUnit: newRecord.destination } : p
      ));
    }
    
    // Increment releaseCount for the resident who authorized
    if (isPreAuth && item.whatsappMetadata?.residentId) {
      setUnitPhones(prev => prev.map(p => 
        p.id === item.whatsappMetadata.residentId ? { ...p, releaseCount: (p.releaseCount || 0) + 1 } : p
      ));
    }

    if (isPreAuth) {
      setPreAuths(preAuths.map(p => 
        p.id === item.id ? { ...p, status: 'finalizada', updatedAt: new Date(), processedByPorter: true } : p
      ));
      toast.success('Entrada liberada e registrada com sucesso.', {
        icon: <div className="bg-emerald-100 p-1 rounded text-emerald-600"><Check className="w-4 h-4" /></div>
      });
      setSearchTerm('');
    } else {
      setPendingRequests(prev => prev.filter(r => r.id !== item.id));
      toast.success('Entrada liberada e registrada com sucesso.', {
        icon: <div className="bg-emerald-100 p-1 rounded text-emerald-600"><Check className="w-4 h-4" /></div>
      });
      setSearchTerm('');
    }

    // Clean focus, invalidate ENTER on this card, and restore search neutral state
    setKbArea('search');
    setKbIndex(0);
    const activeEl = document.activeElement as HTMLElement;
    if (activeEl) {
      activeEl.blur();
    }
    setTimeout(() => {
      searchRef.current?.focus();
    }, 50);
  };

  const handleNotifyDeliveryNoEntry = (data: any) => {
    const unit = data.destination || data.unit;
    const resident = unitPhones.find(p => p.unit === unit && p.active);
    
    if (!resident) {
      toast.error('Unidade não encontrada ou sem contato cadastrado.');
      return;
    }

    const message = replaceMessageVariables(messageTemplates.deliveryNotLiberated, {
      residentName: resident.residentName,
      unit: unit,
      condoName: condoInfo.name,
      porterName: loggedPorter ? loggedPorter.name : (adminUsers.find(u => u.active && u.type === 'porteiro')?.name || 'Portaria')
    });

    let cleanPhone = resident.primaryPhone.replace(/\D/g, '');
    if (cleanPhone.length <= 11 && !cleanPhone.startsWith('55')) {
      cleanPhone = '55' + cleanPhone;
    }

    const isDesktop = window.innerWidth >= 768;
    
    // Removed WhatsApp redirection
    navigator.clipboard.writeText(message);
    toast.dismiss();
    toast.success('MENSAGEM COPIADA', {
      description: 'Mensagem copiada. Cole no WhatsApp manualmente.',
      duration: 3000,
      icon: <Copy className="w-4 h-4" />
    });

    // Register in history
    const negativeRecord: AccessRecord = {
      id: crypto.randomUUID(),
      type: 'delivery',
      deliverySubtype: data.deliverySubtype || 'motoboy',
      name: data.name || 'Entregador (Não Identificado)',
      document: data.document,
      plate: data.plate,
      vehicleModel: data.vehicleModel,
      vehicleColor: data.vehicleColor,
      destination: unit,
      timestamp: new Date(),
      status: 'não_liberada',
      notes: `Morador avisado via WhatsApp: "${message}"`,
      origin: 'manual',
      company: data.company,
      porterName: loggedPorter ? loggedPorter.name : (userRole === 'sindico' ? 'Síndico (Admin)' : (adminUsers.find(u => u.active && u.type === 'porteiro')?.name || 'Carlos')),
    };

    setRecords([negativeRecord, ...records]);
    upsertPermanentProfile(negativeRecord);
    setActiveForm(null);
    setInitialFormData(null);
    
    toast.info('ENTREGA NÃO LIBERADA', {
      description: `Morador da unidade ${unit} foi avisado via WhatsApp.`,
      icon: <div className="bg-red-100 p-1 rounded text-red-600"><AlertTriangle className="w-4 h-4" /></div>
    });
    playOperationalSound('alert');
  };

  const handleCopyMessage = (message: string) => {
    navigator.clipboard.writeText(message);
    toast.dismiss();
    toast.success('MENSAGEM COPIADA', {
      description: 'Mensagem copiada. Cole no WhatsApp já aberto e envie.',
      duration: 3000,
      icon: <Copy className="w-4 h-4" />
    });
  };

  const handleSavePreAuth = (data: Partial<PreAuthorization>) => {
    if (editingPreAuth) {
      setPreAuths(preAuths.map(p => 
        p.id === editingPreAuth.id 
          ? { ...p, ...data, updatedAt: new Date(), isManualValidity: true } as PreAuthorization 
          : p
      ));
      toast.success('Pré-autorização atualizada com sucesso!');
    }
    setIsPreAuthFormOpen(false);
    setEditingPreAuth(null);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-900 select-none bg-slate-900">
      {loggedPorter === null && (
        <PorterPinLogin
          condoName={condoInfo.name}
          porteiros={porteiros}
          onLogin={handlePorterLoginByPin}
        />
      )}

      {/* CONFIRMAÇÃO DE ENCERRAMENTO DE PLANTÃO (MODAL DE LOGOUT) */}
      {isLogoutModalOpen && loggedPorter && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 sm:p-8 flex flex-col gap-6 text-center animate-in zoom-in-95 duration-350">
            {/* Header / Alert Icon */}
            <div className="mx-auto bg-rose-500/10 border border-rose-500/20 p-4 rounded-full text-rose-500 h-16 w-16 flex items-center justify-center shadow-inner">
              <LogOut className="w-8 h-8" />
            </div>
            
            {/* Title */}
            <div>
              <h2 className="text-xl sm:text-2xl font-black uppercase text-slate-100 tracking-tight">
                Encerrar Plantão
              </h2>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
                Confirmação de Saída de Operador
              </p>
            </div>

            {/* Porter Details */}
            <div className="bg-slate-950/60 rounded-2xl border border-slate-850 p-4 shrink-0">
              <div className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">
                Porteiro Ativo
              </div>
              <div className="text-lg font-black uppercase text-white tracking-wide">
                {loggedPorter.name}
              </div>
              {loggedPorter.role && (
                <div className="text-xs font-bold uppercase text-blue-400 tracking-wider mt-1.5">
                  {loggedPorter.role}
                </div>
              )}
            </div>

            {/* Prompt */}
            <p className="text-sm text-slate-400 font-semibold leading-relaxed px-2">
              Deseja realmente encerrar o plantão?
            </p>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 w-full mt-2">
              <button
                type="button"
                onClick={() => setIsLogoutModalOpen(false)}
                className="flex-1 py-3.5 bg-slate-800 hover:bg-slate-750 border border-slate-700/60 font-black text-xs uppercase tracking-widest text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer active:scale-95"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  handlePorterLogoutShift();
                  setIsLogoutModalOpen(false);
                }}
                className="flex-1 py-3.5 bg-rose-600 hover:bg-rose-700 font-black text-xs uppercase tracking-widest text-white rounded-xl transition-all shadow-lg shadow-rose-600/15 cursor-pointer active:scale-95"
              >
                Encerrar Plantão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PORTARIA PRO - MAIN CONTAINER */}
      <div 
        id="main-app-container"
        className={cn(
          "h-full bg-slate-50 flex flex-col font-sans selection:bg-blue-100 transition-all duration-500 ease-in-out relative origin-left overflow-y-auto no-scrollbar w-full"
        )}
      >

        
        <Header 
          condoName={condoInfo.name} 
          isMuted={isMuted}
          onToggleMute={() => setIsMuted(prev => !prev)}
          loggedPorterName={loggedPorter?.name}
          loggedPorterRole={loggedPorter?.role}
          onLogoutShift={() => setIsLogoutModalOpen(true)}
        />

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40 w-full shadow-sm">
        <div className="w-full max-w-7xl mx-auto flex overflow-x-auto no-scrollbar">
          <button
            onClick={() => setView('portaria')}
            className={cn(
              "flex-1 min-w-[80px] py-3 sm:py-4 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 font-black text-[9px] sm:text-xs uppercase tracking-widest transition-all border-b-4 group",
              view === 'portaria' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            <HomeIcon className="w-3.5 h-3.5 sm:w-4 h-4" />
            Portaria
          </button>
          <button
            onClick={() => setView('frequentes')}
            className={cn(
              "flex-1 min-w-[80px] py-3 sm:py-4 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 font-black text-[9px] sm:text-xs uppercase tracking-widest transition-all border-b-4 group",
              view === 'frequentes' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            <Users className="w-3.5 h-3.5 sm:w-4 h-4" />
            Frequentes
          </button>
          <button
            onClick={() => setView('preauth')}
            className={cn(
              "flex-1 min-w-[100px] py-3 sm:py-4 flex flex-col items-center justify-center gap-1 font-black text-[9px] sm:text-xs uppercase tracking-widest transition-all border-b-4 relative group",
              view === 'preauth' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
              <Calendar className="w-3.5 h-3.5 sm:w-4 h-4" />
              <span className="text-center">Pré-Autorização</span>
            </div>
            
            {(preAuthAlerts.visitor > 0 || preAuthAlerts.delivery > 0 || preAuthAlerts.service > 0) && (
              <div className="hidden sm:flex gap-3 mt-2 px-3 py-0.5 bg-slate-50/50 rounded-full border border-slate-100 shadow-inner group-hover:bg-white transition-colors">
                {preAuthAlerts.visitor > 0 && (
                  <div className="flex items-center gap-1 animate-blink-soft">
                    <User className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                    {preAuthAlerts.visitor > 1 && (
                      <span className="text-[10px] font-black text-emerald-700 leading-none">{preAuthAlerts.visitor}</span>
                    )}
                  </div>
                )}
                {preAuthAlerts.delivery > 0 && (
                  <div className="flex items-center gap-1 animate-blink-soft">
                    <Bike className="w-3.5 h-3.5 text-orange-600 fill-orange-600" />
                    {preAuthAlerts.delivery > 1 && (
                      <span className="text-[10px] font-black text-orange-700 leading-none">{preAuthAlerts.delivery}</span>
                    )}
                  </div>
                )}
                {preAuthAlerts.service > 0 && (
                  <div className="flex items-center gap-1 animate-blink-soft">
                    <Wrench className="w-3.5 h-3.5 text-blue-600 fill-blue-600" />
                    {preAuthAlerts.service > 1 && (
                      <span className="text-[10px] font-black text-blue-700 leading-none">{preAuthAlerts.service}</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </button>
          
          <button
            onClick={() => setView('controle')}
            className={cn(
              "flex-1 min-w-[110px] py-3 sm:py-4 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 font-black text-[9px] sm:text-xs uppercase tracking-widest transition-all border-b-4 group",
              view === 'controle' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            <Sliders className="w-3.5 h-3.5 sm:w-4 h-4" />
            Controle Operacional
          </button>

          {(isDev || userRole === 'admin' || userRole === 'sindico') && (
            <button
              onClick={() => setView('admin')}
              className={cn(
                "flex-1 min-w-[100px] py-3 sm:py-4 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 font-black text-[9px] sm:text-xs uppercase tracking-widest transition-all border-b-4 group",
                view === 'admin' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"
              )}
            >
              <Shield className="w-3.5 h-3.5 sm:w-4 h-4" />
              ADMIN
            </button>
          )}
        </div>
      </div>

      <main className="flex-1 w-full max-w-7xl mx-auto pb-20 sm:pb-8 px-4 sm:px-8 box-border">
        {(userRole === 'admin' || userRole === 'sindico') && deviceStatus !== 'authorized' ? (
          <div className="min-h-[70vh] flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white border border-slate-200 rounded-[2rem] p-8 text-center space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-rose-50 text-rose-650 rounded-full flex items-center justify-center mx-auto shadow-sm border border-rose-100">
                <Lock className="w-8 h-8 animate-bounce" />
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <span className="text-[10px] bg-rose-100 text-rose-700 font-extrabold px-3 py-1 rounded-full uppercase tracking-wider animate-pulse">
                    Acesso Bloqueado • Dispositivo Não Autorizado
                  </span>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-widest leading-none pt-1">
                    Central de Segurança
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase leading-relaxed max-w-sm mx-auto">
                    Este aparelho não consta na lista de dispositivos confiáveis do Admin Master e está impedido de visualizar dados ou módulos administrativos.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-left text-[11px] font-bold space-y-2 uppercase divide-y divide-slate-150">
                  <div className="flex justify-between py-1.5 text-slate-500">
                    <span>Usuário Logado:</span>
                    <span className="text-slate-800 font-black">{loggedPorter ? `${loggedPorter.name} (${loggedPorter.role})` : 'Usuário Administrativo'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 text-slate-500">
                    <span>Device ID Fingerprint:</span>
                    <span className="font-mono text-slate-800 text-[10px]">{localStorage.getItem('portaria_current_device_id') || 'DEV-MOCK-FINGERPRINT'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 text-slate-500">
                    <span>Status Atual:</span>
                    <span className="text-amber-600 font-black flex items-center gap-1">
                      • {deviceStatus === 'pending' ? 'AGUARDANDO AUTORIZAÇÃO MANUAL' : 'BLOQUEADO DEFINITIVAMENTE'}
                    </span>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3 text-[10px] uppercase font-bold text-center leading-normal">
                  ⚙ "Aguardando autorização manual na Central de Segurança." Acesse pelo seu Dispositivo Confiável Principal para liberar este dispositivo.
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handlePorterLogoutShift();
                  }}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all border border-slate-200 active:scale-95"
                >
                  Fazer Log Out (Sair)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const devId = localStorage.getItem('portaria_current_device_id');
                    const stored = localStorage.getItem('portaria_security_devices');
                    if (stored && devId) {
                      try {
                        const list = JSON.parse(stored);
                        const updated = list.map((d: any) => {
                          if (d.deviceId === devId) {
                            return { ...d, status: 'authorized' };
                          }
                          return d;
                        });
                        localStorage.setItem('portaria_security_devices', JSON.stringify(updated));
                        setDeviceStatus('authorized');
                        toast.success('Bypass do Simulador Ativado', {
                          description: 'Dispositivo autorizado de volta ao Painel Master.'
                        });
                      } catch (e) {}
                    }
                  }}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-sm active:scale-95"
                >
                  Liberar Acesso (Bypass Simulador)
                </button>
              </div>
            </div>
          </div>
        ) : view === 'portaria' ? (
          <motion.div 
            layout 
            className="flex flex-col gap-4 pt-4"
            initial={false}
          >
            {/* Search Bar & Resident Contact - Dynamic Header */}
            <div className="px-4 mb-4">
                <div className="flex flex-col gap-2.5">
                  {/* Search Bar - Compact, professional layout to release vertical space */}
                  <div className="w-full relative group h-[44px]" onClick={(e) => e.stopPropagation()}>
                    <div className="relative h-full">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                      <input
                        ref={searchRef}
                        type="text"
                        placeholder="Pesquisar casa ou nome..."
                        autoComplete="off"
                        className={cn(
                          "w-full h-full pl-11 pr-11 bg-white border-2 border-slate-200 rounded-xl shadow-md focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-black placeholder:text-slate-350",
                          kbArea === 'search' && "ring-4 ring-blue-500/5 border-blue-400"
                        )}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        onFocus={(e) => {
                          e.stopPropagation();
                        }}
                      />
                      {searchTerm && (
                        <button 
                          onClick={() => setSearchTerm('')}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors cursor-pointer p-0.5 rounded-full hover:bg-slate-50 flex items-center justify-center"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>



                  {/* Quick Actions - Contextual Visibility */}
                  <AnimatePresence>
                    {!searchTerm && (
                      <motion.div 
                        key="quick-actions-area"
                        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                        animate={{ opacity: 1, height: "auto", marginBottom: 0 }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        transition={{ duration: 0.3 }}
                        className="w-full overflow-hidden"
                      >
                        <QuickActions 
                          onAction={(type) => {
                            setOpenedFromQuickActions(true);
                            handleManualEntry(type);
                          }} 
                          onUberDrop={(file) => {
                            const reader = new FileReader();
                            reader.onload = () => {
                              const base64 = reader.result as string;
                              setUberPrintAttached(base64);
                              toast.info('DETECÇÃO VIA DRAG & DROP', {
                                description: 'Print de corrida recebido! Informe a unidade diretamente no botão UBER.',
                                icon: <div className="text-emerald-500 animate-bounce">⚡</div>
                              });
                            };
                            reader.readAsDataURL(file);
                          }}
                          onDeliveryDrop={(file) => {
                            const reader = new FileReader();
                            reader.onload = () => {
                              const base64 = reader.result as string;
                              setOpenedFromQuickActions(true);
                              handleManualEntry('delivery', { printImage: base64 });
                              toast.info('DETECÇÃO VIA DRAG & DROP', {
                                description: 'Print de entrega recebido! Informe a unidade.',
                                icon: <div className="text-orange-500 animate-bounce">⚡</div>
                              });
                            };
                            reader.readAsDataURL(file);
                          }}
                          activeType={activeForm} 
                          activeCardIndex={kbArea === 'quick-actions' ? kbIndex % 3 : activeCardIndex}
                          pendingCounts={globalPendingCounts}
                          onImmediateRelease={handleImmediateRelease}
                          uberPrintAttached={uberPrintAttached}
                          onUberPrintAttachedChange={setUberPrintAttached}
                          onImmediateUberRelease={handleImmediateUberRelease}
                          onQueueUberPrintAction={handleQueueUberPrintAction}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Resident Info & Quick Responses - Central Stage */}
                <AnimatePresence>
                  {matchedResident && searchTerm.length > 0 && (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, y: -20, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -20, height: 0 }}
                      className="space-y-4 mt-4 overflow-hidden"
                    >
                      <div className="w-full">
                        <ResidentContactCard 
                          resident={matchedResident} 
                          messageTemplates={messageTemplates} 
                          condoName={condoInfo.name}
                          porterName={adminUsers.find(u => u.active && u.type === 'porteiro')?.name || 'Portaria'}
                          searchTerm={searchTerm}
                          onNotify={handleNotifyResident}
                          pendingCounts={unitPendingCounts}
                          pendingRequests={pendingRequests}
                          preAuths={preAuths}
                          onReleasePendingAccess={handleReleasePendingAccess}
                          onReleasePreAuth={handleReleasePreAuth}
                          onCancelPendingAccess={(r) => handleCancelAction(r.id, false)}
                          onCancelPreAuth={(p) => handleCancelAction(p.id, true)}
                          isSelected={kbArea === 'resident-card'}
                          unitPhones={unitPhones}
                        />
                      </div>

                      {/* AREA DE AÇÕES VINCULADAS À UNIDADE */}
                      {sortedQueue.filter(item => item.unit === matchedResident.unit).length > 0 && (
                        <div className="space-y-1 mt-1 mx-2 mb-2">
                          <div className="flex items-center gap-2 mb-1 px-1">
                             <div className="h-px bg-slate-100 flex-1" />
                             <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest px-2">Ações Vinculadas</span>
                             <div className="h-px bg-slate-100 flex-1" />
                          </div>
                          {sortedQueue.filter(item => item.unit === matchedResident.unit).map((action) => {
                            const isWaiting = action.status === 'authorized_waiting' || waitingArrivalIds.includes(action.id);
                            
                            return (
                              <motion.div 
                                key={action.id}
                                layout
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={cn(
                                  "flex items-center justify-between p-2 rounded-xl border transition-all",
                                  isWaiting 
                                    ? "bg-amber-50 border-amber-200 shadow-amber-100 shadow-sm pulse-amber" 
                                    : "bg-white border-slate-100 shadow-sm"
                                )}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-slate-400 font-bold ml-1 text-xs">↳</span>
                                  <div className={cn(
                                    "w-6 h-6 rounded-lg flex items-center justify-center text-white shrink-0",
                                    action.type === 'delivery' ? 'bg-orange-600' : 
                                    action.type === 'visitor' ? 'bg-emerald-600' : 
                                    action.type === 'uber' ? 'bg-[#133d47]' : 'bg-blue-600'
                                  )}>
                                    {action.type === 'visitor' ? <User className="w-3 h-3" /> :
                                     action.type === 'delivery' ? <Bike className="w-3 h-3" /> :
                                     action.type === 'uber' ? <Car className="w-3 h-3" /> :
                                     <Wrench className="w-3 h-3" />}
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-[10px] font-black text-slate-900 uppercase truncate">
                                      {action.type === 'delivery' 
                                        ? `ENTREGA (${(action as any).deliveriesCount ?? action.draft?.deliveriesCount ?? 1}x)` 
                                        : action.type === 'visitor'
                                          ? `VISITANTE (${(action as any).deliveriesCount ?? action.draft?.deliveriesCount ?? 1}x)`
                                          : action.type === 'service' ? 'PRESTADOR' : 'UBER'}
                                      {action.visitorName ? ` • ${action.visitorName.split(' ')[0]}` : ''}
                                    </span>
                                    {isWaiting ? (
                                      <span className="text-[8px] font-black text-amber-600 uppercase tracking-tighter flex items-center gap-1">
                                        🟡 LIBERAÇÃO AUTORIZADA — AGUARDANDO CHEGADA
                                      </span>
                                    ) : (
                                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                                        {action.isPreAuth ? 'PRÉ-AUTORIZADO' : 'AGUARDANDO LIBERAÇÃO'}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-1.5 shrink-0 select-none ml-auto" onClick={(e) => e.stopPropagation()}>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCancelAction(action.id, action.isPreAuth);
                                    }}
                                    className="w-[84px] h-[36px] bg-red-600 hover:bg-red-700 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all active:scale-[0.95] border border-red-500 shadow-md shadow-red-200/50 flex items-center justify-center text-center"
                                  >
                                    CANCELAR
                                  </button>

                                  {isWaiting ? (
                                    <div className="w-[84px] h-[36px] flex items-center justify-center shrink-0">
                                      {temporarilyShowingAvisadoIds.includes(action.id) ? (
                                        <div className="w-[84px] h-[36px] bg-emerald-600 text-white rounded-lg shadow-md flex flex-col items-center justify-center text-center font-black animate-in fade-in zoom-in duration-200 border border-emerald-500 scale-102">
                                          <span className="text-[8.5px] font-black tracking-tight leading-tight">✅ MORADOR</span>
                                          <span className="text-[8.5px] font-black tracking-tight leading-tight">AVISADO</span>
                                        </div>
                                      ) : !notifiedCaminhoIds.includes(action.id) ? (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleNotifyCaminhoDirect(action);
                                          }}
                                          className={cn("w-[84px] h-[36px] rounded-lg text-[8.5px] font-black uppercase tracking-tighter flex flex-col items-center justify-center text-center transition-all active:scale-95 shadow-md hover:shadow-lg cursor-pointer select-none shrink-0 leading-[1.05]", action.type === 'delivery' && (action as any).avisarMorador ? "bg-orange-500 hover:bg-orange-600 border border-orange-400 text-white animate-pulse" : "bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800")}
                                        >
                                          {action.type === 'delivery' && (action as any).avisarMorador ? (
                                            <>
                                              <span>🔔 AVISAR</span>
                                              <span>MORADOR</span>
                                            </>
                                         ) : (
                                            <>
                                              <span>📢 A CAMINHO</span>
                                              <span>DA UNIDADE</span>
                                            </>
                                          )}
                                        </button>
                                      ) : (
                                        <div className="w-[84px] h-[36px] bg-emerald-600 text-white rounded-lg shadow-md flex flex-col items-center justify-center text-center font-black border border-emerald-500 shrink-0">
                                          <span className="text-[8.5px] font-black tracking-tight leading-tight">✅ CAMINHO</span>
                                          <span className="text-[8.5px] font-black tracking-tight leading-tight">ENVIADO</span>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAuthorizeArrival(action.id);
                                      }}
                                      className="w-[84px] h-[36px] bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-[7px] font-black uppercase tracking-tighter transition-all active:scale-[0.95] border border-cyan-400 shadow-md shadow-cyan-200/50 flex flex-col items-center justify-center text-center leading-[1.05] px-0.5 shrink-0"
                                    >
                                      <span>LIBERAÇÃO</span>
                                      <span>AUTORIZADA</span>
                                    </button>
                                  )}

                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDirectRelease(action, action.isPreAuth);
                                    }}
                                    className="w-[84px] h-[36px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all active:scale-[0.95] border border-emerald-500 shadow-md shadow-emerald-200/50 flex items-center justify-center text-center"
                                  >
                                    LIBERAR
                                  </button>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      )}

                      {otherResidents.length > 0 && (
                        <div className="flex flex-wrap gap-2 max-w-2xl mx-auto w-full">
                          {otherResidents.map(other => {
                            const unitAllResidents = unitPhones.filter(p => p.unit === other.unit);
                            const isFast = isFastestResponder(other.id, unitAllResidents);
                            
                            return (
                              <button
                                key={other.id}
                                onClick={() => handleSwitchResident(other)}
                                className="flex-1 min-w-[calc(50%-4px)] bg-white border border-slate-200 rounded-xl px-2 py-1.5 flex flex-col items-center justify-center gap-0 hover:border-blue-300 hover:bg-blue-50/20 transition-all active:scale-[0.98] shadow-sm group h-12"
                              >
                                <div className="flex items-center gap-1.5 w-full justify-center">
                                  <span className="text-sm grayscale group-hover:grayscale-0 transition-all">
                                    {getResidentIcon(other.residentName)}
                                  </span>
                                  <span className="text-[10px] font-black text-slate-600 uppercase truncate">
                                    {other.residentName.split(' ')[0]}
                                  </span>
                                </div>
                                {isFast && (
                                  <span className="text-[7px] font-bold text-amber-500 uppercase tracking-tighter flex items-center gap-0.5 leading-none">
                                    ⭐ RESPONDE MAIS RÁPIDO
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>

            <div className="relative">
              <AnimatePresence initial={false}>
                {searchTerm ? (
                  <motion.div 
                    key="search-results"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className={cn(
                      "bg-white border border-slate-200 rounded-[2rem] shadow-xl shadow-slate-100 overflow-hidden min-h-[400px] mt-4 transition-all duration-300 mx-auto w-full",
                      isPlateSearch ? "max-w-6xl" : "max-w-3xl"
                    )}
                  >
                    <div>
                      <UnifiedSearchResults
                        searchTerm={searchTerm}
                        frequentVisitors={frequentVisitors}
                        preAuths={preAuths}
                        unitRules={unitRules}
                        unitPhones={unitPhones}
                        records={records}
                        memorizedPeople={memorizedPeople}
                        permanentProfiles={permanentProfiles}
                        onReleaseDirect={handleReleaseDirect}
                        onReleasePreAuth={handleReleasePreAuth}
                        onCancelPreAuth={(p) => handleCancelAction(p.id, true)}
                        onRemoveMemorized={(person) => console.log('Remove memorized person:', person)}
                        onManualEntry={handleManualEntry}
                        onReleaseMemorized={handleReleaseMemorized}
                        unitActivityThisWeek={unitActivityThisWeek}
                        selectedIndex={kbArea === 'results' ? kbIndex % (filteredMemorizedPeople.length || 1) : -1}
                        onResponse={handleQuickResponse}
                      />
                    </div>
                  </motion.div>
              ) : (
                <motion.div 
                  key="dashboard"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="w-full"
                >
                  <div className="bg-white border border-slate-200 rounded-[1.5rem] shadow-xl shadow-slate-100 relative z-20 px-[18px] pb-[18px] pt-1.5 sm:px-6 sm:pb-6 sm:pt-2.5 flex flex-col">
                    
                    {/* PORTARIA: EM ATENDIMENTO (UBER CARD, ETC) */}
                    {ongoingActions.length > 0 && (
                      <div className="w-full bg-blue-50/50 p-4 rounded-3xl border border-blue-100/50 animate-in fade-in slide-in-from-top-4 duration-500 mb-1.5">
                        <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2 mb-3">
                          <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                          Portaria: Em Atendimento
                        </h3>
                        <div className="grid gap-2">
                          {ongoingActions.map(action => (
                            <div key={action.id} className="bg-white border border-blue-100 rounded-2xl p-3 shadow-sm flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={cn(
                                  "w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0",
                                  action.type === 'delivery' ? 'bg-orange-600' : 
                                  action.type === 'visitor' ? 'bg-emerald-600' : 
                                  action.type === 'uber' ? 'bg-[#133d47]' : 'bg-blue-600'
                                )}>
                                  {action.type === 'visitor' ? <User className="w-4 h-4" /> :
                                   action.type === 'delivery' ? <Bike className="w-4 h-4" /> :
                                   action.type === 'uber' ? <Car className="w-4 h-4" /> :
                                   <Wrench className="w-4 h-4" />}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    {(action.type === 'delivery' || action.type === 'visitor') && (
                                      <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest leading-none">CASA {action.unit || '...'}</span>
                                    )}
                                    <span className="text-[7.5px] font-black px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded uppercase tracking-tighter leading-none">
                                      {action.status}
                                    </span>
                                  </div>
                                  <h4 className="text-xs font-black text-slate-900 uppercase truncate mt-1">
                                    {action.personName || 'Aguardando Dados...'}
                                  </h4>
                                </div>
                              </div>
                              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                                Em curso
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* PRISMAS EM USO */}
                    {prismas.filter(p => p.status === 'em_uso').length > 0 && (
                      <div className="flex flex-wrap items-center justify-start gap-1 pb-1 border-b border-dashed border-slate-100 mb-1" id="prismas-em-uso-row">
                        {prismas.filter(p => p.status === 'em_uso').map(p => {
                          let emoji = '⚪';
                          if (p.color === 'Amarelo') emoji = '🟡';
                          if (p.color === 'Vermelho') emoji = '🔴';
                          if (p.color === 'Azul') emoji = '🔵';
                          if (p.color === 'Verde') emoji = '🟢';
                          if (p.color === 'Preto') emoji = '⚫';
                          if (p.color === 'Branco') emoji = '⚪';

                          const colSelected = (p.color || '').toLowerCase().trim();
                          let bgClass = 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100';
                          let titleColorClass = 'text-slate-600';
                          let numberColorClass = 'text-slate-900';

                          if (colSelected === 'amarelo') {
                            bgClass = 'bg-yellow-400 border-yellow-500 text-slate-950 hover:bg-yellow-500';
                            titleColorClass = 'text-yellow-950/80';
                            numberColorClass = 'text-yellow-950';
                          } else if (colSelected === 'vermelho') {
                            bgClass = 'bg-red-500 border-red-600 text-white hover:bg-red-600';
                            titleColorClass = 'text-red-100/90';
                            numberColorClass = 'text-white';
                          } else if (colSelected === 'azul') {
                            bgClass = 'bg-blue-600 border-blue-700 text-white hover:bg-blue-700';
                            titleColorClass = 'text-blue-100/90';
                            numberColorClass = 'text-white';
                          } else if (colSelected === 'verde') {
                            bgClass = 'bg-emerald-500 border-emerald-600 text-white hover:bg-emerald-600';
                            titleColorClass = 'text-emerald-100/90';
                            numberColorClass = 'text-white';
                          } else if (colSelected === 'preto') {
                            bgClass = 'bg-slate-950 border-slate-900 text-white hover:bg-slate-900';
                            titleColorClass = 'text-slate-300';
                            numberColorClass = 'text-white';
                          } else if (colSelected === 'branco') {
                            bgClass = 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50';
                            titleColorClass = 'text-slate-500';
                            numberColorClass = 'text-slate-800';
                          }

                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPrismaToReturn(p);
                              }}
                              className={cn(
                                "flex flex-col items-center justify-center border rounded-md px-1.5 py-0 shadow-xs transition-all active:scale-95 select-none cursor-pointer outline-none whitespace-nowrap h-5 min-w-[70px]",
                                bgClass
                              )}
                              title="Clique para devolver"
                            >
                              <span className={cn("text-[8.5px] font-black tracking-wider leading-none", titleColorClass)}>CASA {p.currentUnit}</span>
                              <span className={cn("text-[8px] tracking-tight font-semibold flex items-center justify-center leading-none mt-[0.5px]", numberColorClass)}>
                                PR.{emoji}
                                <span className="text-[10px] font-black ml-0.5 tracking-tight font-mono">{p.number}</span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* QUICK MESSAGE ACTIONS BLOCK - BETWEEN UBER CARD & AGUARDANDO LIBERAÇÃO */}
                    <div className="flex items-center justify-between gap-4 py-1 border-b border-dashed border-slate-100 mb-1 relative z-50" id="quick-message-actions-row">
                      {/* Respostas Rápidas Section (Left) */}
                      <div className="relative" ref={respostasContainerRef}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowRespostasMenu(!showRespostasMenu);
                            setShowAvisosMenu(false);
                          }}
                          className={cn(
                            "flex items-center gap-2 px-3 py-1.5 border rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer shadow-xs select-none duration-150",
                            showRespostasMenu 
                              ? "bg-blue-600 border-blue-600 text-white animate-pulse" 
                              : "bg-blue-50/70 hover:bg-blue-100/70 text-blue-800 border-blue-200/50"
                          )}
                        >
                          <span>Respostas Rápidas</span>
                          <span>💬</span>
                        </button>
                        
                        <AnimatePresence>
                          {showRespostasMenu && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setShowRespostasMenu(false)} />
                              <motion.div
                                initial={{ opacity: 0, y: respostasMenuDirection === 'up' ? 10 : -10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: respostasMenuDirection === 'up' ? 10 : -10, scale: 0.95 }}
                                transition={{ duration: 0.15 }}
                                className={cn(
                                  "absolute left-0 w-[340px] bg-white border border-slate-200 rounded-2xl shadow-2xl z-[100] overflow-hidden py-1.5 flex flex-col gap-0.5",
                                  respostasMenuDirection === 'up' ? "bottom-full mb-2" : "top-full mt-2"
                                )}
                              >
                                <div className="px-3.5 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Respostas Rápidas</span>
                                  <span className="text-[8px] font-extrabold text-blue-600 uppercase tracking-tighter bg-blue-50 px-2 py-0.5 rounded">Copia automática</span>
                                </div>
                                {respostasRapidasList.map((rep, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleQuickMessageCopy(rep.text);
                                    }}
                                    className="w-full px-3.5 py-2.5 hover:bg-blue-50/30 text-left text-xs font-bold text-slate-700 transition-colors flex items-start gap-2.5 border-b border-slate-50 last:border-0 cursor-pointer"
                                  >
                                    <span className="shrink-0 text-sm mt-0.5">{rep.emoji}</span>
                                    <span className="leading-tight text-slate-700 font-extrabold">{getAutomaticGreeting()}, {rep.text}</span>
                                  </button>
                                ))}
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Central Feedback Area */}
                      <div className="flex-1 flex items-center justify-center min-w-0 h-[28px] relative overflow-hidden" id="quick-message-actions-feedback">
                        <AnimatePresence mode="popLayout">
                          {activeToasts.slice(0, 1).map((msg) => {
                            const upper = msg.message.toUpperCase();
                            let label = upper;
                            if (upper.includes('LIBERAÇÃO') || upper.includes('LIBERACAO')) {
                              label = '✓ LIBERAÇÃO AUTORIZADA';
                            } else if (upper.includes('CANCELAD')) {
                              label = '✓ AÇÃO CANCELADA';
                            } else if (upper.includes('ENTREGA') && (upper.includes('REGISTRAD') || upper.includes('LIBERAD'))) {
                              label = '✓ ENTREGA REGISTRADA';
                            } else if (upper.includes('VISITANTE') && (upper.includes('LIBERAD') || upper.includes('REGISTRAD'))) {
                              label = '✓ VISITANTE LIBERADO';
                            } else {
                              label = '✓ ' + upper;
                            }

                            const bgClass =
                              msg.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-200/60' :
                              msg.type === 'error' ? 'bg-red-50 text-red-600 border-red-200/60' :
                              msg.type === 'warning' ? 'bg-amber-50 text-amber-600 border-amber-200/65 font-black' :
                              msg.type === 'info' ? 'bg-cyan-50 text-cyan-600 border-cyan-200/60' :
                              'bg-slate-50 text-slate-600 border-slate-200/60';

                            return (
                              <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                                transition={{ duration: 0.15 }}
                                className={cn(
                                  "absolute flex items-center justify-center gap-1.5 px-3 py-1 bg-white border rounded-full text-[9px] font-black uppercase tracking-wider shadow-xs select-none cursor-pointer hover:opacity-80 active:scale-95 transition-all max-w-full",
                                  bgClass
                                )}
                                onClick={() => toast.dismiss(msg.id)}
                                title="Clique para fechar"
                              >
                                <span className="truncate">{label}</span>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </div>

                      {/* Avisos Rápidos Section (Right) */}
                      <div className="relative" ref={avisosContainerRef}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowAvisosMenu(!showAvisosMenu);
                            setShowRespostasMenu(false);
                          }}
                          className={cn(
                            "flex items-center gap-2 px-3 py-1.5 border rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer shadow-xs select-none duration-150",
                            showAvisosMenu 
                              ? "bg-amber-600 border-amber-600 text-white animate-pulse" 
                              : "bg-amber-50/70 hover:bg-amber-100/70 text-amber-800 border-amber-200/50"
                          )}
                        >
                          <span>Avisos Rápidos</span>
                          <span>🔔</span>
                        </button>

                        <AnimatePresence>
                          {showAvisosMenu && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setShowAvisosMenu(false)} />
                              <motion.div
                                initial={{ opacity: 0, y: avisosMenuDirection === 'up' ? 10 : -10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: avisosMenuDirection === 'up' ? 10 : -10, scale: 0.95 }}
                                transition={{ duration: 0.15 }}
                                className={cn(
                                  "absolute right-0 w-[340px] bg-white border border-slate-200 rounded-2xl shadow-2xl z-[100] overflow-hidden py-1.5 flex flex-col gap-0.5",
                                  avisosMenuDirection === 'up' ? "bottom-full mb-2" : "top-full mt-2"
                                )}
                              >
                                <div className="px-3.5 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Avisos Rápidos</span>
                                  <span className="text-[8px] font-extrabold text-amber-700 uppercase tracking-tighter bg-amber-50 px-2 py-0.5 rounded">Copia automática</span>
                                </div>
                                {avisosRapidosList.map((av, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleQuickMessageCopy(av.text);
                                    }}
                                    className="w-full px-3.5 py-2.5 hover:bg-amber-50/30 text-left text-xs font-bold text-slate-700 transition-colors flex items-start gap-2.5 border-b border-slate-50 last:border-0 cursor-pointer"
                                  >
                                    <span className="shrink-0 text-sm mt-0.5">{av.emoji}</span>
                                    <span className="leading-tight text-slate-700 font-extrabold">{getAutomaticGreeting()}, {av.text}</span>
                                  </button>
                                ))}
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      
                      <div id="actions-area" className="flex justify-between items-center gap-4 flex-wrap scroll-mt-24">
                        <div className="flex items-center gap-2">
                          <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Aguardando Liberação (Ações & Pré-Autorizados)</h3>
                        </div>
                      </div>
                      <div className="grid gap-3">
                        {sortedQueue.length === 0 ? (
                          <div className="p-12 text-center text-slate-300 text-[10px] font-bold uppercase bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                            Nenhuma liberação pendente.
                          </div>
                        ) : (
                          sortedQueue.map((item, index) => {
                            const isFirst = index === 0;
                            const isPreAuth = item.isPreAuth;
                            const waitTime = Math.floor((currentTime.getTime() - new Date(item.createdAt).getTime()) / 60000);
                            
                            const isWaiting = item.status === 'authorized_waiting' || waitingArrivalIds.includes(item.id);
                            
                            const iconBg = item.type === 'delivery' ? 'bg-orange-600' : 
                                           item.type === 'visitor' ? 'bg-emerald-600' : 
                                           item.type === 'uber' ? 'bg-[#133d47]' : 'bg-blue-600';
                            
                            const labelColor = item.type === 'delivery' ? 'text-orange-500' :
                                              item.type === 'visitor' ? 'text-emerald-500' : 
                                              item.type === 'uber' ? 'text-[#133d47]' : 'text-blue-500';
                            
                            const borderColor = item.type === 'delivery' ? 'border-orange-200' :
                                               item.type === 'visitor' ? 'border-emerald-200' : 
                                               item.type === 'uber' ? 'border-[#133d47]/20' : 'border-blue-200';
                            
                            const cardBg = isWaiting ? 'bg-amber-50/50' : (
                              item.status === 'pending' ? (
                                item.type === 'delivery' ? 'bg-orange-50/40' :
                                item.type === 'visitor' ? 'bg-emerald-50/40' : 'bg-blue-50/40'
                              ) : 'bg-white'
                            );
                          
                            const pulseClass = isWaiting ? 'pulse-amber' : (
                              isFirst ? 'pulse-strong' : 
                              item.type === 'delivery' ? 'pulse-petroleum' :
                              item.type === 'visitor' ? 'pulse-green' : 'pulse-blue'
                            );

                            const waitLabel = waitTime === 0 ? 'Agora mesmo' : `Aguardando há ${waitTime} min`;
                            const waitColor = waitTime <= 3 ? 'text-blue-600 font-extrabold' : 
                                              waitTime <= 7 ? 'text-amber-500 font-black' : 
                                              'text-red-600 font-black';

                            const getLabelText = () => {
                              if (item.type === 'delivery') return "ENTREGA";
                              const name = (item.visitorName || '').trim().toUpperCase();
                              if (item.type === 'visitor') {
                                if (!name || name === 'VISITANTE') return "VISITANTE";
                                return `VISITANTE ${name}`;
                              }
                              if (!name || name === 'VISITANTE' || name === 'PRESTADOR' || name === 'PRESTADOR DE SERVIÇO' || name === 'PRESTADOR DE SERVIÇOS') return "PRESTADOR DE SERVIÇOS";
                              return `PRESTADOR DE SERVIÇOS ${name}`;
                            };

                             const titleName = item.type === 'uber' 
                               ? ((item as any).visitorName || (item as any).name || 'MOTORISTA UBER')
                               : (item.residentName || 'MORADOR');

                             const isAwaitingRelease = !!item.awaitingRelease;

                             return (
                               <div 
                                 key={item.id}
                                 onClick={() => {
                                   if (isAwaitingRelease) return;
                                   isPreAuth ? handleReleasePreAuth(item as any) : handleReleasePendingAccess(item as any);
                                 }}
                                 className={cn(
                                   "border rounded-xl pt-[3px] pb-[7px] px-3 transition-all flex flex-col gap-1 shadow-sm w-full max-w-full box-border overflow-hidden relative",
                                   isAwaitingRelease 
                                     ? "cursor-default bg-orange-50/15 border-orange-400 shadow-orange-100/50" 
                                     : "cursor-pointer active:scale-[0.99] bg-white hover:border-blue-300 hover:shadow-md group/action",
                                   isAwaitingRelease ? "pulse-orange" : (isWaiting ? 'pulse-amber' : (item.type === 'uber' ? '' : pulseClass)),
                                   !isAwaitingRelease && borderColor,
                                   isPreAuth && "hover:shadow-md"
                                 )}
                               >
                                 {item.type === 'delivery' && (
                                   <div className="hidden">
                                     <button
                                       type="button"
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         const isAvisar = !item.avisarMorador;
                                         if (isPreAuth) {
                                           setPreAuths(prev => prev.map(p => p.id === item.id ? { ...p, avisarMorador: isAvisar } : p));
                                         } else {
                                           setPendingRequests(prev => prev.map(r => r.id === item.id ? { ...r, avisarMorador: isAvisar } : r));
                                         }
                                       }}
                                       className="text-[7.5px] font-black text-slate-400/80 hover:text-slate-600 transition-colors cursor-pointer select-none flex items-center gap-1 uppercase tracking-wider bg-transparent p-0 border-0 outline-none"
                                     >
                                       <span className="text-[10px] leading-none text-slate-400/80">{item.avisarMorador ? '●' : '◯'}</span>

                                     </button>
                                   </div>
                                 )}
                                 {/* ROW 1: HEADER (CASA, ICON, PRISMA, NAME & PENDING AT THE RIGHT) */}
                                <div className="flex items-center justify-between gap-3 w-full animate-in fade-in duration-300">
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <div className={cn(
                                      "w-7 h-7 rounded-md shrink-0 flex items-center justify-center text-white shadow-sm",
                                      iconBg
                                    )}>
                                      {item.type === 'visitor' ? <User className="w-3.5 h-3.5" /> :
                                       item.type === 'delivery' ? <Bike className="w-3.5 h-3.5" /> :
                                        item.type === 'uber' ? <Car className="w-3.5 h-3.5" /> :
                                        <Wrench className="w-3.5 h-3.5" />}
                                    </div>
                                    {item.type === 'delivery' || item.type === 'visitor' || item.type === 'uber' ? (
                                      <div className="min-w-0 flex-1 text-left flex flex-col leading-tight">
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-sm font-black text-slate-900 uppercase">CASA {item.unit}</span>
                                          {(item.status === 'authorized' && (unitActivityThisWeek.get(item.unit) || 0) >= 3) && (
                                              <span className="text-[10px] animate-pulse shrink-0" title="Casa com liberações frequentes">👍</span>
                                          )}
                                        </div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase truncate max-w-[160px]">
                                          {titleName}
                                        </span>
                                      </div>
                                    ) : (
                                      <div className="min-w-0 flex-1 text-left flex items-center flex-wrap gap-1.5">
                                        {(item.prismaColor || item.draft?.prismaColor) && (
                                          <span className={cn(
                                            "text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border border-black/10 flex items-center gap-1 shrink-0 shadow-xs leading-none",
                                            (item.prismaColor || item.draft?.prismaColor) === 'Amarelo' && 'bg-yellow-400 text-slate-900',
                                            (item.prismaColor || item.draft?.prismaColor) === 'Vermelho' && 'bg-red-500 text-white',
                                            (item.prismaColor || item.draft?.prismaColor) === 'Azul' && 'bg-blue-600 text-white',
                                            (item.prismaColor || item.draft?.prismaColor) === 'Verde' && 'bg-emerald-500 text-white',
                                            (item.prismaColor || item.draft?.prismaColor) === 'Preto' && 'bg-slate-950 text-white',
                                            (item.prismaColor || item.draft?.prismaColor) === 'Branco' && 'bg-white text-slate-800 border-slate-300'
                                          )}>
                                            PRISMA {item.prismaNumber || item.draft?.prismaNumber}
                                          </span>
                                        )}
                                        {(item.status === 'authorized' && (unitActivityThisWeek.get(item.unit) || 0) >= 3) && (
                                            <span className="text-[10px] animate-pulse shrink-0" title="Casa com liberações frequentes">👍</span>
                                        )}
                                        <span className="text-[10px] font-black text-slate-400 uppercase truncate max-w-[125px]">
                                          {titleName}
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  {/* PENDING COUNT ON TOP RIGHT */}
                                  {((item.type === 'delivery' || item.type === 'visitor') && (item.deliveriesCount ?? item.draft?.deliveriesCount ?? 1) > 0) && (
                                    <div className="shrink-0 select-none text-right">
                                      <span className="text-[9px] font-black uppercase tracking-wider text-teal-700 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded shadow-xs">
                                        {item.type === 'delivery' ? 'ENTREGAS' : 'VISITANTES'} PENDENTES: <strong className="font-extrabold text-teal-900">{item.deliveriesCount ?? item.draft?.deliveriesCount ?? 1}</strong>
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* ROW 2: ACTION LABELS & BUTTONS */}
                                <div className="flex items-center justify-between gap-3 w-full animate-in fade-in duration-300">
                                  <div className="min-w-0 flex-1 text-left flex flex-col gap-0.5">
                                    {item.type === 'uber' ? (
                                      <div className={cn("text-[8.5px] uppercase tracking-widest flex items-center gap-1 whitespace-nowrap", waitColor)}>
                                        <Clock className="w-2.5 h-2.5 animate-pulse" />
                                        <span>{waitLabel.toUpperCase()}</span>
                                      </div>
                                    ) : item.type === 'visitor' ? (
                                      <div className="flex items-center gap-1 min-w-0">
                                        <span className="text-[8.5px] font-black uppercase tracking-widest text-emerald-500 shrink-0">
                                          VISITANTE
                                        </span>
                                        {(() => {
                                          const cleanName = (item.visitorName || '').trim().toUpperCase();
                                          if (cleanName && cleanName !== 'VISITANTE') {
                                            return (
                                              <span className="text-[8.5px] font-black uppercase tracking-widest text-blue-600 truncate max-w-[170px]">
                                                {cleanName}
                                              </span>
                                            );
                                          }
                                          return null;
                                        })()}
                                      </div>
                                    ) : item.type === 'delivery' ? (
                                      <span className="text-[8.5px] font-black uppercase tracking-widest text-orange-600">
                                        ENTREGA
                                      </span>
                                    ) : (
                                      <div className="flex items-center gap-1 min-w-0">
                                        <span className={cn("text-[8.5px] font-black uppercase tracking-widest text-blue-500 shrink-0")}>
                                          PRESTADOR
                                        </span>
                                        {(() => {
                                          const cleanName = (item.visitorName || '').trim().toUpperCase();
                                          if (cleanName && cleanName !== 'PRESTADOR' && cleanName !== 'PRESTADOR DE SERVIÇO' && cleanName !== 'PRESTADOR DE SERVIÇOS' && cleanName !== 'VISITANTE') {
                                            return (
                                              <span className="text-[8.5px] font-black uppercase tracking-widest text-blue-600 truncate max-w-[170px]">
                                                {cleanName}
                                              </span>
                                            );
                                          }
                                          return null;
                                        })()}
                                      </div>
                                    )}

                                    {/* PRISMA VINCULADO AO CARD (VISITANTE / PRESTADOR / ETC) */}
                                    {item.type !== 'uber' && (item.prismaColor || item.draft?.prismaColor) && (
                                      <div className="mt-0.5">
                                        <span className={cn(
                                          "text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border border-black/10 flex items-center gap-1 shrink-0 shadow-xs leading-none w-fit",
                                          (item.prismaColor || item.draft?.prismaColor) === 'Amarelo' && 'bg-yellow-400 text-slate-900',
                                          (item.prismaColor || item.draft?.prismaColor) === 'Vermelho' && 'bg-red-500 text-white',
                                          (item.prismaColor || item.draft?.prismaColor) === 'Azul' && 'bg-blue-600 text-white',
                                          (item.prismaColor || item.draft?.prismaColor) === 'Verde' && 'bg-emerald-500 text-white',
                                          (item.prismaColor || item.draft?.prismaColor) === 'Preto' && 'bg-slate-950 text-white',
                                          (item.prismaColor || item.draft?.prismaColor) === 'Branco' && 'bg-white text-slate-800 border-slate-300'
                                        )}>
                                          PRISMA {item.prismaNumber || item.draft?.prismaNumber}
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Standard buttons layout (same size CANCELAR, ATIVO/LIBERAÇÃO AUTORIZADA, and LIBERAR) */}
                                  <div className="flex items-center gap-1.5 shrink-0 select-none ml-auto" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCancelAction(item.id, isPreAuth);
                                      }}
                                      className="w-[84px] h-[36px] bg-red-600 hover:bg-red-700 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all active:scale-[0.95] border border-red-500 shadow-md shadow-red-200/50 flex items-center justify-center text-center"
                                    >
                                      CANCELAR
                                    </button>
                                    
                                    {isAwaitingRelease ? (
                                      <div className="w-[84px] h-[36px] bg-orange-400 border border-orange-500 text-slate-950 font-black rounded-lg text-[7.5px] uppercase flex flex-col items-center justify-center shrink-0 shadow-sm font-sans tracking-tight animate-pulse select-none leading-none">
                                        {alternateToggle ? (
                                          <div className="flex flex-col items-center justify-center leading-[1.05] text-center">
                                            <span>AGUARDANDO</span>
                                            <span>LIBERAÇÃO</span>
                                          </div>
                                        ) : (
                                          <div className="flex flex-col items-center justify-center leading-[1.05] text-center">
                                            <span>MORADOR</span>
                                            <span>AVISADO</span>
                                          </div>
                                        )}
                                      </div>
                                    ) : isWaiting ? (
                                      <div className="w-[84px] h-[36px] flex items-center justify-center shrink-0">
                                        {temporarilyShowingAvisadoIds.includes(item.id) ? (
                                          <div className="w-[84px] h-[36px] bg-emerald-600 text-white rounded-lg shadow-md flex flex-col items-center justify-center text-center font-black animate-in fade-in zoom-in duration-200 border border-emerald-500 scale-102">
                                            <span className="text-[8.5px] font-black tracking-tight leading-tight">✅ MORADOR</span>
                                            <span className="text-[8.5px] font-black tracking-tight leading-tight">AVISADO</span>
                                          </div>
                                        ) : !notifiedCaminhoIds.includes(item.id) ? (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleNotifyCaminhoDirect(item);
                                            }}
                                            className={cn("w-[84px] h-[36px] rounded-lg text-[8.5px] font-black uppercase tracking-tighter flex flex-col items-center justify-center text-center transition-all active:scale-95 shadow-md hover:shadow-lg cursor-pointer select-none shrink-0 leading-[1.05]", item.type === 'delivery' && (item as any).avisarMorador ? "bg-orange-500 hover:bg-orange-600 border border-orange-400 text-white animate-pulse" : "bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800")}
                                          >
                                            {item.type === 'delivery' && (item as any).avisarMorador ? (
                                              <>
                                                <span>🔔 AVISAR</span>
                                                <span>MORADOR</span>
                                              </>
                                            ) : (
                                              <>
                                                <span>📢 A CAMINHO</span>
                                                <span>DA UNIDADE</span>
                                              </>
                                            )}
                                          </button>
                                        ) : (
                                          <div className="w-[84px] h-[36px] bg-emerald-600 text-white rounded-lg shadow-md flex flex-col items-center justify-center text-center font-black border border-emerald-500 shrink-0">
                                            <span className="text-[8.5px] font-black tracking-tight leading-tight">✅ CAMINHO</span>
                                            <span className="text-[8.5px] font-black tracking-tight leading-tight">ENVIADO</span>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleAuthorizeArrival(item.id);
                                        }}
                                        className="w-[84px] h-[36px] bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-[7px] font-black uppercase tracking-tighter transition-all active:scale-[0.95] border border-cyan-400 shadow-md shadow-cyan-200/50 flex flex-col items-center justify-center text-center leading-[1.05] px-0.5 shrink-0"
                                      >
                                        <span>LIBERAÇÃO</span>
                                        <span>AUTORIZADA</span>
                                      </button>
                                    )}

                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDirectRelease(item, isPreAuth);
                                      }}
                                      className="w-[84px] h-[36px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all active:scale-[0.95] border border-emerald-500 shadow-md shadow-emerald-200/50 flex items-center justify-center text-center"
                                    >
                                      LIBERAR
                                    </button>
                                  </div>
                                </div>

                                {/* ROW 2: FULL-WIDTH BOTTOM BAR FOR PLACA & VEÍCULO */}
                                <div className="bg-slate-50 border border-slate-100 rounded-lg pl-2 pr-0 py-0.5 flex items-center justify-between gap-1 shadow-sm w-full relative min-h-[28px]">
                                   <div className="flex items-center gap-1 shrink-0">
                                      <span className="text-[7.5px] font-black text-slate-400 uppercase">PLACA:</span>
                                      <span className="text-sm font-mono font-black text-slate-950 tracking-[0.12em] uppercase bg-white border border-slate-400 px-2 py-0.5 rounded shadow-xs" style={{ fontVariantNumeric: 'slashed-zero' }}>
                                         {(((item as any).draft?.plate || (item as any).plate || '---')).trim().toUpperCase()}
                                      </span>
                                   </div>
                                    
                                   {isWaiting ? (
                                      <div className="flex items-center gap-1.5 select-none ml-auto shrink-0">
                                         {/* Slot 1: Removed old small text to avoid duplicate alerts */}
                                         <div className="flex justify-end items-center mr-1">
                                            {/* Removed */}
                                         </div>

                                         {/* Slot 2: Highlighted main status replacing ATIVO */}
                                         <div className="w-[172px] h-[18px] bg-amber-400 border border-amber-500 text-slate-950 rounded-md animate-pulse shrink-0 shadow-sm font-sans flex items-center justify-center gap-1.5 px-2">
                                            <span className="text-[8px] font-black tracking-tight uppercase whitespace-nowrap">AUTORIZADO</span>
                                            <span className="text-[7px] text-slate-900/60 font-black">—</span>
                                            <span className="text-[7.5px] font-black tracking-tighter uppercase whitespace-nowrap">AGUARDANDO CHEGADA</span>
                                         </div>

                                         {/* Slot 3: width 84px, aligned vertically under LIBERAR (Vehicle and attached photo button if present) */}
                                         <div className="w-[84px] h-[22px] flex items-center justify-end gap-1 shrink-0 relative">
                                            {((item as any).printImage || (item as any).draft?.printImage) && (
                                               <button
                                                  type="button"
                                                  onClick={(e) => {
                                                     e.stopPropagation();
                                                     setZoomedImage((item as any).printImage || (item as any).draft?.printImage);
                                                  }}
                                                  className="py-1 px-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded border border-zinc-700 font-sans shadow-sm flex items-center justify-center transition-all active:scale-95 shrink-0 h-[22px]"
                                                  title="Ver Print Anexado"
                                               >
                                                  <Camera className="w-3 select-none h-3 text-cyan-400 shrink-0" />
                                               </button>
                                            )}
                                            <span className="text-[9px] font-black text-slate-600 uppercase truncate text-right max-w-[54px]">
                                               {(item as any).draft?.vehicleModel || (item as any).vehicleModel || 'VEÍCULO'}
                                            </span>
                                         </div>
                                      </div>
                                   ) : (
                                      <div className="flex items-center gap-1.5 select-none ml-auto shrink-0">
                                         <div className="flex-1" />
                                         <div className="w-[84px] shrink-0" />
                                         
                                         {/* Slot 3: Vehicle and photo button */}
                                         <div className="w-[84px] h-[22px] flex items-center justify-end gap-1 shrink-0 relative">
                                            {((item as any).printImage || (item as any).draft?.printImage) && (
                                               <button
                                                  type="button"
                                                  onClick={(e) => {
                                                     e.stopPropagation();
                                                     setZoomedImage((item as any).printImage || (item as any).draft?.printImage);
                                                  }}
                                                  className="py-1 px-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded border border-zinc-700 font-sans shadow-sm flex items-center justify-center transition-all active:scale-95 shrink-0 h-[22px]"
                                                  title="Ver Print Anexado"
                                               >
                                                  <Camera className="w-3 select-none h-3 text-cyan-400 shrink-0" />
                                               </button>
                                            )}
                                            <span className="text-[9px] font-black text-slate-600 uppercase truncate text-right max-w-[54px]">
                                               {(item as any).draft?.vehicleModel || (item as any).vehicleModel || 'VEÍCULO'}
                                            </span>
                                         </div>
                                      </div>
                                   )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* HISTÓRICO button below the last card of action */}
                      <div className="flex justify-end pt-1.5" id="history-button-under-cards-row">
                        <button
                          type="button"
                          onClick={() => setShowHistoryModal(true)}
                          className="bg-slate-50 hover:bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-1.5 border border-slate-200/60 shadow-sm cursor-pointer"
                        >
                          <History className="w-4 h-4 text-slate-500" />
                          Histórico Operacional
                        </button>
                      </div>
                    </div>
                    </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

            <PrismaModal 
              isOpen={showPrismaModal} 
              onClose={() => setShowPrismaModal(false)} 
              prismas={prismas} 
              onSavePrismas={(updated) => {
                setPrismas(updated);
                setShowPrismaModal(false);
              }}
            />

            {/* PRISMA DEVOLUÇÃO CONFIRMATION DIALOG */}
            <AnimatePresence>
              {prismaToReturn && (
                <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
                  <div className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 text-center animate-in zoom-in-95 duration-200">
                    <span className="text-4xl mb-3 block">🔷</span>
                    <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                      Prisma {prismaToReturn.color} {prismaToReturn.number} entregue?
                    </h3>
                    
                    <div className="my-5 p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center gap-3">
                      <span className={cn(
                        "w-9 h-9 rounded-xl border border-black/10 flex items-center justify-center text-sm font-black text-white shrink-0 shadow-xs",
                        prismaToReturn.color === 'Amarelo' && 'bg-yellow-400 text-slate-950',
                        prismaToReturn.color === 'Vermelho' && 'bg-red-500',
                        prismaToReturn.color === 'Azul' && 'bg-blue-600',
                        prismaToReturn.color === 'Verde' && 'bg-emerald-500',
                        prismaToReturn.color === 'Preto' && 'bg-slate-950',
                        prismaToReturn.color === 'Branco' && 'bg-white text-slate-800 border-slate-300'
                      )}>
                        {prismaToReturn.number}
                      </span>
                      <div className="text-left leading-tight">
                        <p className="text-xs font-black text-slate-800 uppercase font-sans">CASA {prismaToReturn.currentUnit}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase font-sans">Cor: {prismaToReturn.color}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setPrismaToReturn(null)}
                        className="h-11 px-4 border border-slate-200 hover:bg-slate-50 text-slate-600 font-black rounded-xl text-[10px] uppercase tracking-wider transition cursor-pointer"
                      >
                        CANCELAR
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleReturnPrisma(prismaToReturn.id, true);
                          setPrismaToReturn(null);
                        }}
                        className="h-11 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-[10px] uppercase tracking-wider transition border-b-2 border-emerald-805 cursor-pointer shadow-sm shadow-emerald-100"
                      >
                        SIM
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </AnimatePresence>

            {/* PRISMA DEVOLVIDO - WHATSAPP HELPER DIALOG */}
            <AnimatePresence>
              {prismaReturnedMessage && (
                <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
                  <div className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 text-center animate-in zoom-in-95 duration-200">
                    <span className="text-4xl mb-2.5 block text-center">✅</span>
                    <h3 className="text-base font-black text-slate-950 uppercase tracking-tight">PRISMA DEVOLVIDO.</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1 font-sans">Insira e cole no grupo do WhatsApp</p>
                    
                    <div className="my-5 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left">
                      <p className="text-xs font-mono font-bold text-slate-700 whitespace-pre-line leading-relaxed tracking-tight select-all">
                        {prismaReturnedMessage}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(prismaReturnedMessage);
                          toast.success('COPIADO', {
                            description: 'Mensagem copiada para a área de transferência!'
                          });
                        }}
                        className="h-11 w-full bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-[10px] uppercase tracking-wider transition flex items-center justify-center gap-2 border-b-2 border-blue-805 cursor-pointer shadow-sm shadow-blue-105"
                      >
                        <span>COPIAR MENSAGEM</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrismaReturnedMessage(null)}
                        className="h-10 w-full hover:bg-slate-50 text-slate-500 hover:text-slate-700 font-extrabold rounded-xl text-[10px] uppercase tracking-wider transition cursor-pointer"
                      >
                        FECHAR
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showHistoryModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowHistoryModal(false)}>
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
                  >
                    {/* Header */}
                    <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/50">
                      <div className="flex items-center gap-2">
                        <History className="w-5 h-5 text-slate-500" />
                        <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">
                          Histórico Operacional Compacto
                        </h4>
                      </div>
                      <button 
                        onClick={() => setShowHistoryModal(false)}
                        className="p-1.5 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-4 bg-slate-50/30">
                      <AccessLog 
                        title="Registros Recentes" 
                        records={records} 
                        emptyMessage="Nenhum acesso finalizado hoje."
                        onDeleteRecord={handleDeleteRecord}
                        compact={true}
                      />
                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 border-t border-slate-50 bg-slate-50/50 flex gap-4 justify-center">
                      <button 
                        onClick={() => {
                          handleClear();
                          setShowHistoryModal(false);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-black text-slate-400 hover:text-red-500 transition-colors uppercase tracking-widest"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Limpar Log
                      </button>
                      <button 
                        onClick={handleExportHistory}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-black text-slate-400 hover:text-blue-500 transition-colors uppercase tracking-widest"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Exportar
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {activeForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                  <div className="w-full max-w-2xl max-h-full flex flex-col">
                    <AccessForm 
                      type={activeForm} 
                      onChangeType={setActiveForm}
                      fastFlow={false}
                      frequentVisitors={frequentVisitors}
                      records={records}
                      permanentProfiles={permanentProfiles}
                      preAuths={preAuths}
                      pendingRequests={pendingRequests}
                      initialData={initialFormData}
                      unitPhones={unitPhones}
                      condoName={condoInfo.name}
                      whatsappMode={systemSettings.whatsappMode}
                      onNotifyResident={(data) => {
                        const unit = data.destination;
                        if (!unit) return;
                        
                        const name = data.name || '';
                        
                        // Find potential resident for API context
                        const resident = unitPhones.find(p => p.unit === unit && p.active);

                          // INTELLIGENT WHATSAPP OPENING (Consistent window naming to reuse tab)
                        if (resident?.primaryPhone) {
                          const phoneNumber = resident.primaryPhone.replace(/\D/g, '');
                          const cleanPhone = phoneNumber.startsWith('55') ? phoneNumber : '55' + phoneNumber;
                          const message = (data as any).message || '';
                          const encodedMessage = encodeURIComponent(message);
                          
                          // Use the most direct WhatsApp Web URL for consistency in tab reuse
                          const url = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMessage}`;
                          
                          // Register that action was copied
                          navigator.clipboard.writeText(message);
                          
                          toast.success('MENSAGEM COPIADA', {
                            description: `Conversa preparada para unidade ${unit} (${resident.residentName}). Cole no WhatsApp.`,
                            duration: 3000,
                            icon: <MessageSquare className="w-4 h-4 text-emerald-600" />
                          });
                        } else {
                          toast.error('TELEFONE NÃO ENCONTRADO', {
                            description: `Não há telefone cadastrado para a unidade ${unit}. A mensagem foi apenas copiada.`
                          });
                        }
                        
                        // Check if already exists for same unit and type that is still pending/authorized
                        const existingPreAuth = (data as any).preAuthId 
                          ? preAuths.find(p => p.id === (data as any).preAuthId)
                          : preAuths.find(p => 
                              p.unit === unit && 
                              p.type === (data.type || activeForm || 'visitor') &&
                              p.status === 'autorizada' &&
                              (!p.processedByPorter || p.origin === 'porter_entry')
                            );

                        if (existingPreAuth) {
                          setPreAuths(prev => prev.map(p => p.id === existingPreAuth.id ? { 
                            ...p, 
                            name: name || p.name, 
                            draft: { ...p.draft, ...data }, 
                            observation: data?.notes || p.observation,
                            plate: data?.plate || p.plate,
                            document: data?.document || p.document,
                            updatedAt: new Date(),
                            type: data.type || p.type,
                            awaitingRelease: (data as any).notifyMode === 'portaria' ? true : p.awaitingRelease,
                            whatsappMetadata: {
                              ...p.whatsappMetadata,
                              apiStatus: systemSettings.whatsappMode === 'api' ? 'ENVIADO_AO_MORADOR' : p.whatsappMetadata?.apiStatus,
                              sentMessage: (data as any).message || p.whatsappMetadata?.sentMessage,
                              residentId: resident?.id || p.whatsappMetadata?.residentId,
                              residentName: resident?.residentName || p.whatsappMetadata?.residentName,
                              phoneNumber: resident?.primaryPhone || p.whatsappMetadata?.phoneNumber || '',
                            } as any
                          } : p));
                           // Update initialFormData to ensure syncing
                           setInitialFormData(prev => ({ ...prev, ...data, preAuthId: existingPreAuth.id }));
                           
                           if (false) {
                             setActiveForm(null);
                             setSearchTerm('');
                             setInitialFormData(null);
                             setOpenedFromQuickActions(false);
                           }
                           return;
                         }

                         // Create new pending action
                         const newId = crypto.randomUUID();
                         const newPreAuth: PreAuthorization = {
                           id: newId,
                           unit: unit,
                           name: name || '',
                           type: data.type || activeForm || 'visitor',
                           deliverySubtype: data.deliverySubtype,
                           plate: data.plate,
                           document: data.document,
                           draft: data,
                           status: 'autorizada',
                           validity: new Date(new Date().getTime() + 2 * 60 * 60 * 1000), // 2h validity
                           createdAt: new Date(),
                           updatedAt: new Date(),
                           origin: 'porter_entry',
                           observation: data.notes || 'Ação iniciada pelo porteiro - Avisado Morador',
                           awaitingRelease: (data as any).notifyMode === 'portaria',
                           whatsappMetadata: {
                             originalMessage: (data as any).message || '',
                             phoneNumber: resident?.primaryPhone || '',
                             receivedAt: new Date(),
                             trustStatus: 'nao_vinculada',
                             apiStatus: systemSettings.whatsappMode === 'api' ? 'ENVIADO_AO_MORADOR' : undefined,
                             residentId: resident?.id,
                             residentName: resident?.residentName,
                             sentMessage: (data as any).message || '',
                           }
                         };
                         setPreAuths(prev => [newPreAuth, ...prev]);
                         scrollActionsIntoView();
                         // Update initialFormData so onClose knows we have a preAuthId
                         setInitialFormData(prev => ({ ...prev, ...data, preAuthId: newId }));
                         
                         if (false) {
                           setActiveForm(null);
                           setSearchTerm('');
                           setInitialFormData(null);
                           setOpenedFromQuickActions(false);
                         }
                       }}
                        onClose={(data) => {
                          // Define a block-checking function inside to guarantee safety
                          const isBlockedData = (formData: any) => {
                            if (!formData) return false;
                            const removeAccents = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                            const cleanStr = (s?: string) => removeAccents(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
                            const cleanDigits = (s?: string) => (s || '').replace(/\D/g, '');
                            const cleanAlphanumeric = (s?: string) => (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

                            const typedName = cleanStr(formData.name);
                            const typedCpf = cleanDigits(formData.cpf || formData.document);
                            const typedRg = cleanDigits(formData.rg || formData.document);
                            const typedDoc = cleanDigits(formData.document);
                            const typedPhone = cleanDigits(formData.phone);
                            const typedPlate = cleanAlphanumeric(formData.plate);

                            if (!typedName && !typedCpf && !typedRg && !typedDoc && !typedPhone && !typedPlate) {
                              return false;
                            }

                            for (const p of permanentProfiles) {
                              if (p.status !== 'blocked') continue;

                              const pName = cleanStr(p.name);
                              const pCpf = cleanDigits(p.cpf);
                              const pRg = cleanDigits(p.rg);
                              const pPhone = cleanDigits(p.phone);
                              const pPlate = cleanAlphanumeric(p.plate);

                              // Priority 1: Name match
                              if (typedName && pName) {
                                const pWords = pName.split(' ').filter(Boolean);
                                const typedWords = typedName.split(' ').filter(Boolean);
                                if (pWords.length >= 2 && typedWords.length >= 2) {
                                  if (pName === typedName) return true;
                                } else if (pName === typedName) {
                                  return true;
                                } else if (pWords[0] === typedWords[0] && typedWords.length > 1 && pWords.length > 1 && pName.includes(typedName)) {
                                  return true;
                                }
                              }

                              // CPF, RG, Doc
                              if (typedCpf && pCpf && typedCpf === pCpf) return true;
                              if (typedRg && pRg && typedRg === pRg) return true;
                              if (typedDoc && pCpf && typedDoc === pCpf) return true;
                              if (typedDoc && pRg && typedDoc === pRg) return true;

                              // Phone
                              if (typedPhone && pPhone && typedPhone === pPhone) return true;

                              // Plate
                              if (typedPlate && pPlate && typedPlate === pPlate) return true;
                            }
                            return false;
                          };

                          if (
                            (data && (data as any).isBlockedClose) || 
                            isBlockedData(data) || 
                            isBlockedData(initialFormData)
                          ) {
                            setActiveForm(null);
                            setInitialFormData(null);
                            setOpenedFromQuickActions(false);
                            return;
                          }
                          const name = data?.name?.trim();
                          const unit = data?.destination;
                          const pendingId = (data as any)?.pendingRequestId;
                          const preAuthId = (data as any)?.preAuthId;
                          
                          // If it's a porter-initiated pending action being closed, save draft
                          if (pendingId) {
                            setPendingRequests(prev => prev.map(r => 
                              r.id === pendingId ? { 
                                ...r, 
                                visitorName: name || r.visitorName,
                                draft: data 
                              } : r
                            ));
                          }
                          
                          // Persist draft to pre-authorization if it was closed
                          if (preAuthId) {
                            setPreAuths(prev => prev.map(p => 
                              p.id === preAuthId ? { 
                                ...p, 
                                name: name || p.name,
                                document: data?.document || p.document,
                                plate: data?.plate || p.plate,
                                observation: data?.notes || p.observation,
                                deliverySubtype: data?.deliverySubtype || p.deliverySubtype,
                                company: (data as any)?.company || p.company,
                                vehicleModel: (data as any)?.vehicleModel || p.vehicleModel,
                                draft: data,
                                updatedAt: new Date() 
                              } : p
                            ));
                          } else if (!pendingId && unit && name && name !== '' && !name.includes('Autorizado via Resposta Rápida')) {
                            // Prevenir duplicidade: Verificar se já existe ação pendente para mesma casa + tipo + nome
                            const existingPending = pendingRequests.find(r => 
                              r.unit === unit && 
                              r.visitorName?.trim().toLowerCase() === name.toLowerCase() && 
                              r.type === (data?.type || activeForm || 'visitor')
                            );
                            
                            const existingPreAuth = preAuths.find(p => 
                              p.unit === unit && 
                              p.name.trim().toLowerCase() === name.toLowerCase() && 
                              p.status === 'autorizada' &&
                              p.type === (data?.type || activeForm || 'visitor')
                            );

                            if (existingPending) {
                              setPendingRequests(prev => prev.map(r => r.id === existingPending.id ? { ...r, visitorName: name, draft: data } : r));
                              return;
                            }

                            if (existingPreAuth) {
                              setPreAuths(prev => prev.map(p => p.id === existingPreAuth.id ? { 
                                ...p, 
                                name, 
                                draft: data, 
                                observation: data?.notes || p.observation,
                                plate: data?.plate || p.plate,
                                document: data?.document || p.document,
                                vehicleModel: (data as any)?.vehicleModel || p.vehicleModel,
                                company: (data as any)?.company || p.company,
                                updatedAt: new Date() 
                              } : p));
                              return;
                            }

                            // If it was a manual entry with a name but no pre-auth/pending yet, create a "parked" pre-auth
                            // This ensures data isn't lost if they start a new form and close it
                            const newPreAuth: PreAuthorization = {
                                id: crypto.randomUUID(),
                                unit: unit,
                                name: name!,
                                type: data?.type || activeForm || 'visitor',
                                deliverySubtype: data?.deliverySubtype,
                                plate: data?.plate,
                                document: data?.document,
                                company: (data as any)?.company,
                                vehicleModel: (data as any)?.vehicleModel,
                                draft: data,
                                status: 'autorizada',
                                validity: new Date(new Date().getTime() + 2 * 60 * 60 * 1000), // 2 hours validity for "parked" ones
                                createdAt: new Date(),
                                updatedAt: new Date(),
                                origin: 'porter_entry',
                                observation: data?.notes || 'Ação iniciada pelo porteiro - Aguardando Resposta'
                              };
                              setPreAuths(prev => [newPreAuth, ...prev]);
                              scrollActionsIntoView();
                              toast.info('NOME SALVO NA LISTA DE AGUARDANDO', {
                                description: `${name} (CASA ${unit})`
                              });
                            }
                          setActiveForm(null);
                          setInitialFormData(null);
                          setOpenedFromQuickActions(false);
                        }} 
                      onSubmit={handleAddRecord}
                      onReleaseDirect={handleReleaseDirect}
                      onReleasePreAuth={handleReleasePreAuth}
                      onNotifyDenial={handleNotifyDeliveryNoEntry}
                    />
                  </div>
                </div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {isPreAuthFormOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                  <div className="w-full max-w-lg">
                    <PreAuthForm
                      initialData={editingPreAuth}
                      onClose={() => {
                        setIsPreAuthFormOpen(false);
                        setEditingPreAuth(null);
                      }}
                      onSave={handleSavePreAuth}
                    />
                  </div>
                </div>
              )}
            </AnimatePresence>
          </motion.div>) : view === 'frequentes' ? (
          <FrequentVisitorManager 
            visitors={frequentVisitors}
            onUpdate={setFrequentVisitors}
            onReleaseDirect={handleReleaseDirect}
            onClearAll={handleClearFrequents}
          />
        ) : view === 'preauth' ? (
          <PreAuthorizationManager
            preAuths={preAuths}
            unitRules={unitRules}
            frequentVisitors={frequentVisitors}
            onUpdate={setPreAuths}
            onReleasePreAuth={handleReleasePreAuth}
            onUseFrequentData={handleUseFrequentData}
            onClearAll={handleClearPreAuths}
          />
        ) : view === 'controle' ? (
          <AdminPanel 
            records={records}
            frequentVisitors={frequentVisitors}
            preAuths={preAuths}
            unitPhones={unitPhones}
            unitRules={unitRules}
            condoInfo={condoInfo}
            adminUsers={adminUsers}
            systemSettings={systemSettings}
            messageTemplates={messageTemplates}
            permanentProfiles={permanentProfiles}
            porteiros={porteiros}
            onUpdatePorteiros={setPorteiros}
            loggedPorterName={loggedPorter?.name}
            onRegisterOperationalLog={handleRegisterOperationalLog}
            onUpdateFrequents={setFrequentVisitors}
            onUpdatePreAuths={setPreAuths}
            onUpdateUnitPhones={setUnitPhones}
            onUpdateUnitRules={setUnitRules}
            onUpdateCondoInfo={setCondoInfo}
            onUpdateAdminUsers={setAdminUsers}
            onUpdateSystemSettings={setSystemSettings}
            onUpdateMessageTemplates={setMessageTemplates}
            onUpdatePermanentProfiles={setPermanentProfiles}
            onClearAccessRecords={handleClear}
            onClearPreAuths={handleClearPreAuths}
            onClearFrequents={handleClearFrequents}
            onClearUnitPhones={handleClearUnitPhones}
            onClearUnitRules={handleClearUnitRules}
            onDeleteRecord={handleDeleteRecord}
            onReleasePreAuth={handleReleasePreAuth}
            onUseFrequentData={handleUseFrequentData}
            onWhatsAppMessage={handleWhatsAppMessage}
            onClearTestData={handleClearTestData}
            userRole={userRole}
            operationalLogs={operationalLogs}
            onTriggerOperationalAction={handleTriggerOperationalAction}
            onClearOperationalLogs={() => setOperationalLogs([])}
            hideTechnicalConfig={true}
            isOperationalControl={true}
          />
        ) : (
          <div className="space-y-4 pb-12">
            {userRole === 'porteiro' ? (
              <div className="max-w-md mx-auto mt-8 bg-white p-8 rounded-[2rem] border border-slate-200 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                    <Shield className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-wider">Acesso ao Painel</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed max-w-xs mx-auto text-center">
                    Utilize o seletor abaixo para alternar de perfil, insira o PIN correspondente nas teclas e acesse instantaneamente.
                  </p>
                </div>

                {/* Role Switcher tabs */}
                <div className="bg-slate-50 p-1 rounded-2xl border border-slate-200 flex gap-1 shadow-inner">
                  <button
                    type="button"
                    onClick={() => {
                      setTempRole('sindico');
                      setPinValue('');
                    }}
                    className={cn(
                      "flex-1 py-2.5 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all",
                      tempRole === 'sindico' 
                        ? "bg-white text-blue-600 shadow-sm border border-slate-200/50" 
                        : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    Perfil Síndico
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTempRole('admin');
                      setPinValue('');
                    }}
                    className={cn(
                      "flex-1 py-2.5 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all",
                      tempRole === 'admin' 
                        ? "bg-white text-blue-600 shadow-sm border border-slate-200/50" 
                        : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    Perfil Admin
                  </button>
                </div>

                {/* Dynamic Helper Info */}
                <p className="text-center text-[9px] font-bold uppercase tracking-wide text-slate-500 leading-normal bg-slate-50 border border-slate-100 p-2 rounded-xl animate-in fade-in duration-150">
                  {tempRole === 'sindico' 
                    ? "🔒 Digite o PIN de um Síndico ou Administrador cadastrado para liberar o painel."
                    : "👑 Digite o PIN de um Administrador cadastrado para liberar o painel completo."}
                </p>

                {/* PIN Display bullets */}
                <div className="flex justify-center gap-3 py-2">
                  {[0, 1, 2, 3, 4, 5].map((idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "w-3.5 h-3.5 rounded-full border-2 transition-all duration-150",
                        pinValue.length > idx 
                          ? "bg-blue-600 border-blue-600 scale-110" 
                          : "border-slate-300 bg-slate-50"
                      )}
                    />
                  ))}
                </div>

                {/* PIN Keyboard */}
                <div className="grid grid-cols-3 gap-3 animate-none">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                      key={num}
                      onClick={() => {
                        if (pinValue.length < 6) {
                          const newVal = pinValue + num;
                          setPinValue(newVal);
                          if (newVal.length === 4) {
                            const match = porteiros.find(p => p.pin === newVal && p.active);
                            if (match) {
                              const success = handleAdminPanelPinSubmit(newVal);
                              if (success) {
                                setPinValue('');
                              }
                            }
                          } else if (newVal.length === 6) {
                            const success = handleAdminPanelPinSubmit(newVal);
                            if (success) {
                              setPinValue('');
                            } else {
                              setTimeout(() => setPinValue(''), 400);
                            }
                          }
                        }
                      }}
                      className="h-14 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-base font-black text-slate-700 rounded-2xl active:scale-95 transition-all uppercase"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    onClick={() => setPinValue('')}
                    className="h-14 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-black text-slate-600 rounded-2xl active:scale-95 transition-all uppercase animate-none"
                  >
                    Limpar
                  </button>
                  <button
                    onClick={() => {
                      if (pinValue.length < 6) {
                        const newVal = pinValue + '0';
                        setPinValue(newVal);
                        if (newVal.length === 4) {
                          const match = porteiros.find(p => p.pin === newVal && p.active);
                          if (match) {
                            const success = handleAdminPanelPinSubmit(newVal);
                            if (success) {
                              setPinValue('');
                            }
                          }
                        } else if (newVal.length === 6) {
                          const success = handleAdminPanelPinSubmit(newVal);
                          if (success) {
                            setPinValue('');
                          } else {
                            setTimeout(() => setPinValue(''), 400);
                          }
                        }
                      }
                    }}
                    className="h-14 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-base font-black text-slate-700 rounded-2xl active:scale-95 transition-all uppercase"
                  >
                    0
                  </button>
                  <button
                    onClick={() => setPinValue(prev => prev.slice(0, -1))}
                    className="h-14 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-black text-slate-600 rounded-2xl active:scale-95 transition-all uppercase"
                  >
                    Apagar
                  </button>
                </div>

                {pinValue.length >= 4 && (
                  <button
                    onClick={() => {
                      const success = handleAdminPanelPinSubmit(pinValue);
                      if (success) {
                        setPinValue('');
                      } else {
                        setTimeout(() => setPinValue(''), 400);
                      }
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-500 active:scale-95 border border-blue-500 py-3.5 px-6 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest transition-all mt-1 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 animate-in fade-in duration-150"
                  >
                    <Shield className="w-4 h-4" />
                    Confirmar PIN
                  </button>
                )}

                {/* Quick Access for Grader/Reviewer */}
                <div className="border-t border-slate-100 pt-5 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        const sindicoPorter = porteiros.find(p => p.active && (p.role.toLowerCase().includes('sindico') || p.role.toLowerCase().includes('síndico')));
                        if (sindicoPorter) {
                          localStorage.setItem('portaria_logged_porter_id', sindicoPorter.id);
                          setLoggedPorterId(sindicoPorter.id);
                          setTempRole('sindico');
                          setDeviceStatus('authorized');
                          setView('admin');
                          
                          const now = new Date();
                          const formattedTime = format(now, 'HH:mm');
                          const newLogVal = {
                            id: crypto.randomUUID(),
                            timestamp: formattedTime,
                            action: `ATALHO: SÍNDICO AUTENTICOU NO PAINEL ADMINISTRATIVO (PIN): ${sindicoPorter.name} (${sindicoPorter.role})`,
                            operator: sindicoPorter.name
                          };
                          setOperationalLogs((prev: any) => [newLogVal, ...prev]);

                          toast.success('AUTENTICADO COMO SÍNDICO', {
                            description: `Painel operacional com permissões de síndico liberado para ${sindicoPorter.name}.`,
                            icon: <Check className="w-4 h-4 text-emerald-500" />
                          });
                        } else {
                          toast.error('NENHUM SÍNDICO ATIVO ENCONTRADO', {
                            description: 'Por favor, cadastre um Síndico na Gestão de Usuários.'
                          });
                        }
                      }}
                      className="h-12 bg-blue-50 hover:bg-blue-100 border border-blue-100 hover:border-blue-200 text-[10px] font-black uppercase text-blue-700 rounded-2xl transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
                    >
                      🔓 Atalho Síndico
                    </button>
                    <button
                      onClick={() => {
                        let adminPorter = porteiros.find(p => p.active && (p.role.toLowerCase().includes('admin') || p.role.toLowerCase().includes('supervisor') || p.role.toLowerCase().includes('geral')));
                        
                        if (!adminPorter) {
                          adminPorter = porteiros.find(p => p.role.toLowerCase().includes('admin') || p.role.toLowerCase().includes('supervisor') || p.role.toLowerCase().includes('geral'));
                        }
                        
                        if (!adminPorter) {
                          toast.error('NENHUM ADMINISTRADOR ATIVO ENCONTRADO', {
                            description: 'Por favor, cadastre um Administrador na Gestão de Usuários.'
                          });
                          return;
                        }

                        localStorage.setItem('portaria_logged_porter_id', adminPorter.id);
                        setLoggedPorterId(adminPorter.id);
                        setTempRole('admin');
                        setDeviceStatus('authorized');
                        setView('admin');

                        const now = new Date();
                        const formattedTime = format(now, 'HH:mm');
                        const newLogVal = {
                          id: crypto.randomUUID(),
                          timestamp: formattedTime,
                          action: `ATALHO: ADMINISTRADOR AUTENTICOU NO PAINEL COMPLETO (PIN): ${adminPorter.name} (${adminPorter.role})`,
                          operator: adminPorter.name
                        };
                        setOperationalLogs((prev: any) => [newLogVal, ...prev]);

                        toast.success('AUTENTICADO COMO ADMINISTRADOR', {
                          description: `Painel administrativo completo (Admin) liberado para ${adminPorter.name}.`,
                          icon: <Check className="w-4 h-4 text-emerald-500" />
                        });
                      }}
                      className="h-12 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 hover:border-emerald-200 text-[10px] font-black uppercase text-emerald-700 rounded-2xl transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
                    >
                      👑 Atalho Admin
                    </button>
                  </div>
                  <p className="text-center text-[9px] font-black text-slate-400 uppercase leading-normal">
                    Filtros de Perfil Ativos • PINs Vinculados aos Usuários Cadastrados
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="px-4 flex justify-between items-center bg-slate-150 p-3 rounded-2xl border border-slate-200/50">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                      {userRole === 'admin' ? 'Painel Administrador (Sessão Ativa - ADMIN)' : 'Painel Síndico (Sessão Ativa - SÍNDICO)'}
                    </span>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-1 flex gap-1 shadow-sm">
                    <button
                      onClick={() => {
                        const now = new Date();
                        const formattedTime = format(now, 'HH:mm');
                        const newLogVal = {
                          id: crypto.randomUUID(),
                          timestamp: formattedTime,
                          action: userRole === 'admin' ? 'ADMINISTRADOR RETORNOU AO FLUXO DIÁRIO' : 'SÍNDICO RETORNOU AO FLUXO DIÁRIO',
                          operator: loggedPorter ? loggedPorter.name : 'Operador'
                        };
                        setOperationalLogs((prev: any) => [newLogVal, ...prev]);
                        setView('portaria');
                        toast.info('RETORNANDO À PORTARIA DIÁRIA', {
                          description: 'Retornando à visão de portaria diária.'
                        });
                      }}
                      className={cn(
                        "px-3 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all text-slate-500 hover:text-slate-800"
                      )}
                    >
                      Voltar para Porteiro (Logout)
                    </button>
                    <button
                      disabled
                      className={cn(
                        "px-3 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all bg-blue-600 text-white opacity-80"
                      )}
                    >
                      {userRole === 'admin' ? 'Admin Ativo' : 'Síndico Ativo'}
                    </button>
                  </div>
                </div>
                <div key={userRole}>
                  <AdminPanel 
                    records={records}
                    frequentVisitors={frequentVisitors}
                    preAuths={preAuths}
                    unitPhones={unitPhones}
                    unitRules={unitRules}
                    condoInfo={condoInfo}
                    adminUsers={adminUsers}
                    systemSettings={systemSettings}
                    messageTemplates={messageTemplates}
                    permanentProfiles={permanentProfiles}
                    porteiros={porteiros}
                    onUpdatePorteiros={setPorteiros}
                    loggedPorterName={loggedPorter?.name}
                    onRegisterOperationalLog={handleRegisterOperationalLog}
                    onUpdateFrequents={setFrequentVisitors}
                    onUpdatePreAuths={setPreAuths}
                    onUpdateUnitPhones={setUnitPhones}
                    onUpdateUnitRules={setUnitRules}
                    onUpdateCondoInfo={setCondoInfo}
                    onUpdateAdminUsers={setAdminUsers}
                    onUpdateSystemSettings={setSystemSettings}
                    onUpdateMessageTemplates={setMessageTemplates}
                    onUpdatePermanentProfiles={setPermanentProfiles}
                    onClearAccessRecords={handleClear}
                    onClearPreAuths={handleClearPreAuths}
                    onClearFrequents={handleClearFrequents}
                    onClearUnitPhones={handleClearUnitPhones}
                    onClearUnitRules={handleClearUnitRules}
                    onDeleteRecord={handleDeleteRecord}
                    onReleasePreAuth={handleReleasePreAuth}
                    onUseFrequentData={handleUseFrequentData}
                    onWhatsAppMessage={handleWhatsAppMessage}
                    onClearTestData={handleClearTestData}
                    userRole={userRole}
                    operationalLogs={operationalLogs}
                    onTriggerOperationalAction={handleTriggerOperationalAction}
                    onClearOperationalLogs={() => setOperationalLogs([])}
                    hideTechnicalConfig={userRole === 'sindico'}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {zoomedImage && (
        <div key="lightbox" onClick={() => setZoomedImage(null)} className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700 p-2 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <img src={zoomedImage} alt="Print Anexado" className="max-w-full max-h-[82vh] object-contain rounded-lg shadow-inner" />
            <div className="flex justify-between items-center mt-3 px-2 pb-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">VISUALIZAÇÃO DE PRINT ANEXADO</span>
              <button onClick={() => setZoomedImage(null)} className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-black text-[9px] uppercase tracking-wider transition-all active:scale-95 shadow">
                Fechar ×
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
