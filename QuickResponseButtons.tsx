import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AccessRecord, FrequentVisitor, PreAuthorization, AccessType, DeliverySubtype, AccessRule, PreAuthStatus, UnitPhone, UnitRules, CondoInfo, AdminUser, SystemSettings, MessageTemplates, PermanentProfile, Porteiro } from '../types';
import { WhatsAppService, WhatsAppMessage } from '../services/WhatsAppService';
import { UnitPhoneManager } from './UnitPhoneManager';
import { UnitRulesManager } from './UnitRulesManager';
import { PorterManager } from './PorterManager';
import { toast } from '../lib/toast';
import { 
  LayoutDashboard, 
  History, 
  Home, 
  Users, 
  Calendar, 
  Search, 
  Filter, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Zap, 
  Shield, 
  ShieldAlert, 
  Bike, 
  User, 
  Wrench,
  Car,
  ChevronRight,
  MoreVertical,
  Download,
  Trash2,
  FileText,
  Table as TableIcon,
  BarChart3,
  TrendingUp,
  MapPin,
  MessageSquare,
  Send,
  Phone,
  Settings,
  Building,
  Sliders,
  Save,
  UserPlus,
  Power,
  Check,
  X,
  Edit2,
  ShieldCheck,
  Smartphone,
  ToggleLeft as ToggleIcon,
  LayoutList,
  FileJson,
  Lock,
  Unlock,
  ClipboardList,
  Star,
  Plus,
  Truck
} from 'lucide-react';
import { format, isToday, startOfDay, endOfDay, isWithinInterval, subDays, startOfMonth, subWeeks } from 'date-fns';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import { cn } from '../lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line
} from 'recharts';
import { FrequentVisitorManager } from './FrequentVisitorManager';
import { PreAuthorizationManager } from './PreAuthorizationManager';
import { OperationalControl, OperationalLog } from './OperationalControl';
import { SecurityCenter } from './SecurityCenter';

interface AdminPanelProps {
  records: AccessRecord[];
  frequentVisitors: FrequentVisitor[];
  preAuths: PreAuthorization[];
  unitPhones: UnitPhone[];
  unitRules: UnitRules[];
  condoInfo: CondoInfo;
  adminUsers: AdminUser[];
  systemSettings: SystemSettings;
  messageTemplates: MessageTemplates;
  permanentProfiles?: PermanentProfile[];
  porteiros: Porteiro[];
  onUpdatePorteiros: (porteiros: Porteiro[]) => void;
  loggedPorterName?: string;
  onRegisterOperationalLog: (action: string) => void;
  onUpdateFrequents: (visitors: FrequentVisitor[]) => void;
  onUpdatePreAuths: (preAuths: PreAuthorization[]) => void;
  onUpdateUnitPhones: (phones: UnitPhone[]) => void;
  onUpdateUnitRules: (rules: UnitRules[]) => void;
  onUpdateCondoInfo: (info: CondoInfo) => void;
  onUpdateAdminUsers: (users: AdminUser[]) => void;
  onUpdateSystemSettings: (settings: SystemSettings) => void;
  onUpdateMessageTemplates: (templates: MessageTemplates) => void;
  onUpdatePermanentProfiles?: (profiles: PermanentProfile[]) => void;
  onClearAccessRecords?: () => void;
  onClearPreAuths?: () => void;
  onClearFrequents?: () => void;
  onClearUnitPhones?: () => void;
  onClearUnitRules?: () => void;
  onDeleteRecord?: (id: string) => void;
  onReleasePreAuth?: (preAuth: PreAuthorization) => void;
  onUseFrequentData?: (preAuth: PreAuthorization, visitor: FrequentVisitor) => void;
  onWhatsAppMessage?: (message: WhatsAppMessage) => void;
  onClearTestData?: () => void;
  userRole?: 'porteiro' | 'sindico' | 'admin';
  operationalLogs?: OperationalLog[];
  onTriggerOperationalAction?: (actionId: 'stuck' | 'ocr' | 'reload' | 'waiting') => void;
  onClearOperationalLogs?: () => void;
  hideTechnicalConfig?: boolean;
  isOperationalControl?: boolean;
}

interface RestrictedScreenProps {
  onBack: () => void;
  areaName: string;
}

function RestrictedScreen({ onBack, areaName }: RestrictedScreenProps) {
  return (
    <div className="bg-rose-50 border border-rose-200 p-8 rounded-3xl text-center space-y-4 max-w-xl mx-auto shadow-sm my-8">
      <div className="w-16 h-16 bg-rose-100/80 text-rose-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-black text-rose-950 uppercase tracking-widest leading-none">ACESSO RESTRITO AO ADMINISTRADOR</h3>
      <p className="text-[11px] font-bold text-rose-600 uppercase max-w-md mx-auto leading-relaxed">
        A área "{areaName}" contém recursos exclusivos do administrador do sistema e não está disponível para o seu perfil de acesso atual.
      </p>
      <div className="pt-2">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-sm"
        >
          Voltar ao Painel
        </button>
      </div>
    </div>
  );
}

type AdminSubView = 'dashboard' | 'history' | 'banco_entregadores' | 'banco_visitantes' | 'units' | 'frequents' | 'preauths' | 'whatsapp' | 'phones' | 'rules' | 'reports' | 'config' | 'emergencia' | 'porteiros' | 'security_center';

