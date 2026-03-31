import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AccessRecord, FrequentVisitor, PreAuthorization, AccessType, DeliverySubtype, AccessRule, PreAuthStatus, UnitPhone, UnitRules } from '../types';
import { WhatsAppService, WhatsAppMessage } from '../services/WhatsAppService';
import { UnitPhoneManager } from './UnitPhoneManager';
import { UnitRulesManager } from './UnitRulesManager';
import { toast } from 'sonner';
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
  Package, 
  User, 
  Wrench,
  Car,
  ChevronRight,
  MoreVertical,
  Download,
  FileText,
  Table as TableIcon,
  BarChart3,
  TrendingUp,
  MapPin,
  MessageSquare,
  Send,
  Phone
} from 'lucide-react';
import { format, isToday, startOfDay, endOfDay, isWithinInterval, subDays, startOfMonth, subWeeks } from 'date-fns';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
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

interface AdminPanelProps {
  records: AccessRecord[];
  frequentVisitors: FrequentVisitor[];
  preAuths: PreAuthorization[];
  unitPhones: UnitPhone[];
  unitRules: UnitRules[];
  onUpdateFrequents: (visitors: FrequentVisitor[]) => void;
  onUpdatePreAuths: (preAuths: PreAuthorization[]) => void;
  onUpdateUnitPhones: (phones: UnitPhone[]) => void;
  onUpdateUnitRules: (rules: UnitRules[]) => void;
  onWhatsAppMessage?: (message: WhatsAppMessage) => void;
}

type AdminSubView = 'dashboard' | 'history' | 'units' | 'frequents' | 'preauths' | 'whatsapp' | 'phones' | 'rules' | 'reports';