export function AdminPanel({ 
  records, 
  frequentVisitors, 
  preAuths, 
  unitPhones,
  unitRules,
  condoInfo,
  adminUsers,
  systemSettings,
  messageTemplates,
  permanentProfiles = [],
  porteiros,
  onUpdatePorteiros,
  loggedPorterName = '',
  onRegisterOperationalLog,
  onUpdateFrequents, 
  onUpdatePreAuths,
  onUpdateUnitPhones,
  onUpdateUnitRules,
  onUpdateCondoInfo,
  onUpdateAdminUsers,
  onUpdateSystemSettings,
  onUpdateMessageTemplates,
  onUpdatePermanentProfiles = () => {},
  onClearAccessRecords,
  onClearPreAuths,
  onClearFrequents,
  onClearUnitPhones,
  onClearUnitRules,
  onDeleteRecord,
  onReleasePreAuth,
  onUseFrequentData,
  onWhatsAppMessage,
  onClearTestData,
  userRole = 'porteiro',
  operationalLogs = [],
  onTriggerOperationalAction = () => {},
  onClearOperationalLogs = () => {},
  hideTechnicalConfig = false,
  isOperationalControl = false
}: AdminPanelProps) {
  const [subView, setSubView] = useState<AdminSubView>('emergencia');
  const isReadOnly = false; // Enable all buttons as requested by user
  const currentTabIsReadOnly = false;
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  }, [subView]);

  // --- ESTADOS PARA BANCO DE ENTREGADORES E VISITANTES PERMANENTES ---
  const [entregadorSearch, setEntregadorSearch] = useState('');
  const [entregadorCompanyFilter, setEntregadorCompanyFilter] = useState('all');
  
  const [visitanteSearch, setVisitanteSearch] = useState('');
  const [visitanteUnitFilter, setVisitanteUnitFilter] = useState('all');

  // Modal de gerenciamento de perfil permanente
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<PermanentProfile | null>(null);
  const [profileFormType, setProfileFormType] = useState<AccessType>('delivery');

  // Campos do formulário
  const [profileFormName, setProfileFormName] = useState('');
  const [profileFormCpf, setProfileFormCpf] = useState('');
  const [profileFormRg, setProfileFormRg] = useState('');
  const [profileFormPhone, setProfileFormPhone] = useState('');
  const [profileFormPlate, setProfileFormPlate] = useState('');
  const [profileFormVehicleModel, setProfileFormVehicleModel] = useState('');
  const [profileFormVehicleColor, setProfileFormVehicleColor] = useState('');
  const [profileFormCompany, setProfileFormCompany] = useState('');
  const [profileFormRelationship, setProfileFormRelationship] = useState('');
  const [profileFormUnit, setProfileFormUnit] = useState('');
  const [profileFormNotes, setProfileFormNotes] = useState('');
  const [profileFormTrust, setProfileFormTrust] = useState<number>(5);
  const [profileFormPlatesList, setProfileFormPlatesList] = useState<string[]>([]);
  const [newPlateInput, setNewPlateInput] = useState('');

  // --- NEW WORKFLOWS FOR FREQUENT VISITORS AND VISITOR BLOCKING ---
  const [isFrequenteModalOpen, setIsFrequenteModalOpen] = useState(false);
  const [selectedProfileForFrequente, setSelectedProfileForFrequente] = useState<PermanentProfile | null>(null);
  const [frequenteUnitInput, setFrequenteUnitInput] = useState('');
  const [frequenteRule, setFrequenteRule] = useState<'AVISAR_ANTES' | 'SEMPRE_LIBERADO'>('AVISAR_ANTES');

  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [selectedProfileForBlock, setSelectedProfileForBlock] = useState<PermanentProfile | null>(null);
  const [blockReasonInput, setBlockReasonInput] = useState('');

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState<PermanentProfile | null>(null);

  // Resolver inteligente para calcular métricas acumuladas (histórico + cadastro)
  const getProfileStats = (profile: PermanentProfile) => {
    const normName = profile.name.toLowerCase().trim();
    const cleanCpf = profile.cpf ? profile.cpf.replace(/\D/g, '') : '';
    const cleanRg = profile.rg ? profile.rg.toUpperCase().trim() : '';

    const matchingHistory = records.filter(r => {
      const rCpf = r.cpf ? r.cpf.replace(/\D/g, '') : '';
      const rRg = r.rg ? r.rg.toUpperCase().trim() : '';
      const rName = r.name.toLowerCase().trim();

      if (cleanCpf && rCpf && cleanCpf === rCpf) return true;
      if (cleanRg && rRg && cleanRg === rRg) return true;
      return rName === normName;
    });

    const accessCount = Math.max(profile.count || 0, matchingHistory.length);
    
    let firstVisit = profile.createdAt;
    let lastVisit = profile.updatedAt || profile.createdAt;

    if (matchingHistory.length > 0) {
      const sortedHistory = [...matchingHistory].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      firstVisit = sortedHistory[0].timestamp.toISOString();
      lastVisit = sortedHistory[sortedHistory.length - 1].timestamp.toISOString();
    }

    const uniqueUnits = Array.from(new Set([
      ...matchingHistory.map(h => h.destination),
      profile.unit ? profile.unit : ''
    ].filter(Boolean)));

    const uniquePlates = Array.from(new Set([
      ...matchingHistory.map(h => h.plate).filter(Boolean),
      profile.plate ? profile.plate : '',
      ...(profile.platesHistory || [])
    ].map(p => p.toUpperCase().trim()).filter(Boolean)));

    return {
      accessCount,
      firstVisit: new Date(firstVisit),
      lastVisit: new Date(lastVisit),
      visitedUnits: uniqueUnits,
      allPlates: uniquePlates
    };
  };

  const handleOpenProfileAdd = (type: AccessType) => {
    setEditingProfile(null);
    setProfileFormType(type);
    setProfileFormName('');
    setProfileFormCpf('');
    setProfileFormRg('');
    setProfileFormPhone('');
    setProfileFormPlate('');
    setProfileFormVehicleModel('');
    setProfileFormVehicleColor('');
    setProfileFormCompany('');
    setProfileFormRelationship('');
    setProfileFormUnit('');
    setProfileFormNotes('');
    setProfileFormTrust(5);
    setProfileFormPlatesList([]);
    setNewPlateInput('');
    setIsProfileModalOpen(true);
  };

  const handleOpenProfileEdit = (profile: PermanentProfile) => {
    setEditingProfile(profile);
    setProfileFormType(profile.type);
    setProfileFormName(profile.name);
    setProfileFormCpf(profile.cpf || '');
    setProfileFormRg(profile.rg || '');
    setProfileFormPhone(profile.phone || '');
    setProfileFormPlate(profile.plate || '');
    setProfileFormVehicleModel(profile.vehicleModel || '');
    setProfileFormVehicleColor(profile.vehicleColor || '');
    setProfileFormCompany(profile.company || '');
    setProfileFormRelationship(profile.relationship || '');
    setProfileFormUnit(profile.unit || '');
    setProfileFormNotes(profile.notes || (profile as any).observation || '');
    setProfileFormTrust(typeof (profile as any).trust === 'number' ? (profile as any).trust : 5);
    setProfileFormPlatesList(profile.platesHistory || (profile.plate ? [profile.plate] : []));
    setNewPlateInput('');
    setIsProfileModalOpen(true);
  };

  const handleDeleteProfile = (id: string) => {
    const profile = permanentProfiles.find(p => p.id === id);
    if (!profile) return;
    setProfileToDelete(profile);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDeleteProfile = () => {
    if (!profileToDelete) return;

    const id = profileToDelete.id;
    const name = profileToDelete.name;

    // 1. Remove from permanent profiles
    const updated = permanentProfiles.filter(p => p.id !== id);
    onUpdatePermanentProfiles(updated);

    // 2. Remove from frequent visitors
    const updatedFrequents = frequentVisitors.filter(
      fv => fv.name.toLowerCase().trim() !== name.toLowerCase().trim()
    );
    onUpdateFrequents(updatedFrequents);

    // 3. Remove from pre-authorizations if present
    if (onUpdatePreAuths) {
      const updatedPreAuths = preAuths.filter(
        pa => pa.name.toLowerCase().trim() !== name.toLowerCase().trim()
      );
      onUpdatePreAuths(updatedPreAuths);
    }

    toast.success(`Visitante ${name} foi excluído permanentemente.`);
    setIsDeleteModalOpen(false);
    setProfileToDelete(null);
  };

  const handleConfirmFrequents = () => {
    if (!selectedProfileForFrequente) return;
    if (!frequenteUnitInput.trim()) {
      toast.error('Por favor, informe a casa/unidade.');
      return;
    }

    // Safety assurance: visitor must not be blocked
    if (selectedProfileForFrequente.status === 'blocked') {
      toast.error('Visitante bloqueado não pode ser promovido para frequente.');
      return;
    }

    const newFrequent: FrequentVisitor = {
      id: `freq-${Date.now()}`,
      unit: frequenteUnitInput.trim().toUpperCase(),
      name: selectedProfileForFrequente.name,
      relationship: selectedProfileForFrequente.relationship || 'Visitante',
      type: selectedProfileForFrequente.type || 'visitor',
      deliverySubtype: selectedProfileForFrequente.deliverySubtype,
      plate: selectedProfileForFrequente.plate,
      additionalPlates: selectedProfileForFrequente.platesHistory || [],
      observation: selectedProfileForFrequente.notes || '',
      rule: frequenteRule,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const updatedFrequents = [...frequentVisitors, newFrequent];
    onUpdateFrequents(updatedFrequents);

    toast.success(`Visitante ${newFrequent.name} promovido a Frequente na Casa ${newFrequent.unit} com sucesso!`);
    setIsFrequenteModalOpen(false);
    setSelectedProfileForFrequente(null);
  };

  const handleConfirmBlock = () => {
    if (!selectedProfileForBlock) return;

    const updatedProfiles = permanentProfiles.map(p => {
      if (p.id === selectedProfileForBlock.id) {
        return {
          ...p,
          status: 'blocked' as const,
          blockReason: blockReasonInput.trim() || undefined
        };
      }
      return p;
    });

    onUpdatePermanentProfiles(updatedProfiles);

    // Also deactivate or remove them from frequent visitors list to satisfy rule:
    // "Visitantes bloqueados NÃO podem: ser tratados como visitantes frequentes ativos."
    const updatedFrequents = frequentVisitors.map(v => {
      if (v.name.toLowerCase().trim() === selectedProfileForBlock.name.toLowerCase().trim()) {
        return { ...v, active: false }; // deactivate
      }
      return v;
    });
    onUpdateFrequents(updatedFrequents);

    toast.success(`Visitante ${selectedProfileForBlock.name} bloqueado com sucesso!`);
    setIsBlockModalOpen(false);
    setSelectedProfileForBlock(null);
    setBlockReasonInput('');
  };

  const handleUnblockProfile = (profile: PermanentProfile) => {
    const updatedProfiles = permanentProfiles.map(p => {
      if (p.id === profile.id) {
        return {
          ...p,
          status: 'active' as const,
          blockReason: undefined
        };
      }
      return p;
    });

    onUpdatePermanentProfiles(updatedProfiles);
    toast.success(`Visitante ${profile.name} foi desbloqueado com sucesso.`);
  };

  const handleAddPlateTag = () => {
    if (!newPlateInput.trim()) return;
    const cleanPlate = newPlateInput.trim().toUpperCase();
    if (profileFormPlatesList.includes(cleanPlate)) {
      toast.info('Esta placa já está associada.');
      return;
    }
    setProfileFormPlatesList([...profileFormPlatesList, cleanPlate]);
    if (!profileFormPlate) {
      setProfileFormPlate(cleanPlate);
    }
    setNewPlateInput('');
  };

  const handleRemovePlateTag = (plateToRemove: string) => {
    const updated = profileFormPlatesList.filter(p => p !== plateToRemove);
    setProfileFormPlatesList(updated);
    if (profileFormPlate === plateToRemove) {
      setProfileFormPlate(updated[0] || '');
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileFormName.trim()) {
      toast.error('O nome é obrigatório.');
      return;
    }

    const plates = [...profileFormPlatesList];
    if (profileFormPlate && !plates.includes(profileFormPlate.toUpperCase().trim())) {
      plates.push(profileFormPlate.toUpperCase().trim());
    }

    const payload: PermanentProfile = {
      id: editingProfile ? editingProfile.id : crypto.randomUUID(),
      name: profileFormName.trim(),
      cpf: profileFormCpf.trim(),
      rg: profileFormRg.trim(),
      phone: profileFormPhone.trim(),
      plate: profileFormPlate.trim().toUpperCase(),
      vehicleModel: profileFormVehicleModel.trim(),
      vehicleColor: profileFormVehicleColor.trim(),
      type: profileFormType,
      deliverySubtype: editingProfile?.deliverySubtype || 'delivery',
      relationship: profileFormType !== 'delivery' ? profileFormRelationship.trim() : '',
      unit: profileFormType !== 'delivery' ? profileFormUnit.trim() : '',
      company: profileFormType === 'delivery' ? profileFormCompany.trim() : '',
      count: editingProfile ? editingProfile.count : 0,
      createdAt: editingProfile ? editingProfile.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      platesHistory: plates,
      notes: profileFormNotes.trim()
    };

    (payload as any).trust = profileFormTrust;
    (payload as any).observation = profileFormNotes.trim();

    let updatedProfiles = [...permanentProfiles];
    if (editingProfile) {
      updatedProfiles = updatedProfiles.map(p => p.id === editingProfile.id ? payload : p);
      toast.success('Cadastro editado com sucesso.');
    } else {
      updatedProfiles.push(payload);
      toast.success('Cadastro adicionado com sucesso.');
    }

    onUpdatePermanentProfiles(updatedProfiles);
    setIsProfileModalOpen(false);
    setEditingProfile(null);
  };

  const [simulatedMessage, setSimulatedMessage] = useState('');
  const [simulatedSender, setSimulatedSender] = useState('+55 11 99999-9999');
  const [simulatedResponse, setSimulatedResponse] = useState<string | null>(null);

  const handleSimulateWhatsApp = () => {
    if (!simulatedMessage.trim()) return;
    
    const message: WhatsAppMessage = {
      id: crypto.randomUUID(),
      text: simulatedMessage,
      sender: simulatedSender,
      timestamp: new Date(),
      origin: 'manual',
      status: 'received'
    };
    
    if (onWhatsAppMessage) {
      onWhatsAppMessage(message);
      const parsed = WhatsAppService.parseMessage(message, unitPhones, unitRules);
      setSimulatedResponse(WhatsAppService.getAutoResponse(parsed));
      setSimulatedMessage('');
      toast.success('Mensagem de WhatsApp simulada com sucesso!');
    }
  };
  
  const handleClearEverything = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSimulatedMessage('');
    setSimulatedResponse(null);
    onClearTestData?.();
  };

  // Dashboard Stats
  const stats = useMemo(() => {
    const today = new Date();
    const todayRecords = records.filter(r => isToday(new Date(r.timestamp)));
    
    const activePreAuths = preAuths.filter(p => p.status === 'autorizada' && new Date(p.validity) > today);
    const pendingPreAuths = preAuths.filter(p => p.status !== 'finalizada' && p.status !== 'expirada');
    const activeFrequents = frequentVisitors.filter(v => v.active);
    
    const directReleases = records.filter(r => r.origin === 'visitante_frequente' && r.ruleUsed === 'SEMPRE_LIBERADO');
    const notifyReleases = records.filter(r => r.origin === 'visitante_frequente' && r.ruleUsed === 'AVISAR_ANTES');

    // Weekly activity (Thumbs Up logic)
    const oneWeekAgo = subWeeks(new Date(), 1);
    const unitWeeklyStats: Record<string, number> = {};
    
    records.forEach(r => {
      if (new Date(r.timestamp) >= oneWeekAgo) {
        unitWeeklyStats[r.destination] = (unitWeeklyStats[r.destination] || 0) + 1;
      }
    });
    preAuths.forEach(p => {
      if (new Date(p.createdAt) >= oneWeekAgo) {
        unitWeeklyStats[p.unit] = (unitWeeklyStats[p.unit] || 0) + 1;
      }
    });

    const activeUnitsThisWeek = Object.entries(unitWeeklyStats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([unit, count]) => ({ unit, count }));

    return {
      entriesToday: todayRecords.length,
      pending: pendingPreAuths.length,
      finishedToday: todayRecords.filter(r => r.status === 'finalizado').length,
      activePreAuths: activePreAuths.length,
      activeFrequents: activeFrequents.length,
      directReleases: directReleases.length,
      notifyReleases: notifyReleases.length,
      activeUnitsThisWeek,
      totalTypes: {
        delivery: records.filter(r => r.type === 'delivery').length + preAuths.filter(p => p.type === 'delivery' && p.status === 'finalizada').length,
        visitor: records.filter(r => r.type === 'visitor').length + preAuths.filter(p => p.type === 'visitor' && p.status === 'finalizada').length,
        service: records.filter(r => r.type === 'service').length + preAuths.filter(p => p.type === 'service' && p.status === 'finalizada').length,
      }
    };
  }, [records, preAuths, frequentVisitors]);

  // Chart Data: Accesses by Type
  const typeData = useMemo(() => {
    const counts = records.reduce((acc, r) => {
      acc[r.type] = (acc[r.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return [
      { name: 'Visitantes', value: counts.visitor || 0, color: '#10b981' },
      { name: 'Entregas', value: counts.delivery || 0, color: '#f59e0b' },
      { name: 'Prestadores', value: counts.service || 0, color: '#3b82f6' },
    ];
  }, [records]);

  // Chart Data: Accesses by Origin
  const originData = useMemo(() => {
    const counts = records.reduce((acc, r) => {
      const origin = r.origin || 'manual';
      acc[origin] = (acc[origin] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return [
      { name: 'Manual', value: counts.manual || 0, color: '#64748b' },
      { name: 'Frequente', value: counts.visitante_frequente || 0, color: '#3b82f6' },
      { name: 'Pré-Autorização', value: counts.pre_autorizacao || 0, color: '#a855f7' },
    ];
  }, [records]);

  // Chart Data: Last 7 Days
  const last7DaysData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      
      const count = records.filter(r => {
        const timestamp = new Date(r.timestamp);
        return timestamp >= dayStart && timestamp <= dayEnd;
      }).length;

      return {
        name: format(date, 'dd/MM'),
        acessos: count,
      };
    });
    return days;
  }, [records]);

  // Top Units
  const topUnits = useMemo(() => {
    const counts = records.reduce((acc, r) => {
      acc[r.destination] = (acc[r.destination] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([unit, count]) => ({ unit, count }));
  }, [records]);

  // Top Visitors
  const topVisitors = useMemo(() => {
    const counts = records.reduce((acc, r) => {
      acc[r.name] = (acc[r.name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
      .filter(([name]) => name !== 'N/A')
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
  }, [records]);
  const [historyFilters, setHistoryFilters] = useState({
    searchTerm: '',
    type: 'all' as AccessType | 'all',
    origin: 'all' as string | 'all',
    status: 'all' as string | 'all',
    unit: '',
  });

  const filteredHistory = useMemo(() => {
    return records.filter(r => {
      const matchesSearch = 
        r.name.toLowerCase().includes(historyFilters.searchTerm.toLowerCase()) ||
        r.plate?.toLowerCase().includes(historyFilters.searchTerm.toLowerCase()) ||
        r.vehicleModel?.toLowerCase().includes(historyFilters.searchTerm.toLowerCase());
      
      const matchesType = historyFilters.type === 'all' || r.type === historyFilters.type;
      const matchesOrigin = historyFilters.origin === 'all' || r.origin === historyFilters.origin;
      const matchesStatus = historyFilters.status === 'all' || r.status === historyFilters.status;
      const matchesUnit = !historyFilters.unit || r.destination.toLowerCase().includes(historyFilters.unit.toLowerCase());

      return matchesSearch && matchesType && matchesOrigin && matchesStatus && matchesUnit;
    });
  }, [records, historyFilters]);

  // Unit View
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [unitSearch, setUnitSearch] = useState('');

  const unitData = useMemo(() => {
    if (!selectedUnit) return null;
    
    const unitRecords = records.filter(r => r.destination === selectedUnit);
    const unitFrequents = frequentVisitors.filter(v => v.unit === selectedUnit);
    const unitPreAuths = preAuths.filter(p => p.unit === selectedUnit);
    
    return {
      records: unitRecords.slice(0, 10),
      frequents: unitFrequents,
      preAuths: unitPreAuths,
      totalAccesses: unitRecords.length,
    };
  }, [selectedUnit, records, frequentVisitors, preAuths]);

  const unitsList = useMemo(() => {
    const units = new Set([
      ...records.map(r => r.destination),
      ...frequentVisitors.map(v => v.unit),
      ...preAuths.map(p => p.unit)
    ]);
    return Array.from(units)
      .filter(u => u && u !== 'N/A')
      .filter(u => u.toLowerCase().includes(unitSearch.toLowerCase()))
      .sort();
  }, [records, frequentVisitors, preAuths, unitSearch]);

  // Reports View
  const [reportFilters, setReportFilters] = useState({
    dateRange: 'today' as 'today' | 'yesterday' | 'last7' | 'custom',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    unit: '',
    name: '',
    plate: '',
    type: 'all' as AccessType | 'all',
    subtype: 'all' as DeliverySubtype | 'all',
    origin: 'all' as string | 'all',
    status: 'all' as string | 'all',
  });

  const filteredReports = useMemo(() => {
    return records.filter(r => {
      const recordDate = new Date(r.timestamp);
      let dateMatch = false;
      
      const today = startOfDay(new Date());
      const yesterday = startOfDay(subDays(new Date(), 1));
      const last7 = startOfDay(subDays(new Date(), 7));

      if (reportFilters.dateRange === 'today') {
        dateMatch = recordDate >= today;
      } else if (reportFilters.dateRange === 'yesterday') {
        dateMatch = recordDate >= yesterday && recordDate < today;
      } else if (reportFilters.dateRange === 'last7') {
        dateMatch = recordDate >= last7;
      } else if (reportFilters.dateRange === 'custom') {
        const start = startOfDay(new Date(reportFilters.startDate));
        const end = endOfDay(new Date(reportFilters.endDate));
        dateMatch = recordDate >= start && recordDate <= end;
      }

      const matchesUnit = !reportFilters.unit || r.destination.toLowerCase().includes(reportFilters.unit.toLowerCase());
      const matchesName = !reportFilters.name || r.name.toLowerCase().includes(reportFilters.name.toLowerCase());
      const matchesPlate = !reportFilters.plate || r.plate?.toLowerCase().includes(reportFilters.plate.toLowerCase());
      const matchesType = reportFilters.type === 'all' || r.type === reportFilters.type;
      const matchesSubtype = reportFilters.subtype === 'all' || r.deliverySubtype === reportFilters.subtype;
      const matchesOrigin = reportFilters.origin === 'all' || r.origin === reportFilters.origin;
      const matchesStatus = reportFilters.status === 'all' || r.status === reportFilters.status;

      return dateMatch && matchesUnit && matchesName && matchesPlate && matchesType && matchesSubtype && matchesOrigin && matchesStatus;
    });
  }, [records, reportFilters]);

  const reportStats = useMemo(() => {
    const total = filteredReports.length;
    const visitors = filteredReports.filter(r => r.type === 'visitor').length;
    const deliveries = filteredReports.filter(r => r.type === 'delivery').length;
    const services = filteredReports.filter(r => r.type === 'service').length;
    const whatsapp = filteredReports.filter(r => r.origin === 'whatsapp').length;
    const frequents = filteredReports.filter(r => r.origin === 'visitante_frequente').length;
    const preAuths = filteredReports.filter(r => r.origin === 'pre_autorizacao').length;
    const manual = filteredReports.filter(r => r.origin === 'manual' || !r.origin).length;
    const finished = filteredReports.filter(r => r.status === 'finalizado').length;

    return { total, visitors, deliveries, services, whatsapp, frequents, preAuths, manual, finished };
  }, [filteredReports]);

  const exportToCSV = () => {
    if (filteredReports.length === 0) {
      toast.error('Não há registros para exportar.');
      return;
    }

    const headers = [
      'Data', 
      'Hora', 
      'Status da Liberação', 
      'Unidade Destino', 
      'Nome Completo', 
      'Documento (CPF / RG)', 
      'Modalidade', 
      'Subtipo', 
      'Placa Veículo', 
      'Modelo Veículo', 
      'Cor Veículo', 
      'Porteiro Responsável', 
      'Observação / Notas', 
      'Print Comprovante'
    ];

    const rows = filteredReports.map(r => [
      format(new Date(r.timestamp), 'dd/MM/yyyy'),
      format(new Date(r.timestamp), 'HH:mm'),
      r.status === 'finalizado' ? 'FINALIZADA' : r.status === 'não_liberada' ? 'NÃO LIBERADA' : r.status.toUpperCase(),
      r.destination,
      r.name.toUpperCase(),
      r.document || '-',
      r.type === 'visitor' ? 'Visitante' : r.type === 'delivery' ? 'Entrega' : r.type === 'uber' ? 'Uber' : 'Prestador',
      r.deliverySubtype || '-',
      r.plate ? r.plate.toUpperCase() : '-',
      r.vehicleModel ? r.vehicleModel.toUpperCase() : '-',
      r.vehicleColor ? r.vehicleColor.toUpperCase() : '-',
      r.porterName || 'Carlos (Portaria)',
      r.notes ? r.notes.replace(/"/g, '""') : '-',
      r.printImage ? 'SIM (Anexado Silenciosamente)' : 'NÃO'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `auditoria_acessos_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`);
    toast.success('Relatório CSV de Auditoria exportado!');
  };

  const exportToExcel = () => {
    if (filteredReports.length === 0) {
      toast.error('Não há registros para exportar.');
      return;
    }

    const data = filteredReports.map(r => ({
      'Data': format(new Date(r.timestamp), 'dd/MM/yyyy'),
      'Hora': format(new Date(r.timestamp), 'HH:mm'),
      'Status da Liberação': r.status === 'finalizado' ? 'FINALIZADA' : r.status === 'não_liberada' ? 'NÃO LIBERADA' : r.status.toUpperCase(),
      'Unidade Destino': r.destination,
      'Nome Completo': r.name.toUpperCase(),
      'Documento (CPF / RG)': r.document || '-',
      'Modalidade': r.type === 'visitor' ? 'Visitante' : r.type === 'delivery' ? 'Entrega' : r.type === 'uber' ? 'Uber' : 'Prestador',
      'Subtipo': r.deliverySubtype || '-',
      'Placa Veículo': r.plate ? r.plate.toUpperCase() : '-',
      'Modelo Veículo': r.vehicleModel ? r.vehicleModel.toUpperCase() : '-',
      'Cor Veículo': r.vehicleColor ? r.vehicleColor.toUpperCase() : '-',
      'Porteiro Responsável': r.porterName || 'Carlos (Portaria)',
      'Observação / Notas': r.notes || '-',
      'Print Comprovante': r.printImage ? 'SIM (Anexado Silenciosamente)' : 'NÃO'
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Acessos');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `auditoria_acessos_${format(new Date(), 'yyyy-MM-dd_HHmm')}.xlsx`);
    toast.success('Relatório Excel de Auditoria exportado!');
  };

  const exportToPDF = () => {
    if (filteredReports.length === 0) {
      toast.error('Não há registros para exportar.');
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Cover Title Border Banner
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 42, 'F');

    // Title text
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('PORTARIA PRO - RELATÓRIO DO SÍNDICO PARA AUDITORIA (LGPD)', 14, 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(194, 205, 219); // text-slate-300
    doc.text(`CONDOMÍNIO: ${condoInfo?.name?.toUpperCase() || 'RESIDENCIAL PRO'}`, 14, 26);
    doc.text(`GERADO POR: SÍNDICO / ADM    |    GERAÇÃO: ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}`, 14, 31);
    doc.text(`FILTRADOS: ${filteredReports.length} REGISTROS OPERACIONAIS`, 14, 36);

    let yPosition = 52;

    filteredReports.forEach((record, index) => {
      // Check height bounds before printing next card block (card takes 45px)
      if (yPosition + 50 > pageHeight) {
        doc.addPage();
        yPosition = 20; // reset
      }

      // Card Background fill
      doc.setFillColor(248, 250, 252); // slate-50
      doc.rect(12, yPosition - 3, pageWidth - 24, 45, 'F');

      // Left column solid stripe matching condition
      if (record.status === 'não_liberada') {
        doc.setFillColor(239, 68, 68); // Red-500
      } else if (record.type === 'visitor') {
        doc.setFillColor(16, 185, 129); // Emerald-500
      } else if (record.type === 'delivery') {
        doc.setFillColor(249, 115, 22); // Orange-500
      } else {
        doc.setFillColor(79, 70, 229); // Indigo-600
      }
      doc.rect(12, yPosition - 3, 3.5, 45, 'F');

      // Row 1: Name & Unit
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text(`${index + 1}. ${record.name.toUpperCase()}`, 20, yPosition + 4.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(79, 70, 229); // indigo-600
      doc.text(`DESTINO: UNIDADE ${record.destination}`, 130, yPosition + 4.5);

      // Row 2: CPF/RG, Modalidade, Porteiro Responsável
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105); // slate-600
      doc.text(`RG / CPF: ${record.document || 'NÃO INFORMADO'}`, 20, yPosition + 12.5);
      doc.text(`MODALIDADE: ${record.type === 'visitor' ? 'VISITANTE' : record.type === 'delivery' ? 'ENTREGA' : record.type === 'uber' ? 'UBER' : 'PRESTADOR'}`, 80, yPosition + 12.5);
      doc.text(`PORTEIRO: ${(record.porterName || 'CARLOS (PORTARIA)').toUpperCase()}`, 130, yPosition + 12.5);

      // Row 3: Data/Hora, Placa, Veículo / Cor
      doc.text(`DATA/HORA: ${format(new Date(record.timestamp), 'dd/MM/yyyy HH:mm')}`, 20, yPosition + 20.5);
      doc.text(`PLACA: ${record.plate ? record.plate.toUpperCase() : '-'}`, 80, yPosition + 20.5);
      doc.text(`VEÍCULO: ${record.vehicleModel ? record.vehicleModel.toUpperCase() : '-'} (${record.vehicleColor ? record.vehicleColor.toUpperCase() : '-'})`, 130, yPosition + 20.5);

      // Row 4: Observações
      const obsText = record.notes ? record.notes : 'Sem observações operacionais adicionais';
      doc.text(`OBSERVAÇÕES: ${obsText.substring(0, 95)}`, 20, yPosition + 28.5);

      // Row 5: Comprovante anexo
      if (record.printImage) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(16, 185, 129); // emerald-500
        doc.text('COMPROVANTE / PRINT ANEXADO SILENCIOSAMENTE EM SEGUNDO PLANO', 20, yPosition + 36.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
      } else {
        doc.text('COMPROVANTE DIGITAL: NÃO ANEXADO', 20, yPosition + 36.5);
      }

      yPosition += 52;
    });

    doc.save(`relatorio_auditoria_portariapro_${format(new Date(), 'yyyy-MM-dd_HHmm')}.pdf`);
    toast.success('Relatório completo em PDF exportado com sucesso!', {
      description: 'Documento gerado de acordo com as normas de privacidade para o Síndico.'
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Admin Sub-Navigation */}
      <div 
        ref={scrollContainerRef}
        className="bg-white border-b border-slate-200 px-4 overflow-x-auto no-scrollbar scroll-smooth"
      >
        <div className="flex gap-8 whitespace-nowrap min-w-max">
          {[
            { id: 'emergencia', label: 'Acompanhamento Operacional', icon: Sliders },
            { id: 'banco_visitantes', label: 'Banco de Visitantes', icon: Users },
            { id: 'banco_entregadores', label: 'Banco de Entregadores', icon: Bike },
            { id: 'history', label: 'Histórico Operacional', icon: History },
            ...(userRole === 'admin' && !isOperationalControl ? [
              { id: 'porteiros' as const, label: 'Gestão de Usuários', icon: ShieldCheck }
            ] : []),
            ...(userRole !== 'sindico' ? [
              { id: 'phones' as const, label: 'Telefones', icon: Phone }
            ] : []),
            { id: 'rules', label: 'Regras por unidade', icon: Shield },
            { id: 'frequents', label: 'Frequentes', icon: Users },
            { id: 'preauths', label: 'Pré-autorizações', icon: Calendar },
            ...(userRole === 'sindico' || userRole === 'admin' ? [{ id: 'reports' as const, label: 'Relatórios', icon: FileText }] : []),
            ...(userRole !== 'sindico' ? [
              { id: 'whatsapp' as const, label: 'WhatsApp (Sim)', icon: MessageSquare }
            ] : []),
            ...(!hideTechnicalConfig && userRole !== 'sindico' ? [{ id: 'config' as const, label: 'Configurações', icon: Settings }] : []),
            ...(userRole === 'admin' ? [{ id: 'security_center' as const, label: 'Central de Segurança do Sistema', icon: ShieldCheck }] : [])
          ].map(tab => (
            <button
              key={tab.id}
              ref={subView === tab.id ? activeTabRef : null}
              onClick={() => setSubView(tab.id as AdminSubView)}
              className={cn(
                "py-4 flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-all border-b-2 flex-shrink-0",
                subView === tab.id ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* DASHBOARD VIEW */}
          {subView === 'dashboard' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
                <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                      <ArrowUpRight className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hoje</span>
                  </div>
                  <span className="block text-2xl font-black text-slate-900">{stats.entriesToday}</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Entradas</span>
                </div>
                
                <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                      <Clock className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Agora</span>
                  </div>
                  <span className="block text-2xl font-black text-amber-600">{stats.pending}</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Aguardando</span>
                </div>

                <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div className="p-2 bg-slate-50 text-slate-600 rounded-xl">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hoje</span>
                  </div>
                  <span className="block text-2xl font-black text-slate-900">{stats.finishedToday}</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Finalizados</span>
                </div>

                <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ativas</span>
                  </div>
                  <span className="block text-2xl font-black text-purple-600">{stats.activePreAuths}</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Pré-Autorizações</span>
                </div>

                <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                      <Users className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ativos</span>
                  </div>
                  <span className="block text-2xl font-black text-amber-600">{stats.activeFrequents}</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Frequentes</span>
                </div>

                <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                      <Zap className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Direto</span>
                  </div>
                  <span className="block text-2xl font-black text-emerald-600">{stats.directReleases}</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Liberados Direto</span>
                </div>

                <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm col-span-2 md:col-span-1">
                  <div className="flex justify-between items-start mb-2">
                    <div className="p-2 bg-slate-900 text-white rounded-xl">
                      <ClipboardList className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</span>
                  </div>
                  <span className="block text-2xl font-black text-slate-900">{records.length}</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Acessos Totais</span>
                </div>
              </div>

              {/* Specific Syndic Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                 <div className="bg-orange-50 border border-orange-100 p-6 rounded-3xl">
                    <div className="flex items-center gap-3 mb-4 text-orange-600">
                      <Bike className="w-6 h-6" />
                      <h3 className="font-black text-xs uppercase tracking-widest">Entregas</h3>
                    </div>
                    <p className="text-3xl font-black text-orange-700">{stats.totalTypes.delivery}</p>
                    <p className="text-[10px] font-bold text-orange-600/60 uppercase mt-1">Autorizadas & Finalizadas</p>
                 </div>
                 <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl">
                    <div className="flex items-center gap-3 mb-4 text-emerald-600">
                      <User className="w-6 h-6" />
                      <h3 className="font-black text-xs uppercase tracking-widest">Visitantes</h3>
                    </div>
                    <p className="text-3xl font-black text-emerald-700">{stats.totalTypes.visitor}</p>
                    <p className="text-[10px] font-bold text-emerald-600/60 uppercase mt-1">Autorizados & Finalizados</p>
                 </div>
                 <div className="bg-blue-50 border border-blue-100 p-6 rounded-3xl">
                    <div className="flex items-center gap-3 mb-4 text-blue-600">
                      <Wrench className="w-6 h-6" />
                      <h3 className="font-black text-xs uppercase tracking-widest">Prestadores</h3>
                    </div>
                    <p className="text-3xl font-black text-blue-700">{stats.totalTypes.service}</p>
                    <p className="text-[10px] font-bold text-blue-600/60 uppercase mt-1">Autorizados & Finalizados</p>
                 </div>
              </div>

              {/* Weekly Activity & Pending Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                 <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center justify-between">
                      <span>Casas mais Ativas na Semana</span>
                      <span className="text-blue-600">👍</span>
                    </h3>
                    <div className="space-y-3">
                      {stats.activeUnitsThisWeek.map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 flex items-center justify-center bg-white rounded-xl font-black text-xs text-slate-400 border border-slate-200">{i + 1}</span>
                            <span className="font-black text-sm text-slate-700">UNIDADE {item.unit}</span>
                          </div>
                          <span className="text-[10px] font-black bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{item.count} MOV.</span>
                        </div>
                      ))}
                      {stats.activeUnitsThisWeek.length === 0 && (
                         <div className="py-8 text-center text-slate-400 text-xs font-bold uppercase border-2 border-dashed border-slate-100 rounded-3xl">
                           Nenhuma atividade registrada na semana
                         </div>
                      )}
                    </div>
                 </div>

                 <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6">Autorizações por Status</h3>
                    <div className="space-y-4">
                       <div className="flex justify-between items-center p-3 border-b border-slate-50">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Aguardando Chegada</span>
                          <span className="text-sm font-black text-amber-500">{preAuths.filter(p => p.status === 'autorizada').length}</span>
                       </div>
                       <div className="flex justify-between items-center p-3 border-b border-slate-50">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Finalizadas (Entradas)</span>
                          <span className="text-sm font-black text-emerald-500">{preAuths.filter(p => p.status === 'finalizada').length}</span>
                       </div>
                       <div className="flex justify-between items-center p-3 border-b border-slate-50">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pendentes Confirmação</span>
                          <span className="text-sm font-black text-blue-500">{preAuths.filter(p => p.status === 'pendente_confirmacao').length}</span>
                       </div>
                       <div className="flex justify-between items-center p-3">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Expiradas / Canceladas</span>
                          <span className="text-sm font-black text-slate-400">{preAuths.filter(p => p.status === 'expirada').length}</span>
                       </div>
                    </div>
                 </div>
              </div>

              {/* Secondary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Fluxo de Acessos (Últimos 7 Dias)
                  </h3>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={last7DaysData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} 
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} 
                        />
                        <Tooltip 
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          cursor={{ fill: '#f8fafc' }}
                        />
                        <Bar dataKey="acessos" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Distribuição por Tipo
                  </h3>
                  <div className="h-[250px] w-full flex items-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={typeData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {typeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-3 pr-4">
                      {typeData.map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-[10px] font-black text-slate-600 uppercase">{item.name}</span>
                          <span className="text-xs font-black text-slate-900 ml-auto">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Row: Origins and Top Units */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm md:col-span-1">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Origem do Registro</h3>
                  <div className="space-y-4">
                    {originData.map((item, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-[10px] font-black uppercase">
                          <span className="text-slate-500">{item.name}</span>
                          <span className="text-slate-900">{item.value}</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-1000" 
                            style={{ 
                              width: `${(item.value / records.length) * 100 || 0}%`,
                              backgroundColor: item.color
                            }} 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm md:col-span-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div>
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Unidades com Maior Volume</h3>
                      <div className="space-y-4">
                        {topUnits.map((item, i) => (
                          <div key={i} className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-black text-blue-600 border border-slate-100">
                              {i + 1}
                            </div>
                            <div className="flex-1">
                              <span className="block text-xs font-black text-slate-900 uppercase">{item.unit}</span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase">{item.count} Acessos</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-300" />
                          </div>
                        ))}
                        {topUnits.length === 0 && (
                          <div className="py-8 text-center text-slate-400 text-xs font-bold uppercase">
                            Nenhum dado disponível
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Visitantes mais Recorrentes</h3>
                      <div className="space-y-4">
                        {topVisitors.map((item, i) => (
                          <div key={i} className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-black text-emerald-600 border border-slate-100">
                              {i + 1}
                            </div>
                            <div className="flex-1">
                              <span className="block text-xs font-black text-slate-900 uppercase">{item.name}</span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase">{item.count} Entradas</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-300" />
                          </div>
                        ))}
                        {topVisitors.length === 0 && (
                          <div className="py-8 text-center text-slate-400 text-xs font-bold uppercase">
                            Nenhum dado disponível
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* HISTORY VIEW */}
          {subView === 'history' && (
            <div className="space-y-4">
              <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm space-y-4">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Pesquisar por nome, placa..."
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                      value={historyFilters.searchTerm}
                      onChange={e => setHistoryFilters({...historyFilters, searchTerm: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 sm:flex gap-2">
                    <select 
                      className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] sm:text-xs font-bold uppercase outline-none"
                      value={historyFilters.type}
                      onChange={e => setHistoryFilters({...historyFilters, type: e.target.value as any})}
                    >
                      <option value="all">Tipos</option>
                      <option value="visitor">Visitantes</option>
                      <option value="delivery">Entregas</option>
                      <option value="service">Prestadores</option>
                    </select>
                    <select 
                      className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] sm:text-xs font-bold uppercase outline-none"
                      value={historyFilters.origin}
                      onChange={e => setHistoryFilters({...historyFilters, origin: e.target.value})}
                    >
                      <option value="all">Origens</option>
                      <option value="manual">Manual</option>
                      <option value="visitante_frequente">Frequente</option>
                      <option value="pre_autorizacao">Pré-Autorização</option>
                    </select>
                    <div className="flex gap-2 col-span-2 sm:col-span-1">
                      {!isReadOnly && onClearAccessRecords && records.length > 0 && (
                        <button 
                          onClick={onClearAccessRecords}
                          className="flex-1 sm:flex-none flex items-center justify-center p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-slate-100 sm:border-transparent"
                          title="Limpar Histórico"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                      <button className="flex-1 sm:flex-none flex items-center justify-center p-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors">
                        <Download className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {filteredHistory.map((record) => {
                  const isExited = record.status === 'finalizado';
                  const Icon = record.type === 'visitor' ? User : record.type === 'delivery' ? Bike : record.type === 'uber' ? Car : Wrench;
                  const typeColor = record.type === 'visitor' ? 'text-emerald-600 bg-emerald-50' : 
                                    record.type === 'delivery' ? 'text-orange-600 bg-orange-50' : 
                                    record.type === 'uber' ? 'text-[#133d47] bg-[#eefcfc]' : 'text-blue-600 bg-blue-50';
                  
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
                      case 'uber': return 'Uber';
                      default: return 'Registro';
                    }
                  };

                  return (
                    <div
                      key={record.id}
                      onClick={() => {
                        toast.info(`Histórico: ${record.name}`, {
                          description: `Acesso as ${format(new Date(record.timestamp), 'HH:mm')} para ${record.destination}`
                        });
                      }}
                      className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center gap-4 transition-all cursor-pointer hover:shadow-md hover:border-blue-200 active:scale-[0.985] select-none"
                    >
                      <div className={cn("p-3 rounded-xl shrink-0", typeColor)}>
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
                            {format(new Date(record.timestamp), 'dd/MM • HH:mm')}
                          </span>
                        </div>
                        
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                          <div className="flex items-center gap-1 text-slate-900 text-xs font-bold">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{record.destination}</span>
                          </div>

                          {record.type !== 'delivery' && (
                            <div className={cn("text-[10px] font-black uppercase tracking-wider px-1.5 rounded", typeColor)}>
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

                          {record.vehicleModel && (
                            <div className="flex items-center gap-1.5 text-slate-500 text-xs bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                              <span className="font-bold uppercase">{record.vehicleModel}</span>
                              {record.vehicleColor && <span className="opacity-60">• {record.vehicleColor}</span>}
                            </div>
                          )}

                          {record.prismaNumber && (() => {
                            const colSelected = (record.prismaColor || '').toLowerCase().trim();
                            return (
                              <div className={cn(
                                "flex flex-col items-center justify-center px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-wider shadow-xs leading-none text-center min-w-[75px]",
                                colSelected === 'amarelo' && 'bg-yellow-400 text-slate-900 border-yellow-500',
                                colSelected === 'vermelho' && 'bg-red-500 text-white border-red-600',
                                colSelected === 'azul' && 'bg-blue-600 text-white border-blue-700',
                                colSelected === 'verde' && 'bg-emerald-500 text-white border-emerald-600',
                                colSelected === 'preto' && 'bg-slate-950 text-white border-slate-950',
                                colSelected === 'branco' && 'bg-white text-slate-800 border-slate-350',
                                (!colSelected || (colSelected !== 'amarelo' && colSelected !== 'vermelho' && colSelected !== 'azul' && colSelected !== 'verde' && colSelected !== 'preto' && colSelected !== 'branco')) && 'bg-slate-100 text-slate-800 border-slate-300'
                              )}>
                                <div className="flex items-center gap-0.5 justify-center leading-none">
                                  <span>PR.</span>
                                  <span>
                                    {colSelected === 'amarelo' && '🟡'}
                                    {colSelected === 'vermelho' && '🔴'}
                                    {colSelected === 'azul' && '🔵'}
                                    {colSelected === 'verde' && '🟢'}
                                    {colSelected === 'preto' && '⚫'}
                                    {colSelected === 'branco' && '⚪'}
                                    {(!colSelected || (colSelected !== 'amarelo' && colSelected !== 'vermelho' && colSelected !== 'azul' && colSelected !== 'verde' && colSelected !== 'preto' && colSelected !== 'branco')) && '🎨'}
                                    {record.prismaNumber}
                                  </span>
                                </div>
                                {record.exitTimestamp && (
                                  <span className="text-[7.5px] font-black tracking-widest mt-0.5 border-t border-black/10 pt-0.5 w-full block text-center leading-none">
                                    ENTREGUE
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                        
                        {/* AUDIT FOOTER */}
                        <div className="flex justify-end items-center mt-2.5 pt-1.5 border-t border-slate-100/70">
                          <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                            LIBERADO POR: <span className="font-extrabold text-[#0f172a]">{record.porterName || 'CARLOS (PORTARIA)'}</span>
                          </span>
                        </div>
                      </div>

                        <div className="flex flex-col gap-2 items-end">
                          <span className="text-[10px] font-bold text-emerald-500 uppercase leading-none">
                            Finalizado
                          </span>
                          {!isReadOnly && onDeleteRecord && (
                            <button
                              onClick={() => {
                                if (confirm('Deseja excluir este registro do histórico?')) {
                                  onDeleteRecord(record.id);
                                }
                              }}
                              className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                              title="Excluir do histórico"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                {filteredHistory.length === 0 && (
                  <div className="p-12 text-center text-slate-400 text-xs font-bold uppercase bg-white rounded-3xl border border-dashed border-slate-200">
                    Nenhum registro encontrado
                  </div>
                )}
              </div>
            </div>
          )}

          {/* UNITS VIEW */}
          {subView === 'units' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1 space-y-4">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Pesquisar Unidade</h3>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Ex: Casa 01..."
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                      value={unitSearch}
                      onChange={e => setUnitSearch(e.target.value)}
                    />
                  </div>
                  <div className="max-h-[400px] overflow-y-auto space-y-2 no-scrollbar">
                    {unitsList.map(unit => (
                      <button
                        key={unit}
                        onClick={() => setSelectedUnit(unit)}
                        className={cn(
                          "w-full p-3 rounded-2xl border text-left transition-all flex items-center justify-between group",
                          selectedUnit === unit ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100" : "bg-white border-slate-100 text-slate-600 hover:border-slate-200"
                        )}
                      >
                        <span className="text-xs font-black uppercase tracking-widest">{unit}</span>
                        <ChevronRight className={cn("w-4 h-4", selectedUnit === unit ? "text-white" : "text-slate-300 group-hover:text-slate-400")} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="md:col-span-2">
                {selectedUnit && unitData ? (
                  <div className="space-y-6">
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                      <div className="flex justify-between items-center mb-6">
                        <div>
                          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{selectedUnit}</h2>
                          <span className="text-xs font-bold text-slate-400 uppercase">Visão Consolidada da Unidade</span>
                        </div>
                        <div className="text-right">
                          <span className="block text-2xl font-black text-blue-600">{unitData.totalAccesses}</span>
                          <span className="text-[10px] font-black text-slate-400 uppercase">Acessos Totais</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <div className="flex items-center gap-2 text-blue-600 mb-1">
                            <Users className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase">Frequentes</span>
                          </div>
                          <span className="text-xl font-black text-slate-900">{unitData.frequents.length}</span>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <div className="flex items-center gap-2 text-purple-600 mb-1">
                            <Calendar className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase">Pré-Autorizações</span>
                          </div>
                          <span className="text-xl font-black text-slate-900">{unitData.preAuths.length}</span>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div>
                          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Histórico Recente</h3>
                          <div className="space-y-2">
                            {unitData.records.map(r => (
                              <div key={r.id} className="p-3 bg-white border border-slate-100 rounded-2xl flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className={cn(
                                    "p-2 rounded-lg",
                                    r.type === 'visitor' ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"
                                  )}>
                                    {r.type === 'visitor' ? <User className="w-4 h-4" /> : <Bike className="w-4 h-4" />}
                                  </div>
                                  <div>
                                    <span className="block text-xs font-bold text-slate-900 uppercase">{r.name}</span>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase">{format(new Date(r.timestamp), 'dd/MM HH:mm')}</span>
                                  </div>
                                </div>
                                <span className={cn(
                                  "text-[9px] font-black uppercase px-1.5 py-0.5 rounded",
                                  r.origin === 'manual' ? "bg-slate-100 text-slate-600" : "bg-blue-100 text-blue-600"
                                )}>
                                  {r.origin}
                                </span>
                              </div>
                            ))}
                            {unitData.records.length === 0 && (
                              <div className="py-8 text-center text-slate-400 text-xs font-bold uppercase">Nenhum acesso registrado</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center">
                    <MapPin className="w-12 h-12 text-slate-200 mb-4" />
                    <h3 className="text-slate-900 font-black uppercase tracking-widest text-sm">Selecione uma Unidade</h3>
                    <p className="text-slate-400 text-xs font-bold uppercase mt-2">Escolha uma casa ou apartamento na lista ao lado para ver os detalhes administrativos.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* BANCO DE ENTREGADORES VIEW */}
          {subView === 'banco_entregadores' && (
            <div className="space-y-6 animate-fade-in text-slate-700">
              <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col lg:flex-row justify-between items-center gap-4">
                <div className="flex-1 w-full relative">
                  <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Pesquisar entregador por nome, placa, CPF, RG, telefone ou empresa..."
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none font-medium text-slate-700"
                    value={entregadorSearch}
                    onChange={e => setEntregadorSearch(e.target.value)}
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto shrink-0">
                  <select 
                    className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase outline-none text-slate-700"
                    value={entregadorCompanyFilter}
                    onChange={e => setEntregadorCompanyFilter(e.target.value)}
                  >
                    <option value="all">TODAS AS EMPRESAS</option>
                    {Array.from(new Set(permanentProfiles.filter(p => p.type === 'delivery' && p.company).map(p => p.company))).map(comp => (
                      <option key={comp} value={comp}>{comp?.toUpperCase()}</option>
                    ))}
                  </select>
                  <button 
                    onClick={() => handleOpenProfileAdd('delivery')}
                    className="h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer shadow-sm active:scale-95 whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    Cadastrar Entregador
                  </button>
                </div>
              </div>

              {/* Grid of Delivery Drivers */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {permanentProfiles
                  .filter(p => p.type === 'delivery')
                  .filter(p => {
                    const stats = getProfileStats(p);
                    const q = entregadorSearch.toLowerCase().trim();
                    if (!q) return true;
                    
                    const normName = p.name.toLowerCase();
                    const cleanQ = q.replace(/\D/g, '');
                    const normPlateQ = q.toUpperCase().replace(/[^A-Z0-9]/g, '');

                    const matchesName = normName.includes(q);

                    const pCpf = (p.cpf || '').toLowerCase();
                    const pCpfDigits = pCpf.replace(/\D/g, '');
                    const pRg = (p.rg || '').toLowerCase();
                    const pRgDigits = pRg.replace(/\D/g, '');

                    const matchesCpf = pCpf.includes(q) || (cleanQ.length > 0 && pCpfDigits.includes(cleanQ));
                    const matchesRg = pRg.includes(q) || (cleanQ.length > 0 && pRgDigits.includes(cleanQ));

                    const pPhone = (p.phone || '').toLowerCase();
                    const pPhoneDigits = pPhone.replace(/\D/g, '');
                    const matchesPhone = pPhone.includes(q) || (cleanQ.length > 0 && pPhoneDigits.includes(cleanQ));

                    const pComp = (p.company || '').toLowerCase();
                    const matchesCompany = pComp.includes(q);

                    const pNotes = (p.notes || '').toLowerCase();
                    const matchesNotes = pNotes.includes(q);

                    const matchesPlate = (p.plate && p.plate.toUpperCase().replace(/[^A-Z0-9]/g, '').includes(normPlateQ)) ||
                                         (p.platesHistory || []).some(plate => plate.toUpperCase().replace(/[^A-Z0-9]/g, '').includes(normPlateQ)) ||
                                         stats.allPlates.some(plate => plate.toUpperCase().replace(/[^A-Z0-9]/g, '').includes(normPlateQ));

                    return matchesName || 
                           (q.length > 0 && (matchesCpf || matchesRg || matchesPhone)) || 
                           (normPlateQ.length > 0 && matchesPlate) || 
                           matchesCompany || 
                           matchesNotes;
                  })
                  .filter(p => entregadorCompanyFilter === 'all' || p.company === entregadorCompanyFilter)
                  .map(p => {
                    const stats = getProfileStats(p);
                    const starCount = typeof (p as any).trust === 'number' ? (p as any).trust : 5;

                    return (
                      <div key={p.id} className={cn(
                        "bg-white rounded-[2rem] border shadow-sm hover:shadow-md transition-all p-6 flex flex-col gap-4 relative overflow-hidden group",
                        p.status === 'blocked' ? "border-red-200 bg-red-50/10" : "border-slate-100"
                      )}>
                        {/* Top Accent Strip */}
                        <div className={cn("absolute top-0 left-0 right-0 h-1.5", p.status === 'blocked' ? "bg-red-500 animate-pulse" : "bg-orange-500")} />
                        
                        {/* Title & Trust Rating */}
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <h4 className={cn("text-sm font-black uppercase tracking-tight truncate select-all", p.status === 'blocked' ? "text-red-700" : "text-slate-900")} title={p.name}>
                              {p.name}
                            </h4>
                            {p.status === 'blocked' ? (
                              <span className="text-[10px] font-black text-red-655 bg-red-100 px-2 py-0.5 rounded uppercase tracking-wider inline-block mt-1 animate-pulse border border-red-200">
                                🚫 ENTREGADOR BLOQUEADO
                              </span>
                            ) : (
                              <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded uppercase tracking-wider inline-block mt-1">
                                {p.company || 'Autônomo/Individual'}
                              </span>
                            )}
                          </div>
                          
                          {/* Stars */}
                          <div className="flex gap-0.5 shrink-0" title={`Confiança: ${starCount} estrelas`}>
                            {Array.from({ length: 5 }).map((_, idx) => (
                              <Star 
                                key={idx} 
                                className={cn(
                                  "w-3.5 h-3.5",
                                  idx < starCount ? "text-amber-400 fill-amber-400" : "text-slate-200"
                                )} 
                              />
                            ))}
                          </div>
                        </div>

                        {/* Middle Info Block */}
                        <div className="text-[11px] text-slate-500 font-medium space-y-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-100/50">
                          <div className="flex justify-between">
                            <span className="font-bold text-slate-400 uppercase">Documentos:</span>
                            <span className="text-slate-800 uppercase font-bold">{p.cpf ? `CPF ${p.cpf}` : p.rg ? `RG ${p.rg}` : 'Não Informado'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-bold text-slate-400 uppercase">Telefone:</span>
                            <span className="text-slate-800 uppercase font-bold">{p.phone ? p.phone : 'Não Cadastrado'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-bold text-slate-400 uppercase">Acessos Totais:</span>
                            <span className="text-blue-600 font-extrabold text-xs uppercase">{stats.accessCount} vezes</span>
                          </div>
                          {stats.allPlates.length > 0 && (
                            <div className="pt-1 border-t border-slate-200/40">
                              <span className="font-bold text-slate-400 uppercase block mb-1">Placas Associadas:</span>
                              <div className="flex flex-wrap gap-1.5 max-h-[50px] overflow-y-auto no-scrollbar">
                                {stats.allPlates.map(plate => (
                                  <span key={plate} className="px-2 py-0.5 bg-slate-900 border border-slate-800 text-emerald-400 font-mono text-[9px] font-black rounded-md tracking-wider">
                                    {plate}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* History Dates block */}
                        <div className="grid grid-cols-2 gap-2 text-[9px] text-slate-400 font-bold uppercase">
                          <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100/30">
                            <span className="block text-slate-400 mb-0.5">Primeiro Acesso</span>
                            <span className="text-slate-700 font-sans block">{stats.firstVisit ? format(stats.firstVisit, 'dd/MM/yyyy HH:mm') : '-'}</span>
                          </div>
                          <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100/30">
                            <span className="block text-slate-400 mb-0.5">Último Acesso</span>
                            <span className="text-slate-700 font-sans block">{stats.lastVisit ? format(stats.lastVisit, 'dd/MM/yyyy HH:mm') : '-'}</span>
                          </div>
                        </div>

                        {/* Block Reason block if present */}
                        {p.status === 'blocked' && p.blockReason && (
                          <div className="text-[10px] bg-red-100/55 border border-red-200 p-3 rounded-xl italic text-red-850 font-bold">
                            <strong className="uppercase text-red-900">Motivo de Bloqueio: </strong>{p.blockReason}
                          </div>
                        )}

                        {/* Observações */}
                        {(p.notes || (p as any).observation) && (
                          <div className="text-[10px] bg-amber-50/40 border border-amber-100/60 p-3 rounded-xl italic text-amber-800">
                            <strong>Obs: </strong>{p.notes || (p as any).observation}
                          </div>
                        )}

                        {/* Actions block footer */}
                        <div className="space-y-2 border-t border-slate-100 pt-3">
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedProfileForBlock(p);
                                setBlockReasonInput('');
                                setIsBlockModalOpen(true);
                              }}
                              disabled={p.status === 'blocked'}
                              className={cn(
                                "py-1.5 px-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5 active:scale-95 text-center min-h-[34px]",
                                p.status === 'blocked'
                                  ? "bg-slate-150 text-slate-400 cursor-not-allowed border border-slate-200/50 opacity-60"
                                  : "bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100"
                              )}
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                              🚫 BLOQUEAR
                            </button>

                            <button
                              type="button"
                              onClick={() => handleUnblockProfile(p)}
                              disabled={p.status !== 'blocked'}
                              className={cn(
                                "py-1.5 px-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5 active:scale-95 text-center min-h-[34px]",
                                p.status !== 'blocked'
                                  ? "bg-slate-150 text-slate-400 cursor-not-allowed border border-slate-200/50 opacity-60"
                                  : "bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100"
                              )}
                            >
                              <Unlock className="w-3.5 h-3.5" />
                              ✅ DESBLOQUEAR
                            </button>
                          </div>

                          <div className="flex gap-2">
                            <button 
                              type="button"
                              onClick={() => handleOpenProfileEdit(p)}
                              className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5 active:scale-95 text-center min-h-[30px]"
                            >
                              <Edit2 className="w-3 h-3 text-slate-500" />
                              Editar
                            </button>
                            <button 
                              type="button"
                              onClick={() => handleDeleteProfile(p.id)}
                              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-xl transition active:scale-95 flex items-center justify-center shrink-0 min-h-[30px]"
                              title="Remover Cadastro Permanente"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {permanentProfiles.filter(p => p.type === 'delivery').length === 0 && (
                <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-200 text-slate-400 uppercase font-black text-xs">
                  Nenhum entregador cadastrado permanentemente na base.
                </div>
              )}
            </div>
          )}

          {/* BANCO DE VISITANTES VIEW */}
          {subView === 'banco_visitantes' && (
            <div className="space-y-6 animate-fade-in text-slate-700">
              <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col lg:flex-row justify-between items-center gap-4">
                <div className="flex-1 w-full relative">
                  <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Pesquisar visitante por nome, CPF, RG, telefone ou observações..."
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none font-medium text-slate-700"
                    value={visitanteSearch}
                    onChange={e => setVisitanteSearch(e.target.value)}
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto shrink-0">
                  <select 
                    className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase outline-none text-slate-700"
                    value={visitanteUnitFilter}
                    onChange={e => setVisitanteUnitFilter(e.target.value)}
                  >
                    <option value="all">TODOS OS DESTINOS</option>
                    {Array.from(new Set(permanentProfiles.filter(p => p.type !== 'delivery' && p.unit).map(p => p.unit))).map(ut => (
                      <option key={ut} value={ut}>CASA {ut}</option>
                    ))}
                  </select>
                  <button 
                    onClick={() => handleOpenProfileAdd('visitor')}
                    className="h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer shadow-sm active:scale-95 whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    Cadastrar Visitante
                  </button>
                </div>
              </div>

              {/* Grid of Visitors */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {permanentProfiles
                  .filter(p => p.type !== 'delivery')
                  .filter(p => {
                    const stats = getProfileStats(p);
                    const q = visitanteSearch.toLowerCase().trim();
                    if (!q) return true;
                    
                    const normName = p.name.toLowerCase();
                    const cleanQ = q.replace(/\D/g, '');
                    const normPlateQ = q.toUpperCase().replace(/[^A-Z0-9]/g, '');

                    const matchesName = normName.includes(q);

                    const pCpf = (p.cpf || '').toLowerCase();
                    const pCpfDigits = pCpf.replace(/\D/g, '');
                    const pRg = (p.rg || '').toLowerCase();
                    const pRgDigits = pRg.replace(/\D/g, '');

                    const matchesCpf = pCpf.includes(q) || (cleanQ.length > 0 && pCpfDigits.includes(cleanQ));
                    const matchesRg = pRg.includes(q) || (cleanQ.length > 0 && pRgDigits.includes(cleanQ));

                    const pPhone = (p.phone || '').toLowerCase();
                    const pPhoneDigits = pPhone.replace(/\D/g, '');
                    const matchesPhone = pPhone.includes(q) || (cleanQ.length > 0 && pPhoneDigits.includes(cleanQ));

                    const pNotes = (p.notes || (p as any).observation || '').toLowerCase();
                    const matchesNotes = pNotes.includes(q);

                    const matchesPlate = (p.plate && p.plate.toUpperCase().replace(/[^A-Z0-9]/g, '').includes(normPlateQ)) ||
                                         (p.platesHistory || []).some(plate => plate.toUpperCase().replace(/[^A-Z0-9]/g, '').includes(normPlateQ)) ||
                                         stats.allPlates.some(plate => plate.toUpperCase().replace(/[^A-Z0-9]/g, '').includes(normPlateQ));

                    const matchesUnit = stats.visitedUnits.some(u => u.toLowerCase().includes(q)) ||
                                        (p.unit && p.unit.toLowerCase().includes(q));

                    return matchesName || 
                           (q.length > 0 && (matchesCpf || matchesRg || matchesPhone)) || 
                           (normPlateQ.length > 0 && matchesPlate) || 
                           matchesNotes || 
                           matchesUnit;
                  })
                  .filter(p => visitanteUnitFilter === 'all' || p.unit === visitanteUnitFilter)
                  .map(p => {
                    const stats = getProfileStats(p);
                    
                    return (
                      <div key={p.id} className={cn(
                        "bg-white rounded-[2rem] border shadow-sm hover:shadow-md transition-all p-6 flex flex-col gap-4 relative overflow-hidden group",
                        p.status === 'blocked' ? "border-red-200 bg-red-50/10" : "border-slate-100"
                      )}>
                        {/* Top Accent Strip */}
                        <div className={cn("absolute top-0 left-0 right-0 h-1.5", p.status === 'blocked' ? "bg-red-500 animate-pulse" : "bg-emerald-500")} />
                        
                        {/* Title & Type Badge */}
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <h4 className={cn("text-sm font-black uppercase tracking-tight truncate select-all", p.status === 'blocked' ? "text-red-700" : "text-slate-900")} title={p.name}>
                              {p.name}
                            </h4>
                            {p.status === 'blocked' ? (
                              <span className="text-[10px] font-black text-red-650 bg-red-100 px-2 py-0.5 rounded uppercase tracking-wider inline-block mt-1 animate-pulse border border-red-200">
                                🚫 VISITANTE BLOQUEADO
                              </span>
                            ) : (
                              <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase tracking-wider inline-block mt-1">
                                {p.type === 'service' ? 'Prestador' : p.type === 'uber' ? 'Uber/Motorista' : 'Visitante Regular'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Middle Info Block */}
                        <div className="text-[11px] text-slate-500 font-medium space-y-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-100/50">
                          <div className="flex justify-between">
                            <span className="font-bold text-slate-400 uppercase">Parentesco / Relação:</span>
                            <span className="text-slate-800 uppercase font-black">{p.relationship || 'Visitante Autorizado'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-bold text-slate-400 uppercase">Documentos:</span>
                            <span className="text-slate-800 uppercase font-bold">{p.cpf ? `CPF ${p.cpf}` : p.rg ? `RG ${p.rg}` : 'Não Informado'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-bold text-slate-400 uppercase">Telefone:</span>
                            <span className="text-slate-800 uppercase font-bold">{p.phone ? p.phone : 'Não Cadastrado'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-bold text-slate-400 uppercase">Acessos Totais:</span>
                            <span className="text-blue-600 font-extrabold text-xs uppercase">{stats.accessCount} vezes</span>
                          </div>
                          {stats.visitedUnits.length > 0 && (
                            <div className="pt-1 border-t border-slate-200/40">
                              <span className="font-bold text-slate-400 uppercase block mb-1">Casas Visitadas:</span>
                              <div className="flex flex-wrap gap-1.5 max-h-[50px] overflow-y-auto no-scrollbar">
                                {stats.visitedUnits.map(unit => (
                                  <span key={unit} className="px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-800 text-[9px] font-black rounded-md tracking-wider">
                                    CASA {unit}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* History Dates block */}
                        <div className="grid grid-cols-2 gap-2 text-[9px] text-slate-400 font-bold uppercase">
                          <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100/30">
                            <span className="block text-slate-400 mb-0.5">Primeiro Acesso</span>
                            <span className="text-slate-700 font-sans block">{stats.firstVisit ? format(stats.firstVisit, 'dd/MM/yyyy HH:mm') : '-'}</span>
                          </div>
                          <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100/30">
                            <span className="block text-slate-400 mb-0.5">Último Acesso</span>
                            <span className="text-slate-700 font-sans block">{stats.lastVisit ? format(stats.lastVisit, 'dd/MM/yyyy HH:mm') : '-'}</span>
                          </div>
                        </div>

                        {/* Block Reason block if present */}
                        {p.status === 'blocked' && p.blockReason && (
                          <div className="text-[10px] bg-red-100/55 border border-red-200 p-3 rounded-xl italic text-red-850 font-bold">
                            <strong className="uppercase text-red-900">Motivo de Bloqueio: </strong>{p.blockReason}
                          </div>
                        )}

                        {/* Observações */}
                        {(p.notes || (p as any).observation) && (
                          <div className="text-[10px] bg-slate-100 border border-slate-200 p-3 rounded-xl italic text-slate-600">
                            <strong>Obs: </strong>{p.notes || (p as any).observation}
                          </div>
                        )}

                        {/* Actions block footer */}
                        <div className="space-y-2 border-t border-slate-100 pt-3">
                          <button
                            type="button"
                            disabled={p.status === 'blocked'}
                            onClick={() => {
                              setSelectedProfileForFrequente(p);
                              setFrequenteUnitInput(p.unit || '');
                              setFrequenteRule('AVISAR_ANTES');
                              setIsFrequenteModalOpen(true);
                            }}
                            className={cn(
                              "w-full py-1.5 px-3 text-[10px] font-black uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5 active:scale-95 text-center min-h-[34px]",
                              p.status === 'blocked'
                                ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200/50"
                                : "bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100"
                            )}
                            title={p.status === 'blocked' ? "Visitantes bloqueados não podem ser frequentes" : "Tornar Visitante Frequente"}
                          >
                            <Star className="w-3.5 h-3.5 fill-current" />
                            ⭐ FREQUENTE
                          </button>

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedProfileForBlock(p);
                                setBlockReasonInput('');
                                setIsBlockModalOpen(true);
                              }}
                              disabled={p.status === 'blocked'}
                              className={cn(
                                "py-1.5 px-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5 active:scale-95 text-center min-h-[34px]",
                                p.status === 'blocked'
                                  ? "bg-slate-150 text-slate-400 cursor-not-allowed border border-slate-200/50 opacity-60"
                                  : "bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100"
                              )}
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                              🚫 BLOQUEAR
                            </button>

                            <button
                              type="button"
                              onClick={() => handleUnblockProfile(p)}
                              disabled={p.status !== 'blocked'}
                              className={cn(
                                "py-1.5 px-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5 active:scale-95 text-center min-h-[34px]",
                                p.status !== 'blocked'
                                  ? "bg-slate-150 text-slate-400 cursor-not-allowed border border-slate-200/50 opacity-60"
                                  : "bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100"
                              )}
                            >
                              <Unlock className="w-3.5 h-3.5" />
                              ✅ DESBLOQUEAR
                            </button>
                          </div>

                          <div className="flex gap-2">
                            <button 
                              type="button"
                              onClick={() => handleOpenProfileEdit(p)}
                              className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5 active:scale-95 text-center min-h-[30px]"
                            >
                              <Edit2 className="w-3 h-3 text-slate-500" />
                              Editar Info
                            </button>
                            <button 
                              type="button"
                              onClick={() => handleDeleteProfile(p.id)}
                              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-xl transition active:scale-95 flex items-center justify-center shrink-0 min-h-[30px]"
                              title="Remover Cadastro Permanente"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Excluir
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {permanentProfiles.filter(p => p.type !== 'delivery').length === 0 && (
                <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-200 text-slate-400 uppercase font-black text-xs">
                  Nenhum visitante cadastrado permanentemente na base.
                </div>
              )}
            </div>
          )}

          {/* FREQUENTS VIEW (Reusing Manager) */}
          {subView === 'frequents' && (
            <FrequentVisitorManager 
              visitors={frequentVisitors}
              onUpdate={onUpdateFrequents}
              onReleaseDirect={() => {}} // No release from admin panel
              onClearAll={onClearFrequents}
              readOnly={currentTabIsReadOnly}
            />
          )}

          {/* PREAUTHS VIEW (Reusing Manager) */}
          {subView === 'preauths' && (
            <PreAuthorizationManager 
              preAuths={preAuths}
              unitRules={unitRules}
              frequentVisitors={frequentVisitors}
              onUpdate={onUpdatePreAuths}
              onReleasePreAuth={onReleasePreAuth}
              onUseFrequentData={onUseFrequentData}
              onClearAll={onClearPreAuths}
              readOnly={currentTabIsReadOnly}
            />
          )}

          {subView === 'phones' && (
            userRole === 'sindico' ? (
              <RestrictedScreen onBack={() => setSubView('emergencia')} areaName="Telefones" />
            ) : (
              <UnitPhoneManager 
                unitPhones={unitPhones}
                onUpdate={onUpdateUnitPhones}
                onClearAll={onClearUnitPhones}
                readOnly={currentTabIsReadOnly}
              />
            )
          )}

          {subView === 'rules' && (
            <UnitRulesManager 
              unitRules={unitRules}
              onUpdate={onUpdateUnitRules}
              onClearAll={onClearUnitRules}
              readOnly={currentTabIsReadOnly}
            />
          )}

          {/* REPORTS VIEW */}
          {subView === 'reports' && (
            <div className="space-y-6">
              {/* Report Filters */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    Filtros de Relatório
                  </h3>
                  <div className="flex gap-2">
                    <button 
                      onClick={exportToCSV}
                      className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-200 transition-all"
                    >
                      <TableIcon className="w-4 h-4" />
                      Exportar CSV
                    </button>
                    <button 
                      onClick={exportToExcel}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                    >
                      <Download className="w-4 h-4" />
                      Exportar Excel
                    </button>
                     <button 
                      onClick={exportToPDF}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 cursor-pointer"
                    >
                      <FileText className="w-4 h-4" />
                      PDF COMPLETO
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Período</label>
                    <select 
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase outline-none"
                      value={reportFilters.dateRange}
                      onChange={e => setReportFilters({...reportFilters, dateRange: e.target.value as any})}
                    >
                      <option value="today">Hoje</option>
                      <option value="yesterday">Ontem</option>
                      <option value="last7">Últimos 7 Dias</option>
                      <option value="custom">Personalizado</option>
                    </select>
                  </div>

                  {reportFilters.dateRange === 'custom' && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Início</label>
                        <input 
                          type="date" 
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
                          value={reportFilters.startDate}
                          onChange={e => setReportFilters({...reportFilters, startDate: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Fim</label>
                        <input 
                          type="date" 
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
                          value={reportFilters.endDate}
                          onChange={e => setReportFilters({...reportFilters, endDate: e.target.value})}
                        />
                      </div>
                    </>
                  )}

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Unidade</label>
                    <input 
                      type="text" 
                      placeholder="Ex: 419"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
                      value={reportFilters.unit}
                      onChange={e => setReportFilters({...reportFilters, unit: e.target.value})}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nome</label>
                    <input 
                      type="text" 
                      placeholder="Pesquisar nome..."
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
                      value={reportFilters.name}
                      onChange={e => setReportFilters({...reportFilters, name: e.target.value})}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Tipo</label>
                    <select 
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase outline-none"
                      value={reportFilters.type}
                      onChange={e => setReportFilters({...reportFilters, type: e.target.value as any})}
                    >
                      <option value="all">Todos Tipos</option>
                      <option value="visitor">Visitantes</option>
                      <option value="delivery">Entregas</option>
                      <option value="service">Prestadores</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Origem</label>
                    <select 
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase outline-none"
                      value={reportFilters.origin}
                      onChange={e => setReportFilters({...reportFilters, origin: e.target.value})}
                    >
                      <option value="all">Todas Origens</option>
                      <option value="manual">Manual</option>
                      <option value="Frequente">Frequente</option>
                      <option value="pre_autorizacao">Pré-Autorização</option>
                      <option value="whatsapp">WhatsApp</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Status</label>
                    <select 
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase outline-none"
                      value={reportFilters.status}
                      onChange={e => setReportFilters({...reportFilters, status: e.target.value})}
                    >
                      <option value="all">Todos Status</option>
                      <option value="em_andamento">Em Andamento</option>
                      <option value="finalizado">Finalizado</option>
                      <option value="Liberado Sempre">Liberado Sempre</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Managerial Summary */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total Acessos</span>
                  <span className="text-2xl font-black text-slate-900">{reportStats.total}</span>
                </div>
                <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Visitantes</span>
                  <span className="text-2xl font-black text-emerald-600">{reportStats.visitors}</span>
                </div>
                <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Entregas</span>
                  <span className="text-2xl font-black text-orange-600">{reportStats.deliveries}</span>
                </div>
                <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Prestadores</span>
                  <span className="text-2xl font-black text-blue-600">{reportStats.services}</span>
                </div>
                <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">WhatsApp</span>
                  <span className="text-2xl font-black text-purple-600">{reportStats.whatsapp}</span>
                </div>
                <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Frequentes</span>
                  <span className="text-2xl font-black text-blue-500">{reportStats.frequents}</span>
                </div>
                <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Pré-Autoriz.</span>
                  <span className="text-2xl font-black text-purple-500">{reportStats.preAuths}</span>
                </div>
                <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Manuais</span>
                  <span className="text-2xl font-black text-slate-500">{reportStats.manual}</span>
                </div>
                <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Em Aberto</span>
                  <span className="text-2xl font-black text-blue-600">{reportStats.inProgress}</span>
                </div>
                <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Finalizados</span>
                  <span className="text-2xl font-black text-emerald-600">{reportStats.finished}</span>
                </div>
              </div>

              {/* Preview Table */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prévia dos Dados ({filteredReports.length} registros)</h3>
                  <span className="text-[10px] font-bold text-slate-400 italic">Exibindo até 50 registros na prévia</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data/Hora</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Unidade</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredReports.slice(0, 50).map((record) => (
                        <tr key={record.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-6 py-4 text-xs font-medium text-slate-600">
                            {format(new Date(record.timestamp), 'dd/MM HH:mm')}
                          </td>
                          <td className="px-6 py-4 text-xs font-black text-slate-900 uppercase">
                            {record.destination}
                          </td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-900 uppercase">
                            {record.name}
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-[10px] font-black text-slate-400 uppercase">
                              {record.type === 'visitor' ? 'Visitante' : record.type === 'delivery' ? 'Entrega' : 'Prestador'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "text-[9px] font-black uppercase px-2 py-0.5 rounded-full",
                              record.status === 'em_andamento' ? "bg-blue-50 text-blue-600" : 
                              record.status === 'Liberado Sempre' ? "bg-emerald-100 text-emerald-700" :
                              "bg-emerald-50 text-emerald-600"
                            )}>
                              {record.status === 'em_andamento' ? 'Aberto' : 
                               record.status === 'Liberado Sempre' ? 'Liberado Sempre' : 'Fim'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {onDeleteRecord && (
                              <button 
                                onClick={() => {
                                  if (confirm('Deseja excluir este registro?')) {
                                    onDeleteRecord(record.id);
                                  }
                                }}
                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all active:scale-95"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {filteredReports.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-xs font-bold uppercase">
                            Nenhum registro no período selecionado
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* GESTÃO DE PORTEIROS VIEW */}
          {subView === 'porteiros' && (
            (userRole !== 'admin' || isOperationalControl) ? (
              <RestrictedScreen onBack={() => setSubView('emergencia')} areaName="Gestão de Usuários" />
            ) : (
              <PorterManager 
                porteiros={porteiros}
                onUpdatePorteiros={onUpdatePorteiros}
                condoName={condoInfo.name}
                readOnly={currentTabIsReadOnly}
                activePorterName={loggedPorterName || 'Carlos'}
                onRegisterLog={onRegisterOperationalLog}
              />
            )
          )}

          {/* WHATSAPP SIMULATION VIEW */}
          {subView === 'whatsapp' && (
            userRole === 'sindico' ? (
              <RestrictedScreen onBack={() => setSubView('emergencia')} areaName="WhatsApp (Sim)" />
            ) : (
              <div className={cn(
                "grid gap-6",
                currentTabIsReadOnly ? "grid-cols-1 max-w-2xl mx-auto" : "grid-cols-1 md:grid-cols-2"
              )}>
              {!currentTabIsReadOnly && (
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                  <div>
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Simular Recebimento de Mensagem
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-6">
                      Digite uma mensagem como se fosse um morador autorizando um acesso. 
                      O sistema irá identificar a unidade automaticamente se o número estiver vinculado.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Telefone do Morador</label>
                      <input 
                        type="text" 
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none"
                        value={simulatedSender}
                        onChange={e => setSimulatedSender(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Mensagem</label>
                      <textarea 
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none min-h-[120px] resize-none"
                        placeholder='Ex: "Pode liberar o motoboy do iFood na casa 419"'
                        value={simulatedMessage}
                        onChange={e => setSimulatedMessage(e.target.value)}
                      />
                    </div>
                    <button 
                      onClick={handleSimulateWhatsApp}
                      className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all shadow-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-100"
                    >
                      <Send className="w-4 h-4" />
                      Simular Envio
                    </button>
                  </div>

                  <div className="pt-6 border-t border-slate-100">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase mb-3">Exemplos que funcionam:</h4>
                    <div className="flex flex-wrap gap-2">
                      {[
                        "Pode liberar minha mãe na casa 354",
                        "Vai chegar o João na casa 210",
                        "Pode liberar o motoboy do iFood na casa 419",
                        "Hoje vai o eletricista na casa 102",
                        "Pode liberar entrega na casa 88"
                      ].map((ex, i) => (
                        <button 
                          key={i}
                          onClick={() => setSimulatedMessage(ex)}
                          className="px-3 py-1.5 border rounded-lg text-[10px] font-bold transition-all bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100"
                        >
                          {ex}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {!currentTabIsReadOnly && (
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm min-h-[300px] flex flex-col">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Visualização da Resposta Automática</h3>
                    
                    {simulatedResponse ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
                          <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <div className="max-w-xs">
                          <p className="text-sm font-bold text-slate-900 leading-relaxed">
                            {simulatedResponse}
                          </p>
                        </div>
                        <button 
                          onClick={() => setSimulatedResponse(null)}
                          className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
                        >
                          Nova Simulação
                        </button>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-300">
                        <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
                        <p className="text-xs font-bold uppercase">Aguardando simulação...</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-blue-600 p-8 rounded-[2rem] text-white shadow-xl shadow-blue-100">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-white/20 rounded-xl">
                      <Zap className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-widest">
                      Integração WhatsApp
                    </h3>
                  </div>
                  
                  <div className="space-y-6">
                    {[
                      { step: "1", text: "O morador envia uma mensagem autorizando alguém." },
                      { step: "2", text: "O sistema identifica a unidade, o tipo de acesso e o nome." },
                      { step: "3", text: "Uma pré-autorização é criada instantaneamente com origem \"WhatsApp\"." },
                      { step: "4", text: "O porteiro visualiza o aviso na busca unificada ao pesquisar pela casa." }
                    ].map((item, idx) => (
                      <div key={idx} className="flex gap-4 items-start">
                        <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black">
                          {item.step}
                        </div>
                        <p className="text-xs font-medium leading-relaxed opacity-90">
                          {item.text}
                        </p>
                      </div>
                    ))}
                  </div>

                  {currentTabIsReadOnly && (
                    <div className="mt-8 pt-6 border-t border-white/10">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Status do Serviço</p>
                      <div className="flex items-center gap-2 text-emerald-300">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                        <span className="text-[10px] font-black uppercase">Sistema Online e Operacional</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            )
          )}

          {/* SECURITY CENTER VIEW */}
          {subView === 'security_center' && (
            userRole !== 'admin' ? (
              <RestrictedScreen onBack={() => setSubView('emergencia')} areaName="Central de Segurança" />
            ) : (
              <SecurityCenter 
                onRegisterOperationalLog={onRegisterOperationalLog}
                userRole={userRole}
              />
            )
          )}

          {/* CONFIG VIEW */}
          {subView === 'config' && (
            (userRole === 'sindico' || hideTechnicalConfig) ? (
              <RestrictedScreen onBack={() => setSubView('emergencia')} areaName="Configurações" />
            ) : (
              <ConfigView 
                condoInfo={condoInfo}
                adminUsers={adminUsers}
                systemSettings={systemSettings}
                messageTemplates={messageTemplates}
                onUpdateCondoInfo={onUpdateCondoInfo}
                onUpdateAdminUsers={onUpdateAdminUsers}
                onUpdateSystemSettings={onUpdateSystemSettings}
                onUpdateMessageTemplates={onUpdateMessageTemplates}
                onClearTestData={onClearTestData}
                onClearAccessRecords={onClearAccessRecords}
                onClearPreAuths={onClearPreAuths}
                onClearFrequents={onClearFrequents}
              />
            )
          )}

          {/* EMERGENCIA (OPERATIONAL ACCELERATORS) VIEW */}
          {subView === 'emergencia' && (
            <OperationalControl 
              operator={userRole === 'sindico' ? 'Síndico (Gestor)' : 'Porteiro'}
              logs={operationalLogs}
              onTriggerAction={onTriggerOperationalAction}
              onClearLogs={onClearOperationalLogs}
              userRole={userRole}
              unitPhones={unitPhones}
              onUpdateUnitPhones={onUpdateUnitPhones}
              onClearUnitPhones={onClearUnitPhones}
            />
          )}
        </div>
      </div>

      {/* MODAL DE TORNAR VISITANTE FREQUENTE */}
      {isFrequenteModalOpen && selectedProfileForFrequente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div 
            className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-[2.5rem] shrink-0">
              <div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-blue-500 fill-blue-500 animate-pulse" />
                  PROMOVER A VISITANTE FREQUENTE
                </h3>
                <h2 className="text-base font-black text-slate-850 uppercase tracking-tight mt-1 truncate max-w-xs" title={selectedProfileForFrequente.name}>
                  {selectedProfileForFrequente.name}
                </h2>
              </div>
              <button 
                onClick={() => setIsFrequenteModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Unit Input */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Casa / Unidade</label>
                <input 
                  type="text"
                  placeholder="EX: 426"
                  maxLength={10}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none font-extrabold text-slate-800 uppercase"
                  value={frequenteUnitInput}
                  onChange={e => setFrequenteUnitInput(e.target.value)}
                />
                <p className="text-[9px] text-slate-400 font-bold uppercase">Informe a casa associada a este visitante frequente.</p>
              </div>

              {/* Release Rule Selector */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Modo de Liberação</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFrequenteRule('AVISAR_ANTES')}
                    className={cn(
                      "p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 transition active:scale-95 text-center cursor-pointer",
                      frequenteRule === 'AVISAR_ANTES' 
                        ? "border-amber-500 bg-amber-500/5 text-amber-700" 
                        : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                    )}
                  >
                    <span className="text-sm font-black uppercase">AVISAR ANTES</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase leading-[1.1]">Sempre notificar a unidade para autorizar entrada</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFrequenteRule('SEMPRE_LIBERADO')}
                    className={cn(
                      "p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 transition active:scale-95 text-center cursor-pointer",
                      frequenteRule === 'SEMPRE_LIBERADO' 
                        ? "border-emerald-500 bg-emerald-500/5 text-emerald-700" 
                        : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                    )}
                  >
                    <span className="text-sm font-black uppercase">LIBERAÇÃO DIRETA</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase leading-[1.1]">Permitir liberação sem necessidade de aviso manual</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-[2.5rem] flex gap-3 justify-end shrink-0">
              <button 
                type="button"
                onClick={() => setIsFrequenteModalOpen(false)}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition active:scale-95"
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={handleConfirmFrequents}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition active:scale-95 border border-blue-500 shadow-md shadow-blue-200/50"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE BLOQUEAR VISITANTE / ENTREGADOR */}
      {isBlockModalOpen && selectedProfileForBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div 
            className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-[2.5rem] shrink-0">
              <div>
                <h3 className="text-xs font-black text-slate-405 uppercase tracking-widest flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-red-500 animate-bounce" />
                  {selectedProfileForBlock.type === 'delivery' ? 'BLOQUEAR ENTREGADOR' : 'BLOQUEAR VISITANTE'}
                </h3>
                <h2 className="text-base font-black text-rose-700 uppercase tracking-tight mt-1 truncate max-w-xs" title={selectedProfileForBlock.name}>
                  {selectedProfileForBlock.name}
                </h2>
              </div>
              <button 
                onClick={() => setIsBlockModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                Bloquear cadastro?
              </h2>
              
              <p className="text-xs font-extrabold text-slate-600 uppercase tracking-tight bg-slate-100 p-4 border border-slate-200/50 rounded-xl">
                ⚠️ CONFIRMA O BLOQUEIO DESTE CADASTRO?<br />
                Não será possível preencher automaticamente ou permitir liberação direta enquanto estiver bloqueado.
              </p>

              {/* Reason Input */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Motivo do bloqueio:</label>
                <input 
                  type="text"
                  placeholder="EX: Medida protetiva, Pessoa não autorizada, etc."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500/20 outline-none font-medium text-slate-700"
                  value={blockReasonInput}
                  onChange={e => setBlockReasonInput(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-[2.5rem] flex gap-3 justify-end shrink-0">
              <button 
                type="button"
                onClick={() => setIsBlockModalOpen(false)}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition active:scale-95"
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={handleConfirmBlock}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition active:scale-95 border border-red-500 shadow-md shadow-red-200/50"
              >
                [CONFIRMAR]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EXCLUSÃO DE VISITANTE */}
      {isDeleteModalOpen && profileToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div 
            className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-[2.5rem] shrink-0">
              <div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Trash2 className="w-4 h-4 text-red-500 animate-pulse" />
                  REMOVER VISITANTE PERMANENTE
                </h3>
                <h2 className="text-base font-black text-slate-900 uppercase tracking-tight mt-1 truncate max-w-xs" title={profileToDelete.name}>
                  {profileToDelete.name}
                </h2>
              </div>
              <button 
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setProfileToDelete(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <p className="text-sm font-black text-red-600 uppercase text-center py-3 bg-red-50 rounded-xl border border-red-100">
                ⚠️ Excluir visitante do banco permanente?
              </p>
              
              <div className="space-y-2 text-xs font-bold text-slate-500 uppercase">
                <p className="text-slate-600 font-extrabold text-center">
                  Esta ação é irreversível e removerá todos os dados do banco permanente:
                </p>
                <ul className="list-disc list-inside space-y-1.5 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-slate-650">
                  <li>Cadastro completo do visitante</li>
                  <li>Associações e vínculos com unidades/casas</li>
                  <li>Inscrições no Banco de Visitantes</li>
                  <li>Configurações de "Avisar Antes"</li>
                  <li>Configurações de "Liberação Direta"</li>
                  <li>Status e motivos de bloqueio</li>
                </ul>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-[2.5rem] flex gap-3 justify-end shrink-0">
              <button 
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setProfileToDelete(null);
                }}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition active:scale-95"
              >
                NÃO
              </button>
              <button 
                type="button"
                onClick={handleConfirmDeleteProfile}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition active:scale-95 border border-red-500 shadow-md shadow-red-200/50"
              >
                SIM
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CADASTRO/EDIÇÃO PERMANENTE */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div 
            className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-[2.5rem] shrink-0">
              <div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Controle Cadastral Permanente</h3>
                <h2 className="text-base font-black text-slate-850 uppercase tracking-tight mt-1">
                  {editingProfile ? `Editar Cadastro: ${editingProfile.name}` : 'Novo Cadastro Permanente'}
                </h2>
              </div>
              <button 
                onClick={() => setIsProfileModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveProfile} className="flex-1 overflow-y-auto p-6 space-y-5 no-scrollbar">
              {/* Category Selection */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo de Cadastro</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setProfileFormType('delivery')}
                    className={cn(
                      "py-3 rounded-xl border text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2",
                      profileFormType === 'delivery' 
                        ? "border-orange-500 bg-orange-50/50 text-orange-700" 
                        : "border-slate-200 hover:border-slate-300 text-slate-500"
                    )}
                  >
                    <Bike className="w-4 h-4" />
                    Entregador
                  </button>
                  <button
                    type="button"
                    onClick={() => setProfileFormType('visitor')}
                    className={cn(
                      "py-3 rounded-xl border text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2",
                      profileFormType !== 'delivery' 
                        ? "border-emerald-500 bg-emerald-50/50 text-emerald-700" 
                        : "border-slate-200 hover:border-slate-300 text-slate-500"
                    )}
                  >
                    <Users className="w-4 h-4" />
                    Visitante / Outro
                  </button>
                </div>
              </div>

              {/* Nome Completo */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-bold text-slate-500">Nome Completo *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Nome completo..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none font-medium text-slate-700"
                  value={profileFormName}
                  onChange={e => setProfileFormName(e.target.value)}
                />
              </div>

              {/* CPF & RG */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-bold text-slate-500">CPF</label>
                  <input 
                    type="text" 
                    placeholder="Ex: 123.456.789-00"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none font-medium text-slate-700 font-mono"
                    value={profileFormCpf}
                    onChange={e => setProfileFormCpf(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-bold text-slate-500">RG</label>
                  <input 
                    type="text" 
                    placeholder="Ex: 12.345.678-9"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none font-medium text-slate-700 font-mono"
                    value={profileFormRg}
                    onChange={e => setProfileFormRg(e.target.value)}
                  />
                </div>
              </div>

              {/* Telefone */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-bold text-slate-500">Telefone / WhatsApp</label>
                <input 
                  type="text" 
                  placeholder="Ex: (11) 99999-9999"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none font-medium text-slate-700"
                  value={profileFormPhone}
                  onChange={e => setProfileFormPhone(e.target.value)}
                />
              </div>

              {/* Conditional Section for Delivery vs Visitor */}
              {profileFormType === 'delivery' ? (
                <div className="grid grid-cols-2 gap-4">
                  {/* Empresa */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-bold text-slate-500">Empresa / App</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Mercado Livre, iFood..."
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none font-medium text-slate-700"
                      value={profileFormCompany}
                      onChange={e => setProfileFormCompany(e.target.value)}
                    />
                  </div>
                  {/* Nível de Confiança */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-bold text-slate-500">Nível de Confiança</label>
                    <select
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none font-bold text-slate-700"
                      value={profileFormTrust}
                      onChange={e => setProfileFormTrust(Number(e.target.value))}
                    >
                      <option value="5">⭐⭐⭐⭐⭐ (Confiável)</option>
                      <option value="4">⭐⭐⭐⭐ (Alto)</option>
                      <option value="3">⭐⭐⭐ (Médio)</option>
                      <option value="2">⭐⭐ (Alerta)</option>
                      <option value="1">⭐ (Bloqueado)</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {/* Unidade Principal / Casa */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-bold text-slate-500">Casa / Unidade</label>
                    <input 
                      type="text" 
                      placeholder="Ex: 426, 118..."
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none font-medium text-slate-700"
                      value={profileFormUnit}
                      onChange={e => setProfileFormUnit(e.target.value)}
                    />
                  </div>
                  {/* Relação / Parentesco */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-bold text-slate-500">Parentesco / Vínculo</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Primo, Amigo, Prestador..."
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none font-medium text-slate-700"
                      value={profileFormRelationship}
                      onChange={e => setProfileFormRelationship(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Plates list association */}
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-bold text-slate-600">Veículo & Placas Associadas</label>
                
                <div className="grid grid-cols-2 gap-4 mb-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Modelo do Carro/Moto</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Honda Civic, CG 160..."
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
                      value={profileFormVehicleModel}
                      onChange={e => setProfileFormVehicleModel(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Cor do Veículo</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Preto, Prata, Branco..."
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
                      value={profileFormVehicleColor}
                      onChange={e => setProfileFormVehicleColor(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Adicionar placa (pressione Enter ou clique em Vincular)..."
                    className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono uppercase focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-700"
                    value={newPlateInput}
                    onChange={e => setNewPlateInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddPlateTag();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddPlateTag}
                    className="px-4 bg-slate-900 text-emerald-400 border border-slate-800 font-black rounded-xl text-xs uppercase hover:bg-slate-800 transition active:scale-95 flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    Vincular
                  </button>
                </div>

                {/* Render Plates Badges list */}
                {profileFormPlatesList.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {profileFormPlatesList.map(plate => (
                      <span key={plate} className="px-2.5 py-1 bg-slate-900 border border-slate-800 text-emerald-400 font-mono text-[10px] font-black rounded-lg flex items-center gap-1.5 shadow-sm tracking-wider">
                        {plate}
                        <button
                          type="button"
                          onClick={() => handleRemovePlateTag(plate)}
                          className="text-red-400 hover:text-red-600 focus:outline-none w-3.5 h-3.5 flex items-center justify-center rounded-full bg-slate-800/85 hover:bg-red-50 transition-all text-[8px] font-bold font-sans cursor-pointer"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Observações / Notas */}
              <div className="space-y-1 border-t border-slate-100 pt-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-bold text-slate-500">Observações e Alertas</label>
                <textarea 
                  placeholder="Informações adicionais importantes..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none font-medium text-slate-700 min-h-[75px] max-h-[150px]"
                  value={profileFormNotes}
                  onChange={e => setProfileFormNotes(e.target.value)}
                />
              </div>

              {/* Footer actions inside form block */}
              <div className="flex gap-4 border-t border-slate-100 pt-6 mt-6 shrink-0 bg-white">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="flex-1 py-3 border border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-700 font-black rounded-xl text-xs uppercase tracking-wider transition cursor-pointer active:scale-95 text-center"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs uppercase tracking-wider transition cursor-pointer shadow-lg shadow-blue-100 active:scale-95"
                >
                  Salvar Cadastro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ConfigView({ 
  condoInfo, 
  adminUsers, 
  systemSettings,
  messageTemplates,
  onUpdateCondoInfo, 
  onUpdateAdminUsers,
  onUpdateSystemSettings,
  onUpdateMessageTemplates,
  onClearTestData,
  onClearAccessRecords,
  onClearPreAuths,
  onClearFrequents,
}: { 
  condoInfo: CondoInfo, 
  adminUsers: AdminUser[], 
  systemSettings: SystemSettings,
  messageTemplates: MessageTemplates,
  onUpdateCondoInfo: (info: CondoInfo) => void,
  onUpdateAdminUsers: (users: AdminUser[]) => void,
  onUpdateSystemSettings: (settings: SystemSettings) => void,
  onUpdateMessageTemplates: (templates: MessageTemplates) => void,
  onClearTestData?: () => void,
  onClearAccessRecords?: () => void,
  onClearPreAuths?: () => void,
  onClearFrequents?: () => void
}) {
  const [editingCondo, setEditingCondo] = useState(condoInfo);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [localSettings, setLocalSettings] = useState(systemSettings);
  const [localTemplates, setLocalTemplates] = useState(messageTemplates);

  // Sync state if props change
  useEffect(() => {
    setEditingCondo(condoInfo);
    setLocalSettings(systemSettings);
    setLocalTemplates(messageTemplates);
  }, [condoInfo, systemSettings, messageTemplates]);

  const handleSaveCondo = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateCondoInfo(editingCondo);
    toast.success('Configurações do condomínio salvas!');
  };

  const handleSaveSettings = () => {
    onUpdateSystemSettings(localSettings);
    toast.success('Configurações operacionais e permissões salvas!');
  };

  const handleSaveTemplates = () => {
    onUpdateMessageTemplates(localTemplates);
    toast.success('Padrões de mensagem salvos!');
  };

  const resetTemplate = (key: keyof MessageTemplates) => {
    const defaults: MessageTemplates = {
      deliveryAuth: "Olá, {nome_morador}. Chegou uma entrega para a unidade {unidade}. Podemos autorizar a entrada do entregador?",
      visitorArrival: "Olá, {nome_morador}. O visitante {nome_visitante} chegou para sua unidade {unidade}. Autoriza a entrada?",
      serviceArrival: "Olá, {nome_morador}. O prestador {nome_prestador} chegou para sua unidade {unidade}. Autoriza a entrada?",
      deliveryNotLiberated: "{saudacao}, {nome_morador}. Chegou uma entrega para a unidade {unidade}, porém a entrada não foi liberada pela portaria. Poderia confirmar a autorização ou enviar mais informações?",
      authConfirmation: "Autorização recebida! Liberando o acesso para a unidade {unidade}. Obrigado!",
      thanksClosure: "Obrigado pela confirmação! Desejamos um ótimo dia no {condominio}."
    };
    setLocalTemplates(prev => ({ ...prev, [key]: defaults[key] }));
    toast.info('Mensagem restaurada para o padrão.');
  };

  const handleToggleUserStatus = (id: string) => {
    const updatedUsers = adminUsers.map(u => u.id === id ? { ...u, active: !u.active } : u);
    const activeCount = updatedUsers.filter(u => u.active).length;
    
    if (activeCount < 1) {
      toast.error('Deve haver pelo menos um usuário ativo no sistema.');
      return;
    }
    
    onUpdateAdminUsers(updatedUsers);
    toast.success(`Usuário ${updatedUsers.find(u => u.id === id)?.active ? 'ativado' : 'inativado'} com sucesso.`);
  };

  const handleDeleteUser = (id: string) => {
    if (window.confirm('Deseja realmente excluir este usuário?')) {
      const updatedUsers = adminUsers.filter(u => u.id !== id);
      const activeCount = updatedUsers.filter(u => u.active).length;
      
      if (activeCount < 1 && adminUsers.find(u => u.id === id)?.active) {
        toast.error('Deve haver pelo menos um usuário ativo no sistema.');
        return;
      }
      
      onUpdateAdminUsers(updatedUsers);
      toast.success('Usuário removido com sucesso.');
    }
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const newUser: AdminUser = {
      id: editingUser?.id || crypto.randomUUID(),
      name: formData.get('name') as string,
      contact: formData.get('contact') as string,
      type: formData.get('type') as 'porteiro' | 'sindico',
      active: editingUser ? editingUser.active : true
    };

    if (editingUser) {
      onUpdateAdminUsers(adminUsers.map(u => u.id === editingUser.id ? newUser : u));
    } else {
      onUpdateAdminUsers([...adminUsers, newUser]);
    }

    setEditingUser(null);
    setIsAddingUser(false);
    toast.success(`Usuário ${editingUser ? 'atualizado' : 'cadastrado'} com sucesso!`);
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* CONDO INFO */}
        <div className="space-y-4">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Building className="w-4 h-4 text-blue-500" />
            Dados do Condomínio
          </h3>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <form onSubmit={handleSaveCondo} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Condomínio</label>
                <input 
                  type="text" 
                  value={editingCondo.name}
                  onChange={e => setEditingCondo({...editingCondo, name: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none"
                  placeholder="Ex: Residencial Portaria Pro"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Síndico Responsável</label>
                <input 
                  type="text" 
                  value={editingCondo.managerName}
                  onChange={e => setEditingCondo({...editingCondo, managerName: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none"
                  placeholder="Ex: João Silva"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Endereço Completo</label>
                <textarea 
                  value={editingCondo.address}
                  onChange={e => setEditingCondo({...editingCondo, address: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none min-h-[100px] resize-none"
                  placeholder="Avenida Exemplo, 123..."
                  required
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-blue-600 text-white rounded-xl py-3.5 font-black text-[11px] uppercase tracking-widest hover:bg-blue-700 active:scale-[0.98] transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                Salvar Alterações
              </button>
            </form>
          </div>
        </div>

        {/* OPERATIONAL SETTINGS */}
        <div className="space-y-4">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            Configurações Operacionais
          </h3>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
            <div className="space-y-4">
              <ToggleRow 
                label="Liberação direta (Frequentes)" 
                description="Permite liberar visitantes sem confirmar se a regra for SEMPRE_LIBERADO"
                active={localSettings.allowFrequentDirectRelease}
                onToggle={() => setLocalSettings({...localSettings, allowFrequentDirectRelease: !localSettings.allowFrequentDirectRelease})}
              />
              <ToggleRow 
                label="Liberação automática (Entregas)" 
                description="Sugere liberação automática para serviços de delivery conhecidos"
                active={localSettings.allowAutoDeliveryRelease}
                onToggle={() => setLocalSettings({...localSettings, allowAutoDeliveryRelease: !localSettings.allowAutoDeliveryRelease})}
              />
              <ToggleRow 
                label="Exigir confirmação de Visitante" 
                description="Sempre abre tela de confirmação antes de liberar novos acessos"
                active={localSettings.requireVisitorConfirmationByDefault}
                onToggle={() => setLocalSettings({...localSettings, requireVisitorConfirmationByDefault: !localSettings.requireVisitorConfirmationByDefault})}
              />
              <ToggleRow 
                label="Documento Obrigatório (RG/CPF)" 
                description="Exige preenchimento de documento para visitantes e prestadores"
                active={localSettings.requireDocumentMandatory}
                onToggle={() => setLocalSettings({...localSettings, requireDocumentMandatory: !localSettings.requireDocumentMandatory})}
              />

              <div className="pt-4 border-t border-slate-100/80 space-y-2.5">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tempo de Limpeza da Timeline</span>
                  <span className="text-[9px] text-slate-400 font-bold ml-1 leading-tight">Remove os registros da exibição do plantão após este período (não apaga do histórico real).</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[6, 12, 24].map((hours) => (
                    <button
                      key={hours}
                      type="button"
                      onClick={() => setLocalSettings({ ...localSettings, timelineCleanupHours: hours })}
                      className={cn(
                        "py-2 px-1.5 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all text-center",
                        localSettings.timelineCleanupHours === hours
                          ? "bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-200"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      {hours} Horas
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      if ([6, 12, 24].includes(localSettings.timelineCleanupHours || 12)) {
                        setLocalSettings({ ...localSettings, timelineCleanupHours: 8 });
                      }
                    }}
                    className={cn(
                      "py-2 px-1.5 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all text-center",
                      ![6, 12, 24].includes(localSettings.timelineCleanupHours || 12)
                        ? "bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-200"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    Customizado
                  </button>
                </div>
                {![6, 12, 24].includes(localSettings.timelineCleanupHours || 12) && (
                  <div className="flex items-center gap-2 mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 animate-in fade-in duration-200">
                    <input
                      type="number"
                      min="1"
                      max="720"
                      value={localSettings.timelineCleanupHours || 12}
                      onChange={(e) => setLocalSettings({ ...localSettings, timelineCleanupHours: Math.max(1, parseInt(e.target.value) || 12) })}
                      className="w-16 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-center outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                    <span className="text-[10px] font-bold text-slate-500">horas de permanência na timeline</span>
                  </div>
                )}
              </div>
            </div>
            <button 
              onClick={handleSaveSettings}
              className="w-full bg-slate-900 text-white rounded-xl py-3.5 font-black text-[11px] uppercase tracking-widest hover:bg-slate-800 active:scale-[0.98] transition-all shadow-lg shadow-slate-100 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              Salvar Configurações
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ACCESS CONTROL (PERMISSIONS) */}
        <div className="space-y-4">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            Controle de Acesso (Permissões)
          </h3>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
            <div className="space-y-6">
              <div className="space-y-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <User className="w-3 h-3" /> Porteiro pode:
                </span>
                <div className="space-y-2 bg-slate-50 p-4 rounded-2xl">
                  <PermissionItem 
                    label="Cadastrar Entrada" 
                    active={localSettings.porterPermissions.canRegisterEntry}
                    onToggle={() => setLocalSettings({
                      ...localSettings, 
                      porterPermissions: { ...localSettings.porterPermissions, canRegisterEntry: !localSettings.porterPermissions.canRegisterEntry }
                    })}
                  />
                  <PermissionItem 
                    label="Editar Moradores" 
                    active={localSettings.porterPermissions.canEditResidents}
                    onToggle={() => setLocalSettings({
                      ...localSettings, 
                      porterPermissions: { ...localSettings.porterPermissions, canEditResidents: !localSettings.porterPermissions.canEditResidents }
                    })}
                  />
                  <PermissionItem 
                    label="Registrar Entregas" 
                    active={localSettings.porterPermissions.canRegisterDeliveries}
                    onToggle={() => setLocalSettings({
                      ...localSettings, 
                      porterPermissions: { ...localSettings.porterPermissions, canRegisterDeliveries: !localSettings.porterPermissions.canRegisterDeliveries }
                    })}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Users className="w-3 h-3" /> Síndico pode:
                </span>
                <div className="space-y-2 bg-slate-50 p-4 rounded-2xl">
                  <PermissionItem 
                    label="Visualizar Histórico" 
                    active={localSettings.managerPermissions.canViewHistory}
                    onToggle={() => setLocalSettings({
                      ...localSettings, 
                      managerPermissions: { ...localSettings.managerPermissions, canViewHistory: !localSettings.managerPermissions.canViewHistory }
                    })}
                  />
                  <PermissionItem 
                    label="Visualizar Moradores" 
                    active={localSettings.managerPermissions.canViewResidents}
                    onToggle={() => setLocalSettings({
                      ...localSettings, 
                      managerPermissions: { ...localSettings.managerPermissions, canViewResidents: !localSettings.managerPermissions.canViewResidents }
                    })}
                  />
                  <PermissionItem 
                    label="Exportar Dados (Excel/CSV)" 
                    active={localSettings.managerPermissions.canExportData}
                    onToggle={() => setLocalSettings({
                      ...localSettings, 
                      managerPermissions: { ...localSettings.managerPermissions, canExportData: !localSettings.managerPermissions.canExportData }
                    })}
                  />
                </div>
              </div>
            </div>
            <button 
              onClick={handleSaveSettings}
              className="w-full bg-emerald-600 text-white rounded-xl py-3.5 font-black text-[11px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              Salvar Permissões
            </button>
          </div>
        </div>

        {/* MESSAGE TEMPLATES */}
        <div className="space-y-4 lg:col-span-2">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-500" />
            Mensagens padrão do WhatsApp
          </h3>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <TemplateField 
                  label="Mensagem para entrega" 
                  value={localTemplates.deliveryAuth} 
                  onChange={v => setLocalTemplates({...localTemplates, deliveryAuth: v})}
                  onReset={() => resetTemplate('deliveryAuth')}
                />
                <TemplateField 
                  label="Mensagem para visitante" 
                  value={localTemplates.visitorArrival} 
                  onChange={v => setLocalTemplates({...localTemplates, visitorArrival: v})}
                  onReset={() => resetTemplate('visitorArrival')}
                />
                <TemplateField 
                  label="Mensagem para prestador" 
                  value={localTemplates.serviceArrival} 
                  onChange={v => setLocalTemplates({...localTemplates, serviceArrival: v})}
                  onReset={() => resetTemplate('serviceArrival')}
                />
                <TemplateField 
                  label="Entrega não liberada" 
                  value={localTemplates.deliveryNotLiberated} 
                  onChange={v => setLocalTemplates({...localTemplates, deliveryNotLiberated: v})}
                  onReset={() => resetTemplate('deliveryNotLiberated')}
                />
              </div>
              <div className="space-y-4">
                <TemplateField 
                  label="Confirmação de autorização" 
                  value={localTemplates.authConfirmation} 
                  onChange={v => setLocalTemplates({...localTemplates, authConfirmation: v})}
                  onReset={() => resetTemplate('authConfirmation')}
                />
                <TemplateField 
                  label="Agradecimento / Encerramento" 
                  value={localTemplates.thanksClosure} 
                  onChange={v => setLocalTemplates({...localTemplates, thanksClosure: v})}
                  onReset={() => resetTemplate('thanksClosure')}
                />

                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                  <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3">Variáveis Disponíveis</h4>
                  <div className="flex flex-wrap gap-2">
                    {['{nome_morador}', '{unidade}', '{tipo}', '{nome_visitante}', '{nome_prestador}', '{nome_entregador}', '{condominio}', '{porteiro}'].map(v => (
                      <span key={v} className="px-2 py-1 bg-white border border-blue-200 rounded-md text-[9px] font-bold text-blue-600 font-mono">{v}</span>
                    ))}
                  </div>
                  <p className="text-[9px] text-blue-400 font-bold uppercase mt-3 leading-tight">
                    As variáveis serão substituídas pelos dados reais no momento do envio.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button 
                onClick={handleSaveTemplates}
                className="px-8 bg-blue-600 text-white rounded-xl py-3.5 font-black text-[11px] uppercase tracking-widest hover:bg-blue-700 active:scale-[0.98] transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                Salvar todas as mensagens
              </button>
            </div>
          </div>
        </div>

        {/* WHATSAPP INTEGRATION SETTINGS */}
        <div className="space-y-4 lg:col-span-2">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-purple-500" />
            Integração de WhatsApp (Futuro)
          </h3>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Modo de Funcionamento</label>
                <select 
                  value={localSettings.whatsappMode}
                  onChange={e => setLocalSettings({...localSettings, whatsappMode: e.target.value as any})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none uppercase"
                >
                  <option value="manual">Manual (Copiar & Colar) - Ativo Hoje</option>
                  <option value="api">API (Envio Automático) - Preparado</option>
                </select>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-2 px-1">
                  {localSettings.whatsappMode === 'manual' 
                    ? 'TUDO CONTINUA COMO ESTÁ: O porteiro copia a mensagem e abre o WhatsApp manualmente.' 
                    : 'MODO API: As mensagens serão enviadas via bot. A interface mudará avisos e feedbacks.'}
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100">
                <h4 className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-1 flex items-center gap-2">
                  <ShieldCheck className="w-3 h-3" /> Estado da Preparação
                </h4>
                <p className="text-[9px] text-purple-400 font-bold uppercase leading-tight">
                  O sistema já possui estados internos para rastrear respostas, autorizações e falhas via API, pronto para a virada de chave.
                </p>
              </div>
            </div>
            <button 
              onClick={handleSaveSettings}
              className="w-full bg-purple-600 text-white rounded-xl py-3.5 font-black text-[11px] uppercase tracking-widest hover:bg-purple-700 transition-all shadow-lg shadow-purple-100 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              Atualizar Modo WhatsApp
            </button>
          </div>
        </div>
      </div>

      {/* USER MANAGEMENT */}
      <div className="space-y-4">
        <div className="flex justify-between items-end px-1">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-600" />
            Gestão de Usuários
          </h3>
          <button 
            onClick={() => {
              setEditingUser(null);
              setIsAddingUser(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-100"
          >
            <UserPlus className="w-4 h-4" />
            Cadastrar Usuário
          </button>
        </div>

        {(isAddingUser || editingUser) && (
          <div className="bg-white p-6 rounded-3xl border-2 border-blue-100 shadow-xl shadow-blue-50">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-[11px] font-black text-blue-600 uppercase tracking-widest font-sans">
                {editingUser ? 'Ficha do Usuário' : 'Novo Cadastro de Usuário'}
              </h4>
              <button 
                onClick={() => {
                  setEditingUser(null);
                  setIsAddingUser(false);
                }}
                className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-50 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveUser} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                <input 
                  name="name"
                  defaultValue={editingUser?.name}
                  type="text" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contato WhatsApp</label>
                <input 
                  name="contact"
                  defaultValue={editingUser?.contact}
                  type="text" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none"
                  placeholder="(00) 00000-0000"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nível de Acesso</label>
                <select 
                  name="type"
                  defaultValue={editingUser?.type}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none uppercase"
                >
                  <option value="porteiro">Porteiro</option>
                  <option value="sindico">Síndico</option>
                </select>
              </div>
              <button 
                type="submit"
                className="bg-blue-600 text-white rounded-xl py-3.5 font-black text-[11px] uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                Confirmar Dados
              </button>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {adminUsers.map(user => (
            <AdminUserCard 
              key={user.id} 
              user={user} 
              onEdit={() => setEditingUser(user)}
              onToggle={() => handleToggleUserStatus(user.id)}
              onDelete={() => handleDeleteUser(user.id)}
            />
          ))}
        </div>
      </div>

      {/* DATA MAINTENANCE (CLEAR TESTS) */}
      <div className="space-y-6">
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 text-red-600">
          <Trash2 className="w-4 h-4" />
          Manutenção de Dados
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Master Clear Card */}
          <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border-2 border-red-100 shadow-xl shadow-red-50 flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-20 h-20 bg-red-50 text-red-600 rounded-[2rem] flex items-center justify-center shadow-inner">
              <ShieldAlert className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h4 className="text-lg font-black text-slate-900 uppercase tracking-widest">LIMPAR TODOS OS DADOS DE TESTE</h4>
              <p className="text-xs text-slate-400 font-bold max-w-[500px] leading-relaxed uppercase">
                Ação Geral: Remove registros de acessos, pré-autorizações, pendências e visitantes frequentes de uma só vez.
                <br />
                <span className="text-red-500 font-black">SEGURANÇA: Moradores e configurações serão preservados.</span>
              </p>
            </div>
            <button 
              onClick={() => {
                onClearTestData?.();
              }}
              className="w-full sm:w-auto px-12 bg-red-600 text-white rounded-2xl py-5 font-black text-[11px] uppercase tracking-widest hover:bg-black active:scale-[0.98] transition-all shadow-xl shadow-red-100 flex items-center justify-center gap-3 group"
            >
              <Trash2 className="w-5 h-5 group-hover:animate-bounce" />
              EXECUTAR LIMPEZA DE TESTE COMPLETA
            </button>
          </div>

          {/* Specific Clear Buttons */}
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-4">
              <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Ações Específicas</h5>
              
              <button 
                onClick={() => onClearAccessRecords?.()}
                className="w-full p-4 bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-600 rounded-2xl border border-slate-100 hover:border-red-200 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <History className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Limpar Log de Acessos</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </button>

              <button 
                onClick={() => onClearPreAuths?.()}
                className="w-full p-4 bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-600 rounded-2xl border border-slate-100 hover:border-red-200 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Limpar Pré-Autorizações</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </button>

              <button 
                onClick={() => onClearFrequents?.()}
                className="w-full p-4 bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-600 rounded-2xl border border-slate-100 hover:border-red-200 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Limpar Frequentes</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </button>
              
              <div className="mt-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-[8px] font-black text-blue-600 uppercase leading-relaxed text-center">
                  Utilize estas opções para limpar partes específicas do banco de dados simulado.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TemplateField({ label, value, onChange, onReset }: { label: string, value: string, onChange: (v: string) => void, onReset: () => void }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center px-1">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
        <button 
          onClick={onReset}
          className="text-[9px] font-black text-blue-500 hover:text-blue-700 uppercase tracking-tighter"
        >
          Restaurar padrão
        </button>
      </div>
      <textarea 
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500/20 outline-none h-24 sm:h-20 resize-none font-sans"
        placeholder="Digite a mensagem aqui..."
      />
    </div>
  );
}

function ToggleRow({ label, description, active, onToggle }: { label: string, description: string, active: boolean, onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 p-3 hover:bg-slate-50 rounded-2xl transition-colors">
      <div className="space-y-0.5">
        <p className="text-xs font-black text-slate-900 uppercase">{label}</p>
        <p className="text-[10px] text-slate-400 font-bold leading-tight">{description}</p>
      </div>
      <button 
        onClick={onToggle}
        className={cn(
          "shrink-0 w-12 h-6 rounded-full transition-all relative p-1",
          active ? "bg-blue-600" : "bg-slate-200"
        )}
      >
        <div className={cn(
          "w-4 h-4 bg-white rounded-full transition-all shadow-sm",
          active ? "translate-x-6" : "translate-x-0"
        )} />
      </button>
    </div>
  );
}

function PermissionItem({ label, active, onToggle }: { label: string, active: boolean, onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[11px] font-bold text-slate-600">{label}</span>
      <button 
        onClick={onToggle}
        className={cn(
          "p-1 rounded-lg transition-all",
          active ? "text-emerald-600" : "text-slate-300"
        )}
      >
        {active ? <CheckCircle2 className="w-5 h-5" /> : <Square className="w-5 h-5" />}
      </button>
    </div>
  );
}

function Square({ className }: { className?: string }) {
  return <div className={cn("w-5 h-5 border-2 border-slate-200 rounded", className)} />;
}

interface AdminUserCardProps {
  user: AdminUser;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}

const AdminUserCard: React.FC<AdminUserCardProps> = ({ user, onEdit, onToggle, onDelete }) => {
  return (
    <div className={cn(
      "bg-white p-5 rounded-3xl border shadow-sm flex flex-col gap-4 transition-all group",
      user.active ? "border-slate-100" : "border-slate-100 bg-slate-50/50 opacity-60"
    )}>
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner",
            user.active 
              ? (user.type === 'sindico' ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600")
              : "bg-slate-200 text-slate-400"
          )}>
            <User className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-black text-slate-900 uppercase leading-tight">{user.name}</h4>
            <span className={cn(
              "text-[9px] font-black uppercase tracking-widest",
              user.type === 'sindico' ? "text-blue-500" : "text-emerald-500"
            )}>
              {user.type === 'sindico' ? 'Síndico' : 'Porteiro'}
            </span>
          </div>
        </div>
        <div className="flex gap-1 transition-opacity">
          <button onClick={onEdit} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all active:scale-95">
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={onDelete} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all active:scale-95">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 bg-slate-50 px-3 py-2.5 rounded-xl">
        <Phone className="w-3.5 h-3.5 text-slate-400" />
        {user.contact}
      </div>

      <button 
        onClick={onToggle}
        className={cn(
          "w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all mt-auto active:scale-[0.98]",
          user.active 
            ? "bg-slate-50 text-slate-400 hover:bg-amber-50 hover:text-amber-600" 
            : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-100"
        )}
      >
        <Power className="w-3.5 h-3.5" />
        {user.active ? 'Suspender Usuário' : 'Ativar Usuário'}
      </button>
    </div>
  );
}