export function AdminPanel({ 
  records, 
  frequentVisitors, 
  preAuths, 
  unitPhones,
  unitRules,
  onUpdateFrequents, 
  onUpdatePreAuths,
  onUpdateUnitPhones,
  onUpdateUnitRules,
  onWhatsAppMessage
}: AdminPanelProps) {
  const [subView, setSubView] = useState<AdminSubView>('dashboard');
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
  const [simulatedMessage, setSimulatedMessage] = useState('');
  const [simulatedSender, setSimulatedSender] = useState('+55 11 99999-9999');
  const [simulatedResponse, setSimulatedResponse] = useState<string | null>(null);

  const handleSimulateWhatsApp = () => {
    if (!simulatedMessage.trim()) return;
    
    const message: WhatsAppMessage = {
      text: simulatedMessage,
      sender: simulatedSender,
      timestamp: new Date(),
    };
    
    if (onWhatsAppMessage) {
      onWhatsAppMessage(message);
      const parsed = WhatsAppService.parseMessage(message, unitPhones, unitRules);
      setSimulatedResponse(WhatsAppService.getAutoResponse(parsed));
      setSimulatedMessage('');
      toast.success('Mensagem de WhatsApp simulada com sucesso!');
    }
  };
  
  // Dashboard Stats
  const stats = useMemo(() => {
    const today = new Date();
    const todayRecords = records.filter(r => isToday(new Date(r.timestamp)));
    
    const activePreAuths = preAuths.filter(p => p.status === 'autorizada' && new Date(p.validity) > today);
    const activeFrequents = frequentVisitors.filter(v => v.active);
    
    const directReleases = records.filter(r => r.origin === 'visitante_frequente' && r.ruleUsed === 'SEMPRE_LIBERADO');
    const notifyReleases = records.filter(r => r.origin === 'visitante_frequente' && r.ruleUsed === 'AVISAR_ANTES');

    return {
      entriesToday: todayRecords.length,
      inProgress: records.filter(r => r.status === 'em_andamento').length,
      finishedToday: todayRecords.filter(r => r.status === 'finalizado').length,
      activePreAuths: activePreAuths.length,
      activeFrequents: activeFrequents.length,
      directReleases: directReleases.length,
      notifyReleases: notifyReleases.length,
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
    const inProgress = filteredReports.filter(r => r.status === 'em_andamento').length;
    const finished = filteredReports.filter(r => r.status === 'finalizado').length;

    return { total, visitors, deliveries, services, whatsapp, frequents, preAuths, manual, inProgress, finished };
  }, [filteredReports]);

  const exportToCSV = () => {
    const headers = [
      'Data', 'Entrada', 'Saída', 'Status', 'Unidade', 'Nome', 'Tipo', 'Subtipo', 
      'Veículo/Placa', 'Origem', 'Regra Aplicada', 'Observação', 'Telefone (WhatsApp)'
    ];

    const rows = filteredReports.map(r => [
      format(new Date(r.timestamp), 'dd/MM/yyyy'),
      format(new Date(r.timestamp), 'HH:mm'),
      r.exitTimestamp ? format(new Date(r.exitTimestamp), 'HH:mm') : '-',
      r.status === 'em_andamento' ? 'Em Andamento' : 'Finalizado',
      r.destination,
      r.name,
      r.type === 'visitor' ? 'Visitante' : r.type === 'delivery' ? 'Entrega' : 'Prestador',
      r.deliverySubtype || '-',
      r.plate || '-',
      r.origin || 'manual',
      r.ruleUsed || '-',
      r.notes || '-',
      r.whatsappMetadata?.phoneNumber || '-'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `relatorio_acessos_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`);
  };

  const exportToExcel = () => {
    const data = filteredReports.map(r => ({
      'Data': format(new Date(r.timestamp), 'dd/MM/yyyy'),
      'Entrada': format(new Date(r.timestamp), 'HH:mm'),
      'Saída': r.exitTimestamp ? format(new Date(r.exitTimestamp), 'HH:mm') : '-',
      'Status': r.status === 'em_andamento' ? 'Em Andamento' : 'Finalizado',
      'Unidade': r.destination,
      'Nome': r.name,
      'Tipo': r.type === 'visitor' ? 'Visitante' : r.type === 'delivery' ? 'Entrega' : 'Prestador',
      'Subtipo': r.deliverySubtype || '-',
      'Veículo/Placa': r.plate || '-',
      'Origem': r.origin || 'manual',
      'Regra Aplicada': r.ruleUsed || '-',
      'Observação': r.notes || '-',
      'Telefone (WhatsApp)': r.whatsappMetadata?.phoneNumber || '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Acessos');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `relatorio_acessos_${format(new Date(), 'yyyy-MM-dd_HHmm')}.xlsx`);
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
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'history', label: 'Histórico', icon: History },
            { id: 'units', label: 'Unidades', icon: Home },
            { id: 'frequents', label: 'Frequentes', icon: Users },
            { id: 'preauths', label: 'Pré-autorizações', icon: Calendar },
            { id: 'phones', label: 'Telefones', icon: Phone },
            { id: 'rules', label: 'Regras por unidade', icon: Shield },
            { id: 'reports', label: 'Relatórios', icon: FileText },
            { id: 'whatsapp', label: 'WhatsApp (Sim)', icon: MessageSquare },
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

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {/* DASHBOARD VIEW */}
          {subView === 'dashboard' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
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
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                      <Clock className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Agora</span>
                  </div>
                  <span className="block text-2xl font-black text-emerald-600">{stats.inProgress}</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Em Andamento</span>
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

                <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Avisar</span>
                  </div>
                  <span className="block text-2xl font-black text-amber-600">{stats.notifyReleases}</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Avisar Antes</span>
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
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
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
                  <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    <select 
                      className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase outline-none"
                      value={historyFilters.type}
                      onChange={e => setHistoryFilters({...historyFilters, type: e.target.value as any})}
                    >
                      <option value="all">Todos Tipos</option>
                      <option value="visitor">Visitantes</option>
                      <option value="delivery">Entregas</option>
                      <option value="service">Prestadores</option>
                    </select>
                    <select 
                      className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase outline-none"
                      value={historyFilters.origin}
                      onChange={e => setHistoryFilters({...historyFilters, origin: e.target.value})}
                    >
                      <option value="all">Todas Origens</option>
                      <option value="manual">Manual</option>
                      <option value="visitante_frequente">Frequente</option>
                      <option value="pre_autorizacao">Pré-Autorização</option>
                    </select>
                    <button className="p-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors">
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pessoa / Veículo</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Unidade</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo / Origem</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Entrada / Saída</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredHistory.map((record) => (
                        <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "p-2 rounded-lg shrink-0",
                                record.type === 'visitor' ? "bg-emerald-50 text-emerald-600" : record.type === 'delivery' ? "bg-orange-50 text-orange-600" : "bg-blue-50 text-blue-600"
                              )}>
                                {record.type === 'visitor' ? <User className="w-4 h-4" /> : record.type === 'delivery' ? <Package className="w-4 h-4" /> : <Wrench className="w-4 h-4" />}
                              </div>
                              <div>
                                <span className="block text-sm font-bold text-slate-900 uppercase tracking-tight">{record.name}</span>
                                {record.plate && (
                                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">{record.plate}</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-black text-slate-600 uppercase">{record.destination}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                {record.type === 'visitor' ? 'Visitante' : record.type === 'delivery' ? 'Entrega' : 'Prestador'}
                              </span>
                              <span className={cn(
                                "text-[9px] font-black uppercase px-1.5 py-0.5 rounded w-fit",
                                record.origin === 'manual' ? "bg-slate-100 text-slate-600" : record.origin === 'visitante_frequente' ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"
                              )}>
                                {record.origin === 'manual' ? 'Manual' : record.origin === 'visitante_frequente' ? 'Frequente' : 'Pré-Autorização'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col text-[10px] font-bold text-slate-500">
                              <span>Entrada: {format(new Date(record.timestamp), 'dd/MM HH:mm')}</span>
                              {record.exitTimestamp && (
                                <span>Saída: {format(new Date(record.exitTimestamp), 'dd/MM HH:mm')}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "text-[10px] font-black uppercase px-2 py-1 rounded-full",
                              record.status === 'em_andamento' ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"
                            )}>
                              {record.status === 'em_andamento' ? 'Em Andamento' : 'Finalizado'}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {filteredHistory.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-xs font-bold uppercase">
                            Nenhum registro encontrado
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
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
                                    {r.type === 'visitor' ? <User className="w-4 h-4" /> : <Package className="w-4 h-4" />}
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

          {/* FREQUENTS VIEW (Reusing Manager) */}
          {subView === 'frequents' && (
            <FrequentVisitorManager 
              visitors={frequentVisitors}
              onUpdate={onUpdateFrequents}
              onReleaseDirect={() => {}} // No release from admin panel
            />
          )}

          {/* PREAUTHS VIEW (Reusing Manager) */}
          {subView === 'preauths' && (
            <PreAuthorizationManager 
              preAuths={preAuths}
              unitRules={unitRules}
              onUpdate={onUpdatePreAuths}
            />
          )}

          {subView === 'phones' && (
            <UnitPhoneManager 
              unitPhones={unitPhones}
              onUpdate={onUpdateUnitPhones}
            />
          )}

          {subView === 'rules' && (
            <UnitRulesManager 
              unitRules={unitRules}
              onUpdate={onUpdateUnitRules}
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
                      disabled
                      className="px-4 py-2 bg-slate-50 text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 cursor-not-allowed"
                    >
                      <FileText className="w-4 h-4" />
                      PDF (Breve)
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
                      <option value="visitante_frequente">Frequente</option>
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
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredReports.slice(0, 50).map((record) => (
                        <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
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
                              record.status === 'em_andamento' ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"
                            )}>
                              {record.status === 'em_andamento' ? 'Aberto' : 'Fim'}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {filteredReports.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-xs font-bold uppercase">
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

          {/* WHATSAPP SIMULATION VIEW */}
          {subView === 'whatsapp' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
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
                        className="px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-slate-100 transition-all"
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
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

                <div className="bg-blue-600 p-6 rounded-3xl text-white shadow-xl shadow-blue-100">
                  <h3 className="text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Como funciona a Integração
                  </h3>
                  <ul className="space-y-3">
                    <li className="flex gap-3 text-xs font-medium leading-relaxed">
                      <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black">1</div>
                      O morador envia uma mensagem autorizando alguém.
                    </li>
                    <li className="flex gap-3 text-xs font-medium leading-relaxed">
                      <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black">2</div>
                      O sistema identifica a unidade, o tipo de acesso e o nome.
                    </li>
                    <li className="flex gap-3 text-xs font-medium leading-relaxed">
                      <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black">3</div>
                      Uma pré-autorização é criada instantaneamente com origem "WhatsApp".
                    </li>
                    <li className="flex gap-3 text-xs font-medium leading-relaxed">
                      <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black">4</div>
                      O porteiro visualiza o aviso na busca unificada ao pesquisar pela casa.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
