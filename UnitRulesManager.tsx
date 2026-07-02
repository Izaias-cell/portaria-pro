import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AccessType, AccessRecord, DeliverySubtype, FrequentVisitor, AccessRule, PreAuthorization } from '../types';
import { ocrQueue } from '../services/OCRQueueService';
import { OCRResult } from '../types';
import { X, Check, Car, User, Home, FileText, Camera, Bike, ChevronDown, Shield, ShieldAlert, Zap, Calendar, Clock, MessageSquare, Package, Wrench, RefreshCw, Eye, Bell, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { toast } from '../lib/toast';
import { format } from 'date-fns';
import { getCorrectedType, verifyContentForCrossModality } from '../lib/classificationUtils';

const COLOR_OPTIONS = [
  { id: 'branco', name: 'Branco', emoji: '⚪', colorClass: 'bg-white border-slate-300 text-slate-800' },
  { id: 'preto', name: 'Preto', emoji: '⚫', colorClass: 'bg-slate-900 border-slate-950 text-white' },
  { id: 'cinza', name: 'Cinza', emoji: '🩶', colorClass: 'bg-slate-400 border-slate-500 text-slate-900' },
  { id: 'prata', name: 'Prata', emoji: '✨', colorClass: 'bg-slate-200 border-slate-300 text-slate-900' },
  { id: 'vermelho', name: 'Vermelho', emoji: '🔴', colorClass: 'bg-red-500 border-red-600 text-white' },
  { id: 'azul', name: 'Azul', emoji: '🔵', colorClass: 'bg-blue-500 border-blue-600 text-white' },
  { id: 'verde', name: 'Verde', emoji: '🟢', colorClass: 'bg-emerald-500 border-emerald-600 text-white' },
  { id: 'amarelo', name: 'Amarelo', emoji: '🟡', colorClass: 'bg-yellow-400 border-yellow-500 text-slate-900' },
  { id: 'laranja', name: 'Laranja', emoji: '🟠', colorClass: 'bg-orange-500 border-orange-600 text-white' },
  { id: 'marrom', name: 'Marrom', emoji: '🟤', colorClass: 'bg-amber-800 border-amber-900 text-white' },
  { id: 'outra', name: 'Outra', emoji: '⭕', colorClass: 'bg-slate-100 border-slate-200 text-slate-800' }
];

interface AccessFormProps {
  type: AccessType;
  fastFlow?: boolean;
  frequentVisitors?: FrequentVisitor[];
  records?: AccessRecord[];
  preAuths?: PreAuthorization[];
  pendingRequests?: any[];
  initialData?: Partial<AccessRecord>;
  onClose: (data?: Partial<AccessRecord>) => void;
  onSubmit: (data: Partial<AccessRecord>) => void;
  onReleaseDirect: (visitor: FrequentVisitor) => void;
  onReleasePreAuth: (preAuth: PreAuthorization) => void;
  onNotifyDenial?: (data: any) => void;
  onNotifyResident?: (data: any) => void;
  whatsappMode?: 'manual' | 'api';
  unitPhones?: any[];
  condoName?: string;
  onChangeType?: (type: AccessType) => void;
  permanentProfiles?: any[];
  prismas?: any[];
}

interface SmartSuggestion {
  name: string;
  type: AccessType;
  document?: string;
  cpf?: string;
  rg?: string;
  phone?: string;
  plate?: string;
  additionalPlates?: string[];
  vehicleModel?: string;
  vehicleColor?: string;
  lastEntry?: Date;
  deliverySubtype?: DeliverySubtype;
  visitCount: number;
  lastUnits: string[];
  relationship?: string;
  company?: string;
}

// Mock data for residents
const MOCK_RESIDENTS = [
  { unit: 'Casa 01', name: 'Ricardo Silva' },
  { unit: 'Casa 02', name: 'Ana Oliveira' },
  { unit: 'Casa 03', name: 'Marcos Santos' },
  { unit: 'Casa 04', name: 'Julia Costa' },
  { unit: 'Casa 05', name: 'Paulo Souza' },
  { unit: 'Casa 06', name: 'Fernanda Lima' },
  { unit: 'Casa 07', name: 'Roberto Rocha' },
  { unit: 'Casa 08', name: 'Beatriz Alves' },
  { unit: 'Casa 09', name: 'Carlos Pereira' },
  { unit: 'Casa 10', name: 'Sandra Gomes' },
];

const cleanDefaultName = (name: string | undefined): string => {
  if (!name) return '';
  const n = name.trim().toUpperCase();
  if (
    n === 'ENTREGADOR' || 
    n === 'ENTREGADOR (NÃO IDENTIFICADO)' || 
    n === 'VISITANTE' || 
    n === 'PRESTADOR' || 
    n === 'MOTORISTA UBER'
  ) {
    return '';
  }
  return name;
};

const playBlockedSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    
    const playTone = (freq: number, duration: number, startTime: number, oscType: OscillatorType = 'sine', volume = 0.1) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.type = oscType;
      osc.frequency.setValueAtTime(freq, startTime);
      
      // Envelope
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    // Curto, objetivo, não agressivo, volume moderado. Minor third descending chime.
    playTone(392.00, 0.22, now, 'triangle', 0.15); // G4
    playTone(311.13, 0.32, now + 0.15, 'triangle', 0.12); // Eb4
  } catch (e) {
    console.warn('Blocked sound failed:', e);
  }
};

function getBlockedMatch(formData: any, permanentProfiles: any[]) {
  const removeAccents = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const cleanStr = (s?: string) => removeAccents(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const cleanDigits = (s?: string) => (s || '').replace(/\D/g, '');
  const cleanAlphanumeric = (s?: string) => (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

  const typedName = cleanStr(formData.name);
  const typedCpf = cleanDigits(formData.cpf);
  const typedRg = cleanDigits(formData.rg);
  const typedRgAlpha = cleanAlphanumeric(formData.rg);
  const typedDoc = cleanDigits(formData.document);
  const typedDocAlpha = cleanAlphanumeric(formData.document);
  const typedPhone = cleanDigits(formData.phone);
  const typedPlate = cleanAlphanumeric(formData.plate);

  if (!typedName && !typedCpf && !typedRg && !typedRgAlpha && !typedDoc && !typedDocAlpha && !typedPhone && !typedPlate) {
    return null;
  }

  const checkDocMatch = (typed: string, registered: string) => {
    if (!typed || !registered) return false;
    if (typed.length < 6) return false;
    return registered.startsWith(typed);
  };

  const checkPlateMatch = (typed: string, registered: string) => {
    if (!typed || !registered) return false;
    if (typed.length < 5) return false;
    return registered.startsWith(typed);
  };

  for (const p of permanentProfiles) {
    if (p.status !== 'blocked') continue;

    const pName = cleanStr(p.name);
    const pCpf = cleanDigits(p.cpf);
    const pRg = cleanDigits(p.rg);
    const pRgAlpha = cleanAlphanumeric(p.rg);
    const pPhone = cleanDigits(p.phone);
    const pPlate = cleanAlphanumeric(p.plate);
    const pPlatesHistory = (p.platesHistory || []).map(cleanAlphanumeric);

    // ==========================================
    // Priority 1: Nome completo correspondente.
    // ==========================================
    if (typedName) {
      const pWords = pName.split(' ').filter(Boolean);
      const typedWords = typedName.split(' ').filter(Boolean);

      if (pWords.length >= 2) {
        // Registered name has Name + Surname (e.g., JOÃO SILVA)
        if (typedWords.length >= 2) {
          // Porter typed at least Name + Surname (e.g., JOÃO SILVA)
          if (typedName === pName || typedName.startsWith(pName + ' ') || pName.startsWith(typedName + ' ')) {
            return p;
          }
        }
        // If typedWords.length < 2, it is a partial first name (e.g. JOÃO) -> Rule 2: DO NOT emit immediate alert.
      } else if (pWords.length === 1) {
        // Registered name is single word (e.g., NENE)
        if (typedName === pName) {
          return p;
        }
      }
    }

    // ==========================================
    // Priority 2: Documento com coincidência de 6 números.
    // ==========================================
    if (
      checkDocMatch(typedCpf, pCpf) ||
      checkDocMatch(typedRg, pRg) ||
      checkDocMatch(typedDoc, pCpf) ||
      checkDocMatch(typedDoc, pRg) ||
      (typedRgAlpha.length >= 6 && pRgAlpha.startsWith(typedRgAlpha)) ||
      (typedDocAlpha.length >= 6 && pCpf.startsWith(typedDocAlpha)) ||
      (typedDocAlpha.length >= 6 && pRgAlpha.startsWith(typedDocAlpha))
    ) {
      return p;
    }

    // ==========================================
    // Priority 3: Placa correspondente (correspondência suficiente).
    // ==========================================
    if (typedPlate) {
      if (checkPlateMatch(typedPlate, pPlate)) {
        return p;
      }
      if (pPlatesHistory.some(plate => checkPlateMatch(typedPlate, plate))) {
        return p;
      }
    }

    // Helper: Phone match (if typed has >= 8 digits)
    if (typedPhone && typedPhone.length >= 8 && pPhone && (pPhone.startsWith(typedPhone) || pPhone.endsWith(typedPhone) || typedPhone === pPhone)) {
      return p;
    }
  }

  return null;
}

export function AccessForm({ 
  type, 
  fastFlow = false, 
  frequentVisitors = [], 
  records = [],
  preAuths = [], 
  pendingRequests = [],
  initialData,
  onClose: propOnClose, 
  onSubmit, 
  onReleaseDirect, 
  onReleasePreAuth,
  onNotifyDenial,
  onNotifyResident,
  whatsappMode = 'manual',
  unitPhones = [],
  condoName = 'Condomínio',
  onChangeType,
  permanentProfiles = [],
  prismas = []
}: AccessFormProps) {
  const [isNotified, setIsNotified] = useState(false);
  const [isNotifiedCaminho, setIsNotifiedCaminho] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPhotoZoom, setShowPhotoZoom] = useState(false);
  const [ocrStep, setOcrStep] = useState<'idle' | 'loading' | 'cropping' | 'preprocessing' | 'reading' | 'identifying' | 'completed' | 'retrying'>('idle');
  const [ocrPreview, setOcrPreview] = useState<string | null>(initialData?.printImage || (initialData as any)?.draft?.printImage || null);
  const [ocrCropPreview, setOcrCropPreview] = useState<string | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [currentJob, setCurrentJob] = useState<OCRResult | null>(null);
  const [showDuplicityWarning, setShowDuplicityWarning] = useState(false);
  const [duplicityWarningText, setDuplicityWarningText] = useState('');
  const [forceUberManual, setForceUberManual] = useState(false);
  const [isTicking, setIsTicking] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Zoom & Pan states for Uber modal print preview
  const [zoomScale, setZoomScale] = useState(1);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const zoomFactor = 0.15;
    let newScale = zoomScale + (e.deltaY < 0 ? zoomFactor : -zoomFactor);
    newScale = Math.max(1, Math.min(5, newScale));
    setZoomScale(newScale);
    if (newScale === 1) {
      setZoomPosition({ x: 0, y: 0 });
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (zoomScale > 1) {
      e.preventDefault();
      setIsDraggingImage(true);
      setDragStart({ x: e.clientX - zoomPosition.x, y: e.clientY - zoomPosition.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingImage && zoomScale > 1) {
      e.preventDefault();
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      setZoomPosition({ x: newX, y: newY });
    }
  };

  const handleMouseUpOrLeave = () => {
    setIsDraggingImage(false);
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    if (zoomScale === 1) {
      setShowPhotoZoom(true);
    }
  };

  const isFastFlowActive = (type === 'uber' || type === 'delivery') && ocrPreview && !forceUberManual && !initialData?.destination;

  // Cleanup OCR data on unmount or type change to prevent persistence, and reset zoom
  useEffect(() => {
    setZoomScale(1);
    setZoomPosition({ x: 0, y: 0 });
    setIsDraggingImage(false);
    return () => {
      if (type === 'uber' || type === 'delivery') {
        setOcrPreview(null);
        setIsProcessingOCR(false);
      }
    };
  }, [type]);

  const resetUberOCR = () => {
    // 1. CLEAR MAIN STATE - TOTAL ISOLATION
    // We preserve the destination if it was already set (contextual entry)
    setFormData(prev => ({
      ...prev,
      name: '',
      document: '',
      plate: '',
      vehicleModel: '',
      notes: '',
      relationship: '',
      deliverySubtype: '' as any,
      origin: 'manual',
      ruleUsed: undefined,
      preAuthId: undefined,
      pendingRequestId: undefined,
      company: '',
      vehicleColor: '',
      onFoot: false,
      uberArrivalMinutes: 5,
    }));
    
    // Only clear search if it wasn't pre-filled by initialData
    if (!initialData?.destination) {
      setDestSearch('');
    }

    setOcrPreview(null);
    setIsProcessingOCR(false);
    setIsNotified(false);
    setIsNotifiedCaminho(false);
    setOcrStep('idle');
    setOcrCropPreview(null);
    setCurrentJobId(null);
    setCurrentJob(null);
    setForceUberManual(false);
    setIsTicking(false);
    setShowCustomColorInput(false);
    
    // 2. TOTAL EXHAUSTIVE RESET OF INTERNAL CACHES AND WINDOW STATES
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

    console.log('--- OPERATIONAL CLEANUP: UBER DATA ZEROED ---');
  };

  const [formData, setFormData] = useState({
    name: cleanDefaultName(initialData?.name) === 'MOTORISTA UBER' ? '' : cleanDefaultName(initialData?.name),
    document: initialData?.document || '',
    cpf: (initialData as any)?.cpf || '',
    rg: (initialData as any)?.rg || '',
    phone: (initialData as any)?.phone || '',
    plate: (initialData?.plate === 'PLACA') ? '' : (initialData?.plate || ''),
    vehicleModel: (initialData?.vehicleModel === 'VEÍCULO') ? '' : (initialData?.vehicleModel || ''),
    destination: initialData?.destination || '',
    notes: (initialData?.notes === 'AÇÃO UBER CRIADA VIA PRINT FAST-FLOW') ? '' : (initialData?.notes || ''),
    relationship: initialData?.relationship || '',
    deliverySubtype: initialData?.deliverySubtype || (type === 'delivery' ? 'motoboy' : '' as any as DeliverySubtype),
    origin: (initialData?.origin as any) || 'manual',
    ruleUsed: initialData?.ruleUsed,
    preAuthId: initialData?.preAuthId,
    pendingRequestId: (initialData as any)?.pendingRequestId,
    company: (initialData as any)?.company || '',
    vehicleColor: (initialData as any)?.vehicleColor === 'COR' ? '' : ((initialData as any)?.vehicleColor || ''),
    onFoot: (initialData as any)?.onFoot || false,
    uberArrivalMinutes: initialData?.uberArrivalMinutes || 5,
    prismaId: (initialData as any)?.prismaId || undefined,
    prismaNumber: (initialData as any)?.prismaNumber || undefined,
    prismaColor: (initialData as any)?.prismaColor || undefined,
  });

  const blockedProfile = useMemo(() => {
    return getBlockedMatch(formData, permanentProfiles);
  }, [formData, permanentProfiles]);

  const onClose = (data?: any) => {
    if (blockedProfile) {
      propOnClose({ isBlockedClose: true } as any);
    } else {
      propOnClose(data);
    }
  };

  const lastBlockedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (blockedProfile) {
      if (lastBlockedIdRef.current !== blockedProfile.id) {
        lastBlockedIdRef.current = blockedProfile.id;
        playBlockedSound();
      }
    } else {
      lastBlockedIdRef.current = null;
    }
  }, [blockedProfile]);

  const [localPrismas] = useState<any[]>(() => {
    const saved = localStorage.getItem('portaria_prismas');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(p => p && typeof p === 'object' && p.id && p.number);
        }
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  const activePrismas = prismas && prismas.length > 0 ? prismas : localPrismas;

  const prismaInUseWarning = useMemo(() => {
    if ((type === 'visitor' || type === 'service') && formData.prismaNumber && formData.prismaColor) {
      return activePrismas.some(p => p.number === String(formData.prismaNumber).trim() && p.color === formData.prismaColor && p.status === 'em_uso');
    }
    return false;
  }, [formData.prismaNumber, formData.prismaColor, activePrismas, type]);

  const [destSearch, setDestSearch] = useState(initialData?.destination || '');
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);
  const isDestInitialFilled = useMemo(() => {
    const destVal = initialData?.destination || destSearch || '';
    return !!(destVal && destVal.trim().length > 0);
  }, [initialData]);

  // Smart Memory State
  const [smartSuggestions, setSmartSuggestions] = useState<SmartSuggestion[]>([]);
  const [activeSuggestionField, setActiveSuggestionField] = useState<'name' | 'document' | 'plate' | 'cpf' | 'rg' | 'phone' | null>(null);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState<number>(-1);
  const suggestionsContainerRef = useRef<HTMLDivElement>(null);

  // Reset selected index when active field or suggestions change
  useEffect(() => {
    setSelectedSuggestionIndex(-1);
  }, [activeSuggestionField, smartSuggestions.length]);

  // Handle automatic scrolling when keyboard selection changes
  useEffect(() => {
    if (selectedSuggestionIndex >= 0 && suggestionsContainerRef.current) {
      const container = suggestionsContainerRef.current;
      const children = container.children;
      if (children && children[selectedSuggestionIndex]) {
        const activeElement = children[selectedSuggestionIndex] as HTMLElement;
        activeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }
    }
  }, [selectedSuggestionIndex]);

  // Focus Management Refs
  const inputRefs = useRef<Record<string, any>>({});
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  // Custom color selection references and status
  const colorRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const prismaColorRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const customColorInputRef = useRef<HTMLInputElement | null>(null);
  const [showCustomColorInput, setShowCustomColorInput] = useState(() => {
    const initialColor = (initialData as any)?.vehicleColor === 'COR' ? '' : ((initialData as any)?.vehicleColor || '');
    if (!initialColor) return false;
    const isStandard = COLOR_OPTIONS.some(opt => opt.name.toUpperCase() === initialColor.toUpperCase());
    return !isStandard;
  });
  
  const handleAutoSubmit = () => {
    if (blockedProfile) return;
    if (!destSearch.trim()) return;
    if (type === 'uber') {
      onSubmit({
        ...formData,
        destination: destSearch,
        name: formData.name || 'MOTORISTA UBER',
        plate: formData.plate || 'PLACA',
        vehicleModel: formData.vehicleModel || 'VEÍCULO',
        vehicleColor: formData.vehicleColor || 'COR',
        notes: formData.notes || 'AÇÃO UBER CRIADA VIA PRINT FAST-FLOW',
        printImage: ocrPreview || undefined,
        type: 'uber',
        status: 'em_andamento'
      });
    } else if (type === 'delivery') {
      onSubmit({
        ...formData,
        destination: destSearch,
        name: formData.name || 'ENTREGADOR',
        deliverySubtype: formData.deliverySubtype || 'motoboy',
        notes: formData.notes || 'ENTREGA CRIADA VIA PRINT FAST-FLOW',
        printImage: ocrPreview || undefined,
        type: 'delivery',
        status: 'em_andamento'
      });
    }
  };

  const handleFastSubmit = () => {
    if (blockedProfile) {
      toast.error('CADASTRO BLOQUEADO NO BANCO!', {
        description: `Não é possível realizar fluxo de acesso para ${blockedProfile.name}. Motivo: ${blockedProfile.blockReason || 'Não informado.'}`
      });
      return;
    }

    if (!destSearch.trim()) {
      toast.error('PREENCHA A UNIDADE', {
        description: 'A Unidade (Casa/Apto) é obrigatória.'
      });
      return;
    }
    if (type === 'uber') {
      onSubmit({
        ...formData,
        destination: destSearch,
        name: formData.name || 'MOTORISTA UBER',
        plate: formData.plate || 'PLACA',
        vehicleModel: formData.vehicleModel || 'VEÍCULO',
        vehicleColor: formData.vehicleColor || 'COR',
        notes: formData.notes || 'AÇÃO UBER CRIADA VIA PRINT FAST-FLOW',
        printImage: ocrPreview || undefined,
        type: 'uber',
        status: 'em_andamento'
      });
    } else if (type === 'delivery') {
      onSubmit({
        ...formData,
        destination: destSearch,
        name: formData.name || 'ENTREGADOR',
        deliverySubtype: formData.deliverySubtype || 'motoboy',
        notes: formData.notes || 'ENTREGA CRIADA VIA PRINT FAST-FLOW',
        printImage: ocrPreview || undefined,
        type: 'delivery',
        status: 'em_andamento'
      });
    }
  };

  const setActualFocus = () => {
    const destVal = initialData?.destination || destSearch;
    const isDestFilled = !!(destVal && destVal.trim().length > 0);

    let targetEl: HTMLInputElement | null = null;

    if (isDestFilled && inputRefs.current?.name) {
      targetEl = inputRefs.current.name;
    } else if (inputRefs.current?.destination) {
      targetEl = inputRefs.current.destination;
    }

    if (targetEl) {
      targetEl.focus();
      const len = targetEl.value.length;
      try {
        targetEl.setSelectionRange(len, len);
      } catch (e) {
        // fallback
        targetEl.select();
      }
    }
  };

  useEffect(() => {
    setActualFocus();
    
    const t0 = setTimeout(setActualFocus, 30);
    const t1 = setTimeout(setActualFocus, 80);
    const t2 = setTimeout(setActualFocus, 150);
    const t3 = setTimeout(setActualFocus, 300);
    const t4 = setTimeout(setActualFocus, 500);

    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [initialData, type]);

  useEffect(() => {
    if (isFastFlowActive && destSearch.trim().length > 0 && !blockedProfile) {
      setIsTicking(true);
      const timer = setTimeout(() => {
        handleAutoSubmit();
      }, 2000);

      return () => {
        clearTimeout(timer);
        setIsTicking(false);
      };
    } else {
      setIsTicking(false);
    }
  }, [destSearch, isFastFlowActive, blockedProfile]);
  
  const getFocusableSequence = () => {
    const seq: string[] = ['destination'];
    
    if (type === 'uber') {
      seq.push('subtype_plate');
      seq.push('vehicleModel');
    } else if (type === 'delivery') {
      seq.push('name');
      seq.push('document');
      if (!formData.onFoot && formData.deliverySubtype !== 'bicicleta') {
        seq.push('subtype_plate');
      }
    } else if (type === 'service') {
      seq.push('name');
      seq.push('document');
      if (!formData.onFoot && formData.deliverySubtype !== 'bicicleta') {
        seq.push('subtype_plate');
        seq.push('vehicleModel');
      }
    } else if (type === 'visitor') {
      seq.push('name');
      seq.push('document');
      if (!formData.onFoot && formData.deliverySubtype !== 'bicicleta') {
        seq.push('subtype_plate');
      }
    }
    
    return seq;
  };

  const advanceFromField = (currentField: string) => {
    const sequence = getFocusableSequence();
    const currentIndex = sequence.indexOf(currentField);
    
    if (currentIndex === -1) {
      // It's an optional field or not in the mandatory focus sequence. 
      // Focus on the first empty mandatory field if there is one, but DO NOT submit!
      let firstEmptyIndex = -1;
      for (let i = 0; i < sequence.length; i++) {
        const fieldName = sequence[i];
        let val = '';
        if (fieldName === 'destination') val = destSearch;
        else if (fieldName === 'name') val = formData.name;
        else if (fieldName === 'document') val = formData.document;
        else if (fieldName === 'subtype_plate') val = formData.plate;
        else if (fieldName === 'vehicleModel') val = formData.vehicleModel;
        
        if (!val || !val.trim()) {
          firstEmptyIndex = i;
          break;
        }
      }
      if (firstEmptyIndex !== -1) {
        const targetField = sequence[firstEmptyIndex];
        inputRefs.current[targetField]?.focus();
      }
      return;
    }

    // Find the next empty mandatory field in sequence
    let nextEmptyIndex = -1;
    for (let i = currentIndex + 1; i < sequence.length; i++) {
      const fieldName = sequence[i];
      let val = '';
      if (fieldName === 'destination') val = destSearch;
      else if (fieldName === 'name') val = formData.name;
      else if (fieldName === 'document') val = formData.document;
      else if (fieldName === 'subtype_plate') val = formData.plate;
      else if (fieldName === 'vehicleModel') val = formData.vehicleModel;
      
      if (!val || !val.trim()) {
        nextEmptyIndex = i;
        break;
      }
    }
    
    if (nextEmptyIndex !== -1) {
      // Focus the next empty field
      const targetField = sequence[nextEmptyIndex];
      inputRefs.current[targetField]?.focus();
    } else {
      // No more subsequent empty mandatory fields. Check from the beginning of the sequence:
      let overallEmptyIndex = -1;
      for (let i = 0; i < sequence.length; i++) {
        const fieldName = sequence[i];
        let val = '';
        if (fieldName === 'destination') val = destSearch;
        else if (fieldName === 'name') val = formData.name;
        else if (fieldName === 'document') val = formData.document;
        else if (fieldName === 'subtype_plate') val = formData.plate;
        else if (fieldName === 'vehicleModel') val = formData.vehicleModel;
        
        if (!val || !val.trim()) {
          overallEmptyIndex = i;
          break;
        }
      }
      
      if (overallEmptyIndex !== -1) {
        const targetField = sequence[overallEmptyIndex];
        inputRefs.current[targetField]?.focus();
      } else {
        // All mandatory fields are completed. Direct submit!
        handleSubmit();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, field: string) => {
    // Intercept keyboard events if smart suggestions are open and have items
    if (activeSuggestionField && smartSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => {
          const nextIdx = prev + 1;
          return nextIdx < smartSuggestions.length ? nextIdx : smartSuggestions.length - 1;
        });
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => {
          const nextIdx = prev - 1;
          return nextIdx >= 0 ? nextIdx : 0;
        });
        return;
      }
      if (e.key === 'Enter') {
        if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < smartSuggestions.length) {
          e.preventDefault();
          handleSelectSmartSuggestion(smartSuggestions[selectedSuggestionIndex]);
          return;
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setActiveSuggestionField(null);
        setSmartSuggestions([]);
        return;
      }
    }

    if (e.key === 'Enter') {
      // If it's a textarea, only prevent default if we want to submit (to allow newlines with Shift+Enter)
      if (e.shiftKey && field === 'notes') {
        return; // Allow newlines with Shift+Enter
      }
      
      e.preventDefault();
      advanceFromField(field);
    }
  };

  const handleColorKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex = index;
    if (e.key === 'ArrowLeft' || e.key === 'Left') {
      e.preventDefault();
      nextIndex = index > 0 ? index - 1 : COLOR_OPTIONS.length - 1;
    } else if (e.key === 'ArrowRight' || e.key === 'Right') {
      e.preventDefault();
      nextIndex = index < COLOR_OPTIONS.length - 1 ? index + 1 : 0;
    } else if (e.key === 'ArrowUp' || e.key === 'Up') {
      e.preventDefault();
      if (index >= 6) {
        nextIndex = index - 6;
      } else {
        const target = index + 6;
        nextIndex = target < COLOR_OPTIONS.length ? target : COLOR_OPTIONS.length - 1;
      }
    } else if (e.key === 'ArrowDown' || e.key === 'Down') {
      e.preventDefault();
      if (index + 6 < COLOR_OPTIONS.length) {
        nextIndex = index + 6;
      } else {
        const target = index % 6;
        nextIndex = target;
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selectedOpt = COLOR_OPTIONS[index];
      if (selectedOpt.id === 'outra') {
        setFormData(prev => ({ ...prev, vehicleColor: '' }));
        setShowCustomColorInput(true);
        setTimeout(() => {
          customColorInputRef.current?.focus();
        }, 50);
      } else {
        const uppercaseColor = selectedOpt.name.toUpperCase();
        setFormData(prev => ({ ...prev, vehicleColor: uppercaseColor }));
        setShowCustomColorInput(false);
        setTimeout(() => {
          advanceFromField('vehicleColor');
        }, 50);
      }
      return;
    } else {
      return;
    }

    colorRefs.current[nextIndex]?.focus();
  };

  const handlePrismaColorKeyDown = (e: React.KeyboardEvent, index: number) => {
    const PRISMA_COLORS = ['Amarelo', 'Vermelho', 'Azul', 'Verde'];
    let nextIndex = index;
    if (e.key === 'ArrowLeft' || e.key === 'Left') {
      e.preventDefault();
      nextIndex = index > 0 ? index - 1 : PRISMA_COLORS.length - 1;
    } else if (e.key === 'ArrowRight' || e.key === 'Right') {
      e.preventDefault();
      nextIndex = index < PRISMA_COLORS.length - 1 ? index + 1 : 0;
    } else if (e.key === 'ArrowUp' || e.key === 'Up' || e.key === 'ArrowDown' || e.key === 'Down') {
      e.preventDefault();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const colName = PRISMA_COLORS[index];
      setFormData(prev => ({ 
        ...prev, 
        prismaColor: prev.prismaColor === colName ? undefined : colName 
      }));
      setTimeout(() => {
        advanceFromField('prismaColor');
      }, 50);
      return;
    } else {
      return;
    }

    prismaColorRefs.current[nextIndex]?.focus();
  };

  // Process global memory once or memoize it
  const globalMemory = useMemo(() => {
    const memory: Map<string, SmartSuggestion> = new Map();

    const getPersonKey = (name: string, cpf?: string, rg?: string, plate?: string) => {
      const parts = [
        name.trim().toLowerCase(),
        (cpf || '').trim().toLowerCase().replace(/\D/g, ''),
        (rg || '').trim().toLowerCase(),
        (plate || '').trim().toLowerCase()
      ].filter(Boolean);
      return parts.join('|');
    };

    // 1. Process Frequent Visitors First
    frequentVisitors.forEach(v => {
      const key = getPersonKey(v.name, undefined, undefined, v.plate);
      memory.set(key, {
        name: v.name,
        type: v.type,
        plate: v.plate,
        deliverySubtype: v.deliverySubtype,
        visitCount: 0,
        lastUnits: [v.unit],
        company: (v as any).company || ''
      });
    });

    // 2. Process Permanent Profiles
    permanentProfiles.forEach(p => {
      const key = getPersonKey(p.name, p.cpf, p.rg, p.plate);
      
      memory.set(key, {
        name: p.name,
        type: p.type,
        document: p.cpf || p.rg || '',
        cpf: p.cpf,
        rg: p.rg,
        phone: p.phone,
        plate: p.plate,
        additionalPlates: [],
        vehicleModel: p.vehicleModel,
        vehicleColor: p.vehicleColor,
        lastEntry: p.updatedAt ? new Date(p.updatedAt) : undefined,
        deliverySubtype: p.deliverySubtype,
        visitCount: p.count || 1,
        lastUnits: p.unit ? [p.unit] : [],
        relationship: p.relationship,
        company: p.company || ''
      });
    });

    return Array.from(memory.values());
  }, [frequentVisitors, permanentProfiles]);

  // Handle smart suggestions based on typing
  useEffect(() => {
    if (!activeSuggestionField) {
      setSmartSuggestions([]);
      return;
    }

    const val = formData[activeSuggestionField]?.toLowerCase() || '';
    
    if (val.length < 1) {
      setSmartSuggestions([]);
      return;
    }

    const normalizeStr = (str: string) => {
      return str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";
    };

    const query = val.toLowerCase().trim();
    if (!query) {
      setSmartSuggestions([]);
      return;
    }

    const normalizedQuery = normalizeStr(query);
    const queryNum = query.replace(/\D/g, '');
    const queryPlate = query.replace(/[^A-Za-z0-9]/g, '').toLowerCase();

    // Score and tier each person in globalMemory
    interface ScoredPerson {
      person: SmartSuggestion;
      tier: number; // 1 = Active field startsWith, 2 = Active field includes, 3 = Other field startsWith, 4 = Other field includes, 5 = No match
    }

    const scoredPeople: ScoredPerson[] = [];

    globalMemory.forEach(person => {
      const normName = normalizeStr(person.name || '');
      const normDoc = normalizeStr(person.document || '');
      const normCpf = (person.cpf || '').replace(/\D/g, '');
      const normRg = normalizeStr(person.rg || '');
      const normPhone = (person.phone || '').replace(/\D/g, '');
      const normPlate = (person.plate || '').replace(/[^A-Za-z0-9]/g, '').toLowerCase();
      const normComp = normalizeStr(person.company || '');
      const normRel = normalizeStr(person.relationship || '');
      const normVeh = normalizeStr(person.vehicleModel || '');
      const normAddPlates = ((person.additionalPlates || []) as string[]).map(p => p.replace(/[^A-Za-z0-9]/g, '').toLowerCase());

      let tier = 5;

      // Check current active field first
      if (activeSuggestionField === 'name') {
        if (normName.startsWith(normalizedQuery)) {
          tier = 1;
        } else if (normName.includes(normalizedQuery)) {
          tier = 2;
        }
      } else if (activeSuggestionField === 'plate') {
        if (normPlate.startsWith(queryPlate)) {
          tier = 1;
        } else if (normPlate.includes(queryPlate) || normAddPlates.some(p => p.includes(queryPlate))) {
          tier = 2;
        }
      } else if (activeSuggestionField === 'document' || activeSuggestionField === 'cpf' || activeSuggestionField === 'rg') {
        const isDocStart = normDoc.startsWith(normalizedQuery) || (queryNum && normCpf.startsWith(queryNum)) || normRg.startsWith(normalizedQuery);
        const isDocContains = normDoc.includes(normalizedQuery) || (queryNum && normCpf.includes(queryNum)) || normRg.includes(normalizedQuery);
        if (isDocStart) {
          tier = 1;
        } else if (isDocContains) {
          tier = 2;
        }
      } else if (activeSuggestionField === 'phone') {
        if (queryNum && normPhone.startsWith(queryNum)) {
          tier = 1;
        } else if (queryNum && normPhone.includes(queryNum)) {
          tier = 2;
        }
      }

      // If active field didn't match, or matched poorly, check other fields to see if we can do better or find a match
      let otherTier = 5;
      
      // Match other fields
      // 1. Name
      if (activeSuggestionField !== 'name') {
        if (normName.startsWith(normalizedQuery)) otherTier = Math.min(otherTier, 3);
        else if (normName.includes(normalizedQuery)) otherTier = Math.min(otherTier, 4);
      }
      // 2. Plate
      if (activeSuggestionField !== 'plate') {
        if (queryPlate && normPlate.startsWith(queryPlate)) otherTier = Math.min(otherTier, 3);
        else if (queryPlate && (normPlate.includes(queryPlate) || normAddPlates.some(p => p.includes(queryPlate)))) otherTier = Math.min(otherTier, 4);
      }
      // 3. Document/CPF/RG
      if (activeSuggestionField !== 'document' && activeSuggestionField !== 'cpf' && activeSuggestionField !== 'rg') {
        const isDocStart = normDoc.startsWith(normalizedQuery) || (queryNum && normCpf.startsWith(queryNum)) || normRg.startsWith(normalizedQuery);
        const isDocContains = normDoc.includes(normalizedQuery) || (queryNum && normCpf.includes(queryNum)) || normRg.includes(normalizedQuery);
        if (isDocStart) otherTier = Math.min(otherTier, 3);
        else if (isDocContains) otherTier = Math.min(otherTier, 4);
      }
      // 4. Phone
      if (activeSuggestionField !== 'phone') {
        if (queryNum && normPhone.startsWith(queryNum)) otherTier = Math.min(otherTier, 3);
        else if (queryNum && normPhone.includes(queryNum)) otherTier = Math.min(otherTier, 4);
      }
      // 5. Company / Empresa
      if (normComp.startsWith(normalizedQuery)) otherTier = Math.min(otherTier, 3);
      else if (normComp.includes(normalizedQuery)) otherTier = Math.min(otherTier, 4);
      
      // 6. Relationship
      if (normRel.startsWith(normalizedQuery)) otherTier = Math.min(otherTier, 3);
      else if (normRel.includes(normalizedQuery)) otherTier = Math.min(otherTier, 4);

      // 7. Vehicle Model
      if (normVeh.startsWith(normalizedQuery)) otherTier = Math.min(otherTier, 3);
      else if (normVeh.includes(normalizedQuery)) otherTier = Math.min(otherTier, 4);

      // Final tier is the best tier found (lower tier number is better)
      const finalTier = Math.min(tier, otherTier);

      if (finalTier < 5) {
        scoredPeople.push({
          person,
          tier: finalTier
        });
      }
    });

    // Sort scored records:
    // 1. Better match tier (1 to 4)
    // 2. Current type match (e.g., delivery, visitor)
    // 3. Visit count (frequent users first)
    // 4. Alphabetical order on name
    const sorted = scoredPeople.sort((a, b) => {
      // 1. Tier ascending (lower = better)
      if (a.tier !== b.tier) {
        return a.tier - b.tier;
      }
      // 2. Category matches (current form type category prioritizes people of that category)
      const aIsDelivery = a.person.type === 'delivery';
      const bIsDelivery = b.person.type === 'delivery';
      const formIsDelivery = type === 'delivery';
      const aTypeMatch = aIsDelivery === formIsDelivery;
      const bTypeMatch = bIsDelivery === formIsDelivery;
      if (aTypeMatch && !bTypeMatch) return -1;
      if (!aTypeMatch && bTypeMatch) return 1;

      // 3. Visit count descending (more visits = better)
      const visitDiff = (b.person.visitCount || 0) - (a.person.visitCount || 0);
      if (visitDiff !== 0) return visitDiff;

      // 4. Alphabetical ascending
      return a.person.name.localeCompare(b.person.name, 'pt-BR');
    });

    // Map back to just the SmartSuggestion list, limit to 5
    const finalSuggestions = sorted.map(item => item.person).slice(0, 5);

    setSmartSuggestions(finalSuggestions);
  }, [formData.name, formData.document, formData.cpf, formData.rg, formData.phone, formData.plate, activeSuggestionField, globalMemory, type]);

  // Update form if initialData changes while open
  useEffect(() => {
    if (initialData) {
      const colVal = (initialData as any).vehicleColor === 'COR' ? '' : ((initialData as any).vehicleColor || '');
      const isStandard = COLOR_OPTIONS.some(opt => opt.name.toUpperCase() === colVal.toUpperCase());
      setShowCustomColorInput(colVal ? !isStandard : false);

      setFormData(prev => ({
        ...prev,
        ...initialData,
        name: cleanDefaultName(initialData.name) === 'MOTORISTA UBER' ? '' : cleanDefaultName(initialData.name),
        plate: initialData.plate === 'PLACA' ? '' : (initialData.plate || prev.plate),
        vehicleModel: initialData.vehicleModel === 'VEÍCULO' ? '' : (initialData.vehicleModel || prev.vehicleModel),
        vehicleColor: colVal,
        destination: initialData.destination || prev.destination,
      }));
      if (initialData.destination) {
        setDestSearch(initialData.destination);
      }
      const existingPrint = initialData.printImage || (initialData as any).draft?.printImage;
      if (existingPrint) {
        setOcrPreview(existingPrint);
      }
    } else if (type === 'uber') {
      resetUberOCR();
    }
  }, [initialData, type]);

  const handleAuthorizedRelease = () => {
    if (isSubmitting) return;

    if (blockedProfile) {
      toast.error('CADASTRO BLOQUEADO NO BANCO!', {
        description: `Não é possível realizar fluxo de acesso para ${blockedProfile.name}. Motivo: ${blockedProfile.blockReason || 'Não informado.'}`
      });
      return;
    }

    if (!destSearch.trim()) {
      toast.error('Preencha os dados obrigatórios antes de liberar.', {
        description: 'A Unidade (Casa/Apto) é obrigatória.'
      });
      return;
    }
    
    const typeLabel = type === 'delivery' ? 'entrega' : type === 'visitor' ? 'visita' : type === 'service' ? 'serviço' : 'corrida da Uber';
    const isDuplicate = pendingRequests.some(r => 
      r.unit.toLowerCase() === destSearch.toLowerCase() && 
      r.type === type && 
      r.status !== 'finalizado' &&
      r.id !== (initialData as any)?.pendingRequestId &&
      r.id !== initialData?.id
    );
    const isDuplicatePreAuth = preAuths.some(p => 
      p.unit.toLowerCase() === destSearch.toLowerCase() && 
      p.type === type && 
      p.status === 'autorizada' &&
      p.id !== initialData?.preAuthId &&
      p.id !== initialData?.id
    );

    if ((isDuplicate || isDuplicatePreAuth) && !showDuplicityWarning) {
      setDuplicityWarningText(`Já existe uma ${typeLabel} ativa/pendente para a unidade ${destSearch}.`);
      setShowDuplicityWarning(true);
      toast.warning('POSSÍVEL DUPLICIDADE', {
         description: `Há uma ação ativa/pendente para a unidade ${destSearch}. Verifique antes de autorizar.`,
      });
      return;
    }

    setIsSubmitting(true);
    onSubmit({
      ...formData,
      destination: destSearch,
      type: type,
      status: 'em_andamento',
      uberArrivalMinutes: formData.uberArrivalMinutes,
      printImage: ocrPreview || undefined
    });
    
    // Reset after a small delay to ensure cleanup
    setTimeout(() => {
      resetUberOCR();
      setIsSubmitting(false);
      setShowDuplicityWarning(false);
    }, 500);
  };

  const handleTemplateSelect = async (templateId: string) => {
    resetUberOCR();
    setIsProcessingOCR(true);
    setOcrStep('loading');
    
    const jobId = `job_tpl_${Date.now()}`;
    setCurrentJobId(jobId);
    
    ocrQueue.processJob(jobId, templateId, (result) => {
      setCurrentJob(result);
      setOcrStep('completed');
    }, (step) => {
      setOcrStep(step);
    });
  };

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setOcrPreview(base64);
      setFormData(prev => ({ ...prev, printImage: base64 }));
      toast.success('PRINT ANEXADO À AÇÃO', {
        description: 'A imagem foi vinculada e está salva internamente.'
      });
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmOCR = (data: { plate: string; model: string; color: string; driver: string; type: string }) => {
    const ocrColor = data.color.toUpperCase();
    const isStandard = COLOR_OPTIONS.some(opt => opt.name.toUpperCase() === ocrColor);
    setShowCustomColorInput(ocrColor ? !isStandard : false);

    setFormData(prev => ({
      ...prev,
      name: data.driver.toUpperCase(),
      plate: data.plate.toUpperCase(),
      vehicleModel: data.model.toUpperCase(),
      vehicleColor: ocrColor,
      notes: `MOTORISTA UBER VERIFICADO • PLACA ${data.plate}`
    }));
    
    setIsProcessingOCR(false);
    
    toast.success('DADOS CONFIRMADOS', {
      description: `Placa ${data.plate} e Veículo preenchidos com sucesso.`
    });
  };

  const processOCR = async (file: File) => {
    const isUber = file.name?.toLowerCase().includes('uber');
    if (isUber && type !== 'uber') {
      if (onChangeType) {
        onChangeType('uber');
        toast.info('DETECÇÃO INTELIGENTE', {
          description: 'Print de corrida Uber detectado! Mudando para o modo rápido UBER.',
          icon: <Zap className="w-4 h-4 text-emerald-500 animate-bounce" />
        });
      }
    }
    handleFileSelect(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) processOCR(file);
      }
    }
  };

  // Global drag and drop prevention to avoid browser opening the image in a new tab
  useEffect(() => {
    const preventDefault = (e: DragEvent) => e.preventDefault();
    window.addEventListener('dragover', preventDefault);
    window.addEventListener('drop', preventDefault);
    return () => {
      window.removeEventListener('dragover', preventDefault);
      window.removeEventListener('drop', preventDefault);
    };
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processOCR(file);
    }
  };

  const filteredResidents = useMemo(() => {
    if (!destSearch) return [];
    return MOCK_RESIDENTS.filter(r => 
      r.unit.toLowerCase().includes(destSearch.toLowerCase()) ||
      r.name.toLowerCase().includes(destSearch.toLowerCase())
    ).slice(0, 5);
  }, [destSearch]);

  // Search for frequent visitors linked to the current destination
  const matchingFrequents = useMemo(() => {
    if (type !== 'visitor' || !destSearch) return [];
    let matches = frequentVisitors.filter(v => 
      v.active && 
      v.unit.toLowerCase() === destSearch.toLowerCase()
    );

    return matches;
  }, [destSearch, frequentVisitors, type]);

  // Live Auto-classification based on name/notes
  useEffect(() => {
    // Only auto-classify if we are in manual entry or if the porter is typing in a way that clearly identifies a type
    if (formData.origin === 'manual' || formData.origin === 'pre_autorizacao') {
      const corrected = getCorrectedType({
        name: formData.name,
        notes: formData.notes,
        type: type // current form type
      });

      if (corrected.type !== type) {
        // We don't automatically switch the modal type as it might be disruptive, 
        // but we can update the subtype if it's delivery and subtype is missing
        if (corrected.type === 'delivery' && type === 'delivery' && !formData.deliverySubtype) {
          setFormData(prev => ({ ...prev, deliverySubtype: corrected.deliverySubtype! }));
        }
      }
    }
  }, [formData.name, formData.notes, type]);

  const matchingPreAuths = useMemo(() => {
    if (!destSearch) return [];
    return preAuths.filter(p => 
      p.status === 'autorizada' &&
      p.unit.toLowerCase() === destSearch.toLowerCase() &&
      p.type === type
    );
  }, [destSearch, preAuths, type]);

  const handleSelectSmartSuggestion = (suggestion: SmartSuggestion) => {
    const sugColor = ((suggestion as any).vehicleColor || '').toUpperCase();
    if (sugColor) {
      const isStandard = COLOR_OPTIONS.some(opt => opt.name.toUpperCase() === sugColor);
      setShowCustomColorInput(!isStandard);
    } else {
      setShowCustomColorInput(false);
    }

    setFormData(prev => ({
      ...prev,
      name: suggestion.name,
      document: suggestion.document || prev.document,
      cpf: suggestion.cpf || prev.cpf,
      rg: suggestion.rg || prev.rg,
      phone: suggestion.phone || prev.phone,
      plate: suggestion.plate || prev.plate,
      vehicleModel: suggestion.vehicleModel || prev.vehicleModel,
      vehicleColor: (suggestion as any).vehicleColor || prev.vehicleColor,
      deliverySubtype: suggestion.deliverySubtype || prev.deliverySubtype,
      relationship: suggestion.relationship || prev.relationship || '',
      destination: suggestion.lastUnits && suggestion.lastUnits.length > 0 ? suggestion.lastUnits[0] : prev.destination,
      company: suggestion.company || prev.company || ''
    }));
    
    let updatedDestSearch = destSearch;
    if (suggestion.lastUnits && suggestion.lastUnits.length > 0) {
      setDestSearch(suggestion.lastUnits[0]);
      updatedDestSearch = suggestion.lastUnits[0];
    }
    
    const lastActiveField = activeSuggestionField;
    setActiveSuggestionField(null);
    setSmartSuggestions([]);
    toast.success(`Cadastro de ${suggestion.name} aplicado!`);

    // Restore focus back inside the modal to the appropriate input
    setTimeout(() => {
      const sequence = getFocusableSequence();
      let targetField: string | null = null;
      for (const fieldName of sequence) {
        if (fieldName === 'destination') {
          if (!updatedDestSearch || !updatedDestSearch.trim()) {
            targetField = 'destination';
            break;
          }
        } else {
          let val = '';
          if (fieldName === 'name') val = suggestion.name;
          else if (fieldName === 'document') val = suggestion.document || formData.document;
          else if (fieldName === 'subtype_plate') val = suggestion.plate || formData.plate;
          else if (fieldName === 'vehicleModel') val = suggestion.vehicleModel || formData.vehicleModel;

          if (!val || !val.trim()) {
            targetField = fieldName;
            break;
          }
        }
      }

      if (targetField && inputRefs.current[targetField]) {
        inputRefs.current[targetField]?.focus();
      } else {
        // If all mandatory fields are already satisfied, focus on the lastActiveField
        // (to ensure focus is active in the form so they can hit Enter to submit)
        if (lastActiveField && inputRefs.current[lastActiveField]) {
          inputRefs.current[lastActiveField]?.focus();
        } else if (inputRefs.current.destination) {
          inputRefs.current.destination?.focus();
        }
      }
    }, 100);
  };

  const plateMatch = useMemo(() => {
    if (!formData.plate) return null;
    return matchingFrequents.find(v => v.plate?.toLowerCase() === formData.plate.toLowerCase());
  }, [formData.plate, matchingFrequents]);

  const [showAdditional, setShowAdditional] = useState(false);

  const handleSubmit = (e?: React.FormEvent | React.MouseEvent | React.KeyboardEvent) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }

    if (blockedProfile) {
      toast.error('CADASTRO BLOQUEADO NO BANCO!', {
        description: `Não é possível realizar fluxo de acesso para ${blockedProfile.name}. Motivo: ${blockedProfile.blockReason || 'Não informado.'}`
      });
      return;
    }

    const nameVal = (formData.name || '').trim();
    const docVal = (formData.document || '').trim();
    const plateVal = (formData.plate || '').trim();
    const modelVal = (formData.vehicleModel || '').trim();
    const destVal = (destSearch || '').trim();

    // Destination unit (CASA) is always required for all types
    if (!destVal) {
      toast.error('Preencha os dados obrigatórios antes de liberar.', {
        description: 'A Unidade (Casa/Apto) é obrigatória.'
      });
      return;
    }

    // Modal-specific validations in strict accordance with the rules:
    if (type === 'delivery') {
      if (!nameVal) {
        toast.error('Preencha os dados obrigatórios antes de liberar.', {
          description: 'O campo NOME é obrigatório.'
        });
        return;
      }
      if (!docVal) {
        toast.error('Preencha os dados obrigatórios antes de liberar.', {
          description: 'O campo CPF/RG é obrigatório.'
        });
        return;
      }
      if (!formData.onFoot && formData.deliverySubtype !== 'bicicleta') {
        if (!plateVal || plateVal === 'PLACA') {
          toast.error('Preencha os dados obrigatórios antes de liberar.', {
            description: 'O campo PLACA é obrigatório.'
          });
          return;
        }
      }
    } else if (type === 'visitor') {
      if (!nameVal) {
        toast.error('Preencha os dados obrigatórios antes de liberar.', {
          description: 'O campo NOME é obrigatório.'
        });
        return;
      }
      if (!docVal) {
        toast.error('Preencha os dados obrigatórios antes de liberar.', {
          description: 'O campo CPF/RG é obrigatório.'
        });
        return;
      }
      if (!formData.onFoot && formData.deliverySubtype !== 'bicicleta') {
        if (!plateVal || plateVal === 'PLACA') {
          toast.error('Preencha os dados obrigatórios antes de liberar.', {
            description: 'O campo PLACA é obrigatório.'
          });
          return;
        }
      }
    } else if (type === 'service') {
      if (!nameVal) {
        toast.error('Preencha os dados obrigatórios antes de liberar.', {
          description: 'O campo NOME é obrigatório.'
        });
        return;
      }
      if (!docVal) {
        toast.error('Preencha os dados obrigatórios antes de liberar.', {
          description: 'O campo CPF/RG é obrigatório.'
        });
        return;
      }
      if (!formData.onFoot && formData.deliverySubtype !== 'bicicleta') {
        if (!plateVal || plateVal === 'PLACA') {
          toast.error('Preencha os dados obrigatórios antes de liberar.', {
            description: 'O campo PLACA é obrigatório.'
          });
          return;
        }
        if (!modelVal || modelVal === 'VEÍCULO') {
          toast.error('Preencha os dados obrigatórios antes de liberar.', {
            description: 'O campo VEÍCULO é obrigatório.'
          });
          return;
        }
      }
    } else if (type === 'uber') {
      if (!plateVal || plateVal === 'PLACA') {
        toast.error('Preencha os dados obrigatórios antes de liberar.', {
          description: 'O campo PLACA é obrigatório.'
        });
        return;
      }
      if (!modelVal || modelVal === 'VEÍCULO') {
        toast.error('Preencha os dados obrigatórios antes de liberar.', {
          description: 'O campo VEÍCULO é obrigatório.'
        });
        return;
      }
    }

    if (prismaInUseWarning) {
      toast.error('Prisma indisponível.', {
        description: 'A combinação de número e cor selecionada já está em uso por outra unidade.'
      });
      return;
    }

    const typeLabel = type === 'delivery' ? 'entrega' : type === 'visitor' ? 'visita' : type === 'service' ? 'serviço' : 'corrida da Uber';
    const isDuplicate = pendingRequests.some(r => 
      (r.unit || '').trim().toLowerCase() === destVal.toLowerCase() && 
      r.type === type && 
      r.status !== 'finalizado' &&
      r.id !== (initialData as any)?.pendingRequestId &&
      r.id !== initialData?.id
    );
    const isDuplicatePreAuth = preAuths.some(p => 
      (p.unit || '').trim().toLowerCase() === destVal.toLowerCase() && 
      p.type === type && 
      p.status === 'autorizada' &&
      p.id !== initialData?.preAuthId &&
      p.id !== initialData?.id
    );

    if ((isDuplicate || isDuplicatePreAuth) && !showDuplicityWarning) {
      setDuplicityWarningText(`Já existe uma ${typeLabel} ativa/pendente para a unidade ${destVal}.`);
      setShowDuplicityWarning(true);
      toast.warning('POSSÍVEL DUPLICIDADE', {
        description: `Há uma ação para a unidade ${destVal}. Verifique antes de gravar.`,
      });
      return;
    }

    onSubmit({ 
      ...formData, 
      destination: destVal,
      type,
      fastFlow,
      deliverySubtype: type === 'delivery' ? formData.deliverySubtype : undefined,
      notes: formData.onFoot ? `(A pé) ${formData.notes}` : formData.notes,
      printImage: ocrPreview || undefined
    });
  };

  const handleUseFrequent = (visitor: FrequentVisitor) => {
    setFormData({
      ...formData,
      name: visitor.name,
      plate: visitor.plate || '',
      relationship: visitor.relationship || '',
      deliverySubtype: visitor.deliverySubtype || formData.deliverySubtype,
      notes: visitor.observation || '',
      origin: 'visitante_frequente',
      ruleUsed: visitor.rule,
    });
    toast.info(`Dados de ${visitor.name} carregados!`, {
      description: `Regra: ${visitor.rule === 'SEMPRE_LIBERADO' ? 'Sempre Liberado' : 'Avisar Antes'}`
    });
  };

  const handleNotifyPortaria = () => {
    if (blockedProfile) {
      toast.error('CADASTRO BLOQUEADO!', {
        description: `Não é possível avisar o morador. Cadastro de ${blockedProfile.name} está bloqueado.`
      });
      return;
    }
    if (!destSearch || destSearch.trim() === '') {
      toast.error('UNIDADE NÃO INFORMADA', {
        description: 'Digite o número da casa para avisar o morador.'
      });
      inputRefs.current.destination?.focus();
      return;
    }

    const unit = destSearch.toUpperCase();
    let message = '';

    if (type === 'delivery') {
      message = `Olá, informamos que há uma entrega na portaria referente à sua unidade ${unit}. Por favor, retire quando possível.`;
    } else {
      // UBER / VISITANTE / PRESTADOR
      const arrivingType = type === 'uber' ? 'UBER' : type === 'visitor' ? 'VISITANTE' : 'PRESTADOR';
      message = `Olá, informamos que há uma chegada (${arrivingType}) na portaria para a unidade ${unit}. Pedimos a confirmação para liberação.`;
    }

    navigator.clipboard.writeText(message).then(() => {
      toast.success('MENSAGEM COPIADA', {
        description: 'Texto pronto para colar no WhatsApp.',
        position: 'bottom-center',
        duration: 3000
      });
    }).catch(err => {
      console.error('Falha ao copiar:', err);
      toast.error('FALHA AO COPIAR', { description: 'Tente copiar manualmente.' });
    });

    if (onNotifyResident) {
      onNotifyResident({ ...formData, destination: destSearch, message, notifyMode: 'portaria' });
    }
  };

  const handleNotifyCaminho = () => {
    if (blockedProfile) {
      toast.error('CADASTRO BLOQUEADO!', {
        description: `Não é possível avisar o morador. Cadastro de ${blockedProfile.name} está bloqueado.`
      });
      return;
    }
    if (!destSearch || destSearch.trim() === '') {
      toast.error('UNIDADE NÃO INFORMADA', {
        description: 'Digite o número da casa para avisar o morador.'
      });
      inputRefs.current.destination?.focus();
      return;
    }

    const unit = destSearch.toUpperCase();
    const arrivingTypeName = type === 'delivery' ? 'entregador' : type === 'uber' ? 'Uber' : type === 'visitor' ? 'visitante' : 'prestador';
    const message = `Olá. Seu ${arrivingTypeName} foi liberado e está a caminho da sua unidade.`;

    navigator.clipboard.writeText(message).then(() => {
      toast.success('MENSAGEM COPIADA', {
        description: 'Texto pronto para colar no WhatsApp.',
        position: 'bottom-center',
        duration: 3000
      });
    }).catch(err => {
      console.error('Falha ao copiar:', err);
      toast.error('FALHA AO COPIAR', { description: 'Tente copiar manualmente.' });
    });

    setIsNotifiedCaminho(true);
  };

  const renderSmartSuggestions = (field: 'name' | 'document' | 'plate' | 'cpf' | 'rg' | 'phone') => {
    if (activeSuggestionField !== field || smartSuggestions.length === 0) return null;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="absolute z-20 left-0 right-0 mt-1 bg-white border border-blue-200 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-blue-500/20"
      >
        <div className="bg-blue-600 px-3 py-1.5 border-b border-blue-700 flex items-center justify-between">
          <span className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 fill-white animate-pulse" />
            Sugestão Inteligente
          </span>
          <span className="text-[9px] font-bold text-blue-100">{smartSuggestions.length} encontrados</span>
        </div>
        <div 
          ref={suggestionsContainerRef}
          className={cn("overflow-y-auto divide-y divide-slate-100 font-sans", type !== 'uber' ? "max-h-[460px]" : "max-h-[280px]")}
        >
          {smartSuggestions.map((s, i) => {
            const isSelected = i === selectedSuggestionIndex;
            const categoryLabel = (() => {
              if (s.type === 'visitor') return 'VISITANTE';
              if (s.type === 'service') return 'PRESTADOR';
              if (s.type === 'uber') return 'UBER';
              if (s.type === 'delivery') {
                const sub = s.deliverySubtype || 'motoboy';
                if (sub === 'motoboy') return 'MOTOBOY';
                if (sub === 'carro') return 'CARRO';
                if (sub === 'bicicleta') return 'BIKE';
                if (sub === 'transportadora') return 'VAN';
                if (sub === 'outro') return 'OUTRO';
                if (sub === 'a_pe') return 'A PÉ';
                return String(sub).toUpperCase();
              }
              return 'VISITANTE';
            })();

            return (
              <button
                key={i}
                type="button"
                className={cn(
                  "w-full p-2 md:p-2.5 text-left flex flex-col gap-1 transition-all group outline-none",
                  isSelected 
                    ? "bg-blue-50/85 border-l-4 border-blue-600 pl-1.5 md:pl-2" 
                    : "hover:bg-slate-50 border-l-4 border-transparent"
                )}
                onClick={() => handleSelectSmartSuggestion(s)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <span className={cn(
                      "font-black text-slate-900 uppercase text-xs sm:text-sm tracking-tight transition-colors",
                      isSelected ? "text-blue-600" : "group-hover:text-blue-600"
                    )}>
                      {s.name}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <div className="flex items-center gap-0.5 bg-emerald-50 text-emerald-700 px-1 py-0.2 rounded text-[8px] font-black uppercase tracking-widest">
                        <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                        {s.visitCount || 0} ACESSOS
                      </div>
                      {s.lastUnits && s.lastUnits.length > 0 && (
                        <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest ml-2.5">
                          {s.lastUnits[0]}
                        </span>
                      )}
                    </div>
                  </div>
                  {s.lastEntry && (
                    <div className="text-right flex flex-col items-end">
                      <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">Última entrada</span>
                      <span className="text-[9px] font-black text-slate-600">{format(new Date(s.lastEntry), 'dd/MM HH:mm')}</span>
                    </div>
                  )}
                </div>

                {/* Layout compacto em duas colunas para Documento e Veículos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-1">
                  {/* CPF/RG */}
                  <div className="flex items-center gap-1.5 text-[9px] text-slate-600 font-bold bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 min-w-0">
                    <FileText className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate uppercase tracking-tight">{s.document || 'RG/CPF NÃO INFORMADO'}</span>
                  </div>
                  
                  {/* Veículo/Placa principal */}
                  <div className="bg-[#133d47]/5 px-2 py-1 rounded-lg border border-[#133d47]/10 flex items-center justify-between min-w-0 gap-2 w-full">
                    <div className="flex items-center gap-1.5 truncate min-w-0">
                      <Car className="w-3.5 h-3.5 text-[#133d47] shrink-0" />
                      <span className="text-[12px] sm:text-[13px] font-black text-slate-950 bg-white px-1.5 py-0.5 rounded border border-slate-200 tracking-widest uppercase truncate shadow-sm flex items-center h-5">
                        {s.plate && s.plate.trim() ? s.plate.toUpperCase() : 'SEM PLACA'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                      {s.vehicleModel && (
                        <span className="text-[8.5px] font-bold text-[#133d47]/60 uppercase tracking-tight truncate max-w-[65px]">{s.vehicleModel}</span>
                      )}
                      {s.vehicleModel && <span className="text-[8.5px] text-[#133d47]/30 font-bold">•</span>}
                      <span className="text-[9px] font-black text-[#133d47] uppercase tracking-wider">
                        {categoryLabel}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Outras placas adicionais */}
                {((s as any).additionalPlates && (s as any).additionalPlates.length > 0) && (
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 pt-1 border-t border-slate-100/60 text-[8px]">
                    <div className="flex items-center gap-1 ml-auto">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Placas:</span>
                      <div className="flex gap-0.5">
                        {(s as any).additionalPlates.map((p: string, idx: number) => (
                          <span key={idx} className="text-[8px] font-black text-slate-500 bg-white border border-slate-100/80 px-1 rounded-md uppercase">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </motion.div>
    );
  };

  const getTitle = () => {
    const prefix = fastFlow ? 'Fluxo Rápido: ' : '';
    switch (type) {
      case 'visitor': return `${prefix}Novo Visitante`;
      case 'delivery': return `${prefix}Nova Entrega`;
      case 'service': return `${prefix}Novo Prestador`;
      case 'uber': return `${prefix}🚘 UBER`;
      default: return `${prefix}Registro`;
    }
  };

  return (
    <motion.div
      key={type}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      onAnimationComplete={() => setTimeout(setActualFocus, 50)}
      className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full overflow-hidden flex flex-col max-h-[90vh] md:max-h-[95vh] sm:max-h-[85vh]"
    >
      {/* Header Fixo - Sempre visível no topo */}
      <div className="flex justify-between items-center py-2 px-4 sm:py-3 sm:px-6 border-b border-slate-100 bg-white z-30 shrink-0">
        <h2 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight truncate pr-2">{getTitle()}</h2>
        <button 
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose(blockedProfile ? { isBlockedClose: true } as any : { ...formData, destination: destSearch });
          }} 
          className="p-1 px-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-all active:scale-90 shrink-0 flex items-center justify-center min-w-[32px] min-h-[32px] sm:min-w-[36px] sm:min-h-[36px]"
          aria-label="Fechar modal"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Conteúdo com Scroll */}
      <div 
        className={cn(
          "flex-1 overflow-y-auto transition-all duration-200 relative",
          type !== 'uber' ? "p-3 pt-1 md:p-4 md:pt-1" : "p-4 pt-3 sm:p-5",
          isDragging && "bg-blue-50/50 ring-4 ring-blue-400 ring-inset"
        )}
        onPaste={handlePaste}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Pulsating Blocked Alarm Banner */}
        {blockedProfile && (
          <div 
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                onClose({ isBlockedClose: true } as any);
              }
            }}
            className="absolute inset-0 bg-slate-950/65 backdrop-blur-xs z-20 flex flex-col items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-sm bg-red-50 border-4 border-red-500 rounded-3xl p-5 flex flex-col items-center justify-center text-center gap-2 shadow-2xl my-auto animate-pulse focus-within:ring-4 focus-within:ring-red-300 relative"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onClose({ isBlockedClose: true } as any);
                }}
                className="absolute top-3 right-3 p-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-full transition-all active:scale-90"
                aria-label="Fechar alerta de bloqueio"
              >
                <X className="w-4 h-4 font-black" />
              </button>
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 animate-bounce shrink-0">
                <ShieldAlert className="w-8 h-8 font-black" />
              </div>
              <div>
                <h3 className="text-red-600 font-black text-base sm:text-lg uppercase tracking-tight font-sans leading-tight">
                  🚫 ATENÇÃO: CADASTRO BLOQUEADO!
                </h3>
                <p className="text-[10px] font-black uppercase text-red-700 bg-red-100 px-3 py-1 rounded inline-block mt-2 tracking-wider border border-red-200">
                  {blockedProfile.type === 'delivery' ? 'ENTREGADOR BLOQUEADO' : 'VISITANTE BLOQUEADO'}
                </p>
              </div>
              
              <div className="bg-white rounded-xl p-3 border border-red-200 w-full mt-1.5 shadow-inner">
                <span className="block text-slate-400 text-[10px] font-bold uppercase tracking-widest leading-none mb-1">
                  Motivo do Bloqueio:
                </span>
                <span className="text-red-750 font-black text-xs sm:text-sm uppercase tracking-tight block">
                  {blockedProfile.blockReason || 'MEDIDA PROTETIVA / NÃO AUTORIZADO'}
                </span>
              </div>

              <p className="text-[10px] font-bold text-red-500 uppercase tracking-wide mt-2">
                ⚠️ Liberação estritamente proibida por questões de segurança.
              </p>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onClose({ isBlockedClose: true } as any);
                }}
                className="w-full mt-3 py-2 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-1.5 border-b-2 border-red-800 shadow-md cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5 font-black" />
                CANCELAR
              </button>
            </motion.div>
          </div>
        )}

        {/* PARTE SUPERIOR - APENAS PRINT / ANEXO OCUPANDO TODA A LARGURA */}
        {!isFastFlowActive && type === 'uber' && (
          <div className={cn("w-full shrink-0", type !== 'uber' ? "mb-1.5" : "mb-3")}>
            <div className="select-none bg-white rounded-xl shrink-0 relative w-full">
              {ocrPreview ? (
                <div className="relative w-full h-[110px] bg-slate-50 border border-slate-200 rounded-xl overflow-hidden group">
                  {/* Scrollable Container for Mouse Wheel / Touch */}
                  <div className="w-full h-full overflow-y-auto overflow-x-hidden p-1 scrollbar-thin scrollbar-thumb-slate-300">
                    <img 
                      src={ocrPreview} 
                      alt="Print Anexado" 
                      referrerPolicy="no-referrer"
                      className="w-full h-auto block rounded-lg select-none mx-auto"
                    />
                  </div>

                  {/* Fixed floating EXCLUIR X Button */}
                  <div className="absolute right-1.5 top-1.5 z-10 pointer-events-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setOcrPreview(null);
                        setFormData(prev => ({ ...prev, printImage: undefined }));
                      }}
                      className="p-1 px-1.5 bg-red-600/90 hover:bg-red-700 text-white rounded-lg transition-all active:scale-95 shadow-md flex items-center justify-center cursor-pointer text-[8px] font-black uppercase tracking-tight"
                      title="Excluir"
                    >
                      EXCLUIR X
                    </button>
                  </div>
                </div>
              ) : (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 hover:border-blue-400 hover:dashed bg-slate-50/50 hover:bg-slate-50/80 rounded-xl p-2 flex flex-col items-center justify-center cursor-pointer transition-all group h-[110px] text-center select-none shadow-xs w-full"
                >
                  <Camera className="w-5 h-5 text-slate-500 group-hover:scale-110 transition-transform mb-1 shrink-0" />
                  <h5 className="text-[10px] font-black uppercase text-slate-700 tracking-tight leading-none animate-pulse">Anexar Print Opcional</h5>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">Clique ou arraste o print do WhatsApp aqui</p>
                </div>
              )}
            </div>

            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) processOCR(file);
              }}
            />
          </div>
        )}

        {/* MODAL ÜBER/DELIVERY - NOVO LAYOUT OPERACIONAL ASSISTIDO COMPACTO */}
        {isFastFlowActive ? (
          /* MODO RÁPIDO - APENAS UNIDADE */
          <div className="flex flex-col gap-3 animate-in fade-in duration-300">
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-350">
              <div className="relative group">
                <Home className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  ref={el => inputRefs.current.destination = el}
                  autoFocus={!isDestInitialFilled}
                  type="text"
                  placeholder="CASA / APTO"
                  className="w-full h-[46px] pl-12 pr-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 focus:bg-white outline-none transition-all text-lg font-black uppercase text-center tracking-wider shadow-sm"
                  value={destSearch}
                  onChange={(e) => {
                    setDestSearch(e.target.value.toUpperCase());
                    setShowDestSuggestions(true);
                  }}
                  onFocus={() => setShowDestSuggestions(true)}
                />
                <AnimatePresence>
                  {showDestSuggestions && filteredResidents.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="absolute z-40 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden ring-4 ring-slate-900/5 text-left"
                    >
                      {filteredResidents.map((r, i) => (
                        <button
                          key={i}
                          type="button"
                          className="w-full px-4 py-3 text-left hover:bg-blue-50 flex justify-between items-center border-b border-slate-50 last:border-0"
                          onClick={() => {
                            setDestSearch(r.unit);
                            setShowDestSuggestions(false);
                          }}
                        >
                          <span className="font-black text-slate-900 text-sm tracking-tight">{r.unit}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{r.name}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* HELPER BOX & QUICK TICKER */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/50 flex flex-col items-center gap-1.5 text-center select-none shadow-sm">
                <span className="text-[10px] font-black text-amber-800 bg-amber-100/80 px-2.5 py-0.5 rounded-full uppercase tracking-widest flex items-center gap-1 shadow-sm">
                  <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                  Criação Rápida Ativa
                </span>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight max-w-[320px] leading-relaxed">
                  Basta digitar a unidade. Após 2 segundos sem digitação, {type === 'uber' ? 'a corrida UBER' : 'a entrega'} será registrada automaticamente!
                </p>
                
                {isTicking && (
                  <div className="w-full flex flex-col items-center gap-1 mt-1">
                    <span className="text-[10px] text-emerald-600 font-extrabold tracking-widest uppercase flex items-center gap-1 animate-pulse bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      Criando ação em 2 segundos...
                    </span>
                    <div className="w-32 h-1 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full animate-[progress_2s_linear_infinite]" />
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setForceUberManual(true)}
                  className="mt-1 text-[9.5px] font-black text-blue-600 hover:text-blue-800 uppercase tracking-widest underline transition active:scale-95"
                >
                  {type === 'uber' ? 'Preencher Dados do Veículo Agora' : 'Preencher Dados do Entregador Agora'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* MODAL ÜBER - NOVO LAYOUT OPERACIONAL ASSISTIDO COMPACTO */}
            {type === 'uber' && (
              <div className="flex flex-col gap-3">
                {/* MODO COMPLETO (PADRÃO) */}
                <div className="space-y-3 animate-in fade-in duration-200">
                <div className="grid grid-cols-12 gap-2 pb-0.5">
                  <div className="col-span-3 relative group">
                    <Home className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      ref={el => inputRefs.current.destination = el}
                      autoFocus={!isDestInitialFilled}
                      type="text"
                      placeholder="CASA/APTO"
                      className="w-full h-[46px] pl-12 pr-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 focus:bg-white outline-none transition-all text-base font-black uppercase tracking-tighter"
                      value={destSearch}
                      onChange={(e) => {
                        setDestSearch(e.target.value.toUpperCase());
                        setShowDestSuggestions(true);
                      }}
                      onFocus={() => setShowDestSuggestions(true)}
                      onKeyDown={(e) => handleKeyDown(e, 'destination')}
                    />
                    <AnimatePresence>
                      {showDestSuggestions && filteredResidents.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="absolute z-40 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden ring-4 ring-slate-900/5"
                        >
                          {filteredResidents.map((r, i) => (
                            <button
                              key={i}
                              type="button"
                              className="w-full px-4 py-3 text-left hover:bg-blue-50 flex justify-between items-center border-b border-slate-50 last:border-0"
                              onClick={() => {
                                setDestSearch(r.unit);
                                setShowDestSuggestions(false);
                              }}
                            >
                              <span className="font-black text-slate-900 text-sm tracking-tight">{r.unit}</span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{r.name}</span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="col-span-3 relative group">
                    <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      ref={el => inputRefs.current.document = el}
                      type="text"
                      placeholder="RG / CPF"
                      className="w-full h-[46px] pl-12 pr-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 focus:bg-white outline-none transition-all text-base font-medium tracking-tight uppercase"
                      value={formData.document}
                      onChange={(e) => {
                        let val = e.target.value;
                        const digits = val.replace(/\D/g, '');
                        if (digits.length === 11 && /^\d+$/.test(digits)) {
                          val = digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
                          setFormData({ ...formData, document: val, cpf: val, rg: '' });
                        } else {
                          setFormData({ ...formData, document: val.toUpperCase(), cpf: '', rg: val.toUpperCase() });
                        }
                        setActiveSuggestionField('document');
                      }}
                      onFocus={() => setActiveSuggestionField('document')}
                      onBlur={() => setTimeout(() => setActiveSuggestionField(null), 200)}
                      onKeyDown={(e) => handleKeyDown(e, 'document')}
                    />
                    {renderSmartSuggestions('document')}
                  </div>

                  <div className="col-span-6 relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      ref={el => inputRefs.current.name = el}
                      autoFocus={isDestInitialFilled && !(initialData && initialData.name)}
                      type="text"
                      placeholder="NOME MOTORISTA"
                      className="w-full h-[46px] pl-12 pr-10 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 focus:bg-white outline-none transition-all text-base font-bold uppercase tracking-tight"
                      value={formData.name}
                      onChange={(e) => {
                        setFormData({ ...formData, name: e.target.value.toUpperCase() });
                        setActiveSuggestionField('name');
                      }}
                      onFocus={() => setActiveSuggestionField('name')}
                      onBlur={() => setTimeout(() => setActiveSuggestionField(null), 200)}
                      onKeyDown={(e) => handleKeyDown(e, 'name')}
                    />
                    {renderSmartSuggestions('name')}
                  </div>
                </div>

                {/* Unified 12-column grid representing vehicle info with same style as other forms */}
                <div className="grid grid-cols-12 gap-2">
                  {/* TIPO DE VEÍCULO: Takes 2 of 12 columns (narrow select) */}
                  <div className="col-span-2 relative group">
                    {formData.deliverySubtype === 'motoboy' || formData.deliverySubtype === 'bicicleta' ? (
                      <Bike className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500" />
                    ) : (
                      <Car className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500" />
                    )}
                    <select
                      className="w-full h-[46px] pl-[18px] pr-[10px] bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 focus:bg-white outline-none transition-all text-[8.5px] font-black uppercase tracking-wider appearance-none"
                      value={formData.deliverySubtype || 'carro'}
                      onChange={(e) => {
                        const val = e.target.value as DeliverySubtype;
                        setFormData({ ...formData, deliverySubtype: val });
                      }}
                    >
                      <option value="motoboy">MOTO</option>
                      <option value="carro">CARRO</option>
                      <option value="bicicleta">BIKE</option>
                      <option value="transportadora">VAN</option>
                      <option value="outro">OUTRO</option>
                    </select>
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <ChevronDown className="w-2.5 h-2.5" />
                    </div>
                  </div>

                  {/* PLACA: Takes 3 of 12 columns */}
                  <div className="col-span-3 relative group">
                    <Car className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      ref={el => inputRefs.current.subtype_plate = el}
                      type="text"
                      placeholder="PLACA"
                      className={cn(
                        "w-full h-[46px] pl-7.5 pr-1 border-2 rounded-xl focus:outline-none text-xs font-black uppercase tracking-wider transition-all",
                        formData.plate ? "bg-emerald-50 border-emerald-400 text-emerald-900 shadow-inner" : "bg-slate-50 border-slate-100 focus:border-blue-500"
                      )}
                      value={formData.plate}
                      onChange={(e) => {
                        setFormData({ ...formData, plate: e.target.value.toUpperCase() });
                        setActiveSuggestionField('plate');
                      }}
                      onFocus={() => setActiveSuggestionField('plate')}
                      onBlur={() => setTimeout(() => setActiveSuggestionField(null), 200)}
                      onKeyDown={(e) => handleKeyDown(e, 'subtype_plate')}
                    />
                    {renderSmartSuggestions('plate')}
                  </div>

                  {/* VEÍCULO (vehicleModel): Takes 4 of 12 columns */}
                  <div className="col-span-4 relative group">
                    <input
                      ref={el => inputRefs.current.vehicleModel = el}
                      type="text"
                      placeholder="VEÍCULO"
                      className="w-full h-[46px] px-2 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 focus:bg-white outline-none focus:outline-none text-xs font-bold uppercase tracking-tight transition-all"
                      value={formData.vehicleModel}
                      onChange={(e) => setFormData({ ...formData, vehicleModel: e.target.value.toUpperCase() })}
                      onKeyDown={(e) => handleKeyDown(e, 'vehicleModel')}
                    />
                  </div>

                  {/* COR: Takes 3 of 12 columns */}
                  <div className="col-span-3 transition-all duration-200">
                    {showCustomColorInput ? (
                      <div className="relative">
                        <input
                          ref={customColorInputRef}
                          type="text"
                          placeholder="OUTRA COR"
                          className="w-full h-[46px] pl-3 pr-8 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:bg-white outline-none focus:outline-none text-xs font-bold uppercase tracking-tight transition-all"
                          value={formData.vehicleColor}
                          onChange={(e) => setFormData({ ...formData, vehicleColor: e.target.value.toUpperCase() })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              inputRefs.current.notes?.focus();
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              setShowCustomColorInput(false);
                              setFormData({ ...formData, vehicleColor: '' });
                              setTimeout(() => {
                                colorRefs.current[10]?.focus(); // focus "Outra" button again
                              }, 50);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setShowCustomColorInput(false);
                            setFormData({ ...formData, vehicleColor: '' });
                            setTimeout(() => {
                              colorRefs.current[10]?.focus();
                            }, 50);
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                          title="Voltar para seleção"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-6 gap-1 p-1 bg-slate-50 border-2 border-slate-100 rounded-xl h-[46px] items-center justify-center relative">
                        {COLOR_OPTIONS.map((opt, idx) => {
                          const isSelected = formData.vehicleColor?.toUpperCase() === opt.name.toUpperCase();
                          return (
                            <button
                              key={opt.id}
                              ref={el => {
                                if (idx === 0) {
                                  inputRefs.current.vehicleColor = el; // first available dot ref
                                }
                                colorRefs.current[idx] = el;
                              }}
                              type="button"
                              title={opt.name}
                              onClick={() => {
                                if (opt.id === 'outra') {
                                  setFormData(prev => ({ ...prev, vehicleColor: '' }));
                                  setShowCustomColorInput(true);
                                  setTimeout(() => {
                                    customColorInputRef.current?.focus();
                                  }, 50);
                                } else {
                                  setFormData(prev => ({ ...prev, vehicleColor: opt.name.toUpperCase() }));
                                  setShowCustomColorInput(false);
                                  setTimeout(() => {
                                    inputRefs.current.notes?.focus();
                                  }, 50);
                                }
                              }}
                              onKeyDown={(e) => handleColorKeyDown(e, idx)}
                              className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all outline-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 select-none",
                                isSelected ? "scale-110 ring-2 ring-blue-600 ring-offset-1 shadow-md bg-white border border-slate-300" : "hover:scale-105 active:scale-95"
                              )}
                            >
                              <span className="text-xs leading-none">{opt.emoji}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="relative group">
                  <FileText className="absolute left-4 top-3 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  <textarea
                    ref={el => inputRefs.current.notes = el}
                    placeholder="OBSERVAÇÕES..."
                    className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 focus:bg-white outline-none transition-all text-sm font-medium min-h-[70px] sm:min-h-[85px] resize-none"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value.toUpperCase() })}
                    onKeyDown={(e) => handleKeyDown(e, 'notes')}
                  />
                </div>
              </div>
            </div>
          )}

        {/* Modal de Zoom da Foto */}
        <AnimatePresence>
          {showPhotoZoom && ocrPreview && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 md:p-10"
              onClick={() => setShowPhotoZoom(false)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="relative max-w-full max-h-full"
                onClick={(e) => e.stopPropagation()}
              >
                <img 
                  src={ocrPreview} 
                  alt="Zoom" 
                  className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl border-4 border-white/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPhotoZoom(false)}
                  className="absolute -top-12 right-0 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all active:scale-95"
                >
                  <X className="w-8 h-8" />
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MAIN OPERATIONAL FORM FOR NON-UBER TYPES */}
        {type !== 'uber' && (
          <form id="access-form" onSubmit={handleSubmit} className="space-y-1.5">
            <div className="grid grid-cols-2 gap-3 pb-0">
              <div className="relative group">
                <Home className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  ref={el => inputRefs.current.destination = el}
                  autoFocus={!isDestInitialFilled}
                  type="text"
                  placeholder="CASA/APTO"
                  className="w-full h-[46px] pl-12 pr-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 focus:bg-white outline-none transition-all text-base font-black uppercase tracking-tighter"
                  value={destSearch}
                  onChange={(e) => {
                    setDestSearch(e.target.value.toUpperCase());
                    setShowDestSuggestions(true);
                  }}
                  onFocus={() => setShowDestSuggestions(true)}
                  onKeyDown={(e) => handleKeyDown(e, 'destination')}
                />
                <AnimatePresence>
                  {showDestSuggestions && filteredResidents.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="absolute z-40 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden ring-4 ring-slate-900/5"
                    >
                      {filteredResidents.map((r, i) => (
                        <button
                          key={i}
                          type="button"
                          className="w-full px-4 py-3 text-left hover:bg-blue-50 flex justify-between items-center border-b border-slate-50 last:border-0"
                          onClick={() => {
                            setDestSearch(r.unit);
                            setShowDestSuggestions(false);
                          }}
                        >
                          <span className="font-black text-slate-900 text-sm tracking-tight">{r.unit}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{r.name}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  ref={el => inputRefs.current.name = el}
                  autoFocus={isDestInitialFilled && !(initialData && initialData.name)}
                  type="text"
                  placeholder={type === 'delivery' ? "NOME ENTREGADOR" : "NOME COMPLETO"}
                  className="w-full h-[46px] pl-12 pr-10 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 focus:bg-white outline-none transition-all text-base font-bold uppercase tracking-tight"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value.toUpperCase() });
                    setActiveSuggestionField('name');
                  }}
                  onFocus={() => setActiveSuggestionField('name')}
                  onBlur={() => setTimeout(() => setActiveSuggestionField(null), 200)}
                  onKeyDown={(e) => handleKeyDown(e, 'name')}
                />
                {renderSmartSuggestions('name')}
              </div>
            </div>

            {/* RG / CPF unified field + PRISMA field in the same row if visitor/service */}
            {type === 'visitor' || type === 'service' ? (
              <div className="grid grid-cols-2 gap-3 pb-0 relative">
                <div className="relative group">
                  <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    ref={el => inputRefs.current.document = el}
                    type="text"
                    placeholder="RG / CPF"
                    className="w-full h-[46px] pl-12 pr-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 focus:bg-white outline-none transition-all text-sm font-medium tracking-tight uppercase"
                    value={formData.document}
                    onChange={(e) => {
                      let val = e.target.value;
                      const digits = val.replace(/\D/g, '');
                      if (digits.length === 11 && /^\d+$/.test(digits)) {
                        val = digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
                        setFormData({ ...formData, document: val, cpf: val, rg: '' });
                      } else {
                        setFormData({ ...formData, document: val.toUpperCase(), cpf: '', rg: val.toUpperCase() });
                      }
                      setActiveSuggestionField('document');
                    }}
                    onFocus={() => setActiveSuggestionField('document')}
                    onBlur={() => setTimeout(() => setActiveSuggestionField(null), 200)}
                    onKeyDown={(e) => handleKeyDown(e, 'document')}
                  />
                  {renderSmartSuggestions('document')}
                </div>
                
                {/* PRISMA INPUT + CORES SELECTION */}
                <div className="flex items-center bg-slate-50 border-2 border-slate-100 rounded-xl px-2 h-[46px] min-w-0">
                  {/* PRISMA field */}
                  <div className="w-14 shrink-0 pr-1">
                    <input
                      ref={el => inputRefs.current.prismaNumber = el}
                      type="text"
                      placeholder="PRISMA"
                      className="w-full text-center font-black text-sm text-slate-800 bg-transparent h-8 outline-none uppercase placeholder:text-[9px] placeholder:font-black placeholder:text-slate-400"
                      value={formData.prismaNumber || ''}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, '');
                        if (raw === '') {
                          setFormData({ ...formData, prismaNumber: undefined });
                        } else {
                          const n = parseInt(raw, 10);
                          if (n >= 0 && n <= 30) {
                            setFormData({ ...formData, prismaNumber: raw });
                          }
                        }
                      }}
                      onKeyDown={(e) => handleKeyDown(e, 'prismaNumber')}
                    />
                  </div>
                  
                  <span className="h-6 w-[2px] bg-slate-200 shrink-0" />
                  
                  {/* COLOR DOTS SELECTION: Yellow, Red, Blue, Green */}
                  <div className="flex flex-1 justify-around items-center gap-1 pl-1.5 min-w-0">
                    {[
                      { name: 'Amarelo', colorClass: 'bg-yellow-450', title: '🟡' },
                      { name: 'Vermelho', colorClass: 'bg-red-500', title: '🔴' },
                      { name: 'Azul', colorClass: 'bg-blue-600', title: '🔵' },
                      { name: 'Verde', colorClass: 'bg-emerald-555', title: '🟢' }
                    ].map((c, idx) => {
                      const active = formData.prismaColor === c.name;
                      return (
                        <button
                          key={c.name}
                          ref={el => {
                            if (idx === 0) {
                              inputRefs.current.prismaColor = el; // allows focusing from prismaNumber
                            }
                            prismaColorRefs.current[idx] = el;
                          }}
                          type="button"
                          onClick={() => {
                            setFormData({ 
                              ...formData, 
                              prismaColor: formData.prismaColor === c.name ? undefined : c.name 
                            });
                            setTimeout(() => {
                              advanceFromField('prismaColor');
                            }, 50);
                          }}
                          onKeyDown={(e) => handlePrismaColorKeyDown(e, idx)}
                          className={cn(
                            "w-5 h-5 rounded-full cursor-pointer relative shrink-0 transition-transform outline-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1",
                            c.name === 'Amarelo' ? 'bg-yellow-400 border border-yellow-500' :
                            c.name === 'Vermelho' ? 'bg-red-500 border border-red-600' :
                            c.name === 'Azul' ? 'bg-blue-600 border border-blue-700' :
                            'bg-emerald-500 border border-emerald-600',
                            active ? "scale-110 shadow-md ring-2 ring-slate-800 ring-offset-1" : "opacity-60 hover:opacity-100"
                          )}
                          title={c.name}
                        >
                          {active && (
                            <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-white bg-black/15 rounded-full select-none">
                              ✓
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {prismaInUseWarning && (
                  <span className="absolute left-1 -bottom-4 text-[9px] text-red-500 font-bold select-none animate-pulse">
                    ⚠️ Prisma indisponível.
                  </span>
                )}
              </div>
            ) : (
              <div className="relative group">
                <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  ref={el => inputRefs.current.document = el}
                  type="text"
                  placeholder="RG / CPF"
                  className="w-full h-[46px] pl-12 pr-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 focus:bg-white outline-none transition-all text-base font-medium tracking-tight uppercase"
                  value={formData.document}
                  onChange={(e) => {
                    let val = e.target.value;
                    const digits = val.replace(/\D/g, '');
                    if (digits.length === 11 && /^\d+$/.test(digits)) {
                      val = digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
                      setFormData({ ...formData, document: val, cpf: val, rg: '' });
                    } else {
                      setFormData({ ...formData, document: val.toUpperCase(), cpf: '', rg: val.toUpperCase() });
                    }
                    setActiveSuggestionField('document');
                  }}
                  onFocus={() => setActiveSuggestionField('document')}
                  onBlur={() => setTimeout(() => setActiveSuggestionField(null), 200)}
                  onKeyDown={(e) => handleKeyDown(e, 'document')}
                />
                {renderSmartSuggestions('document')}
              </div>
            )}

            <div className="grid grid-cols-12 gap-2">
              {/* TIPO DE VEÍCULO: Takes 2 of 12 columns (narrow select) */}
              <div className="col-span-2 relative group">
                {formData.deliverySubtype === 'motoboy' || formData.deliverySubtype === 'bicicleta' ? (
                  <Bike className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500" />
                ) : (
                  <Car className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500" />
                )}
                <select
                  disabled={formData.onFoot}
                  className="w-full h-[46px] pl-[18px] pr-[10px] bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 focus:bg-white outline-none transition-all text-[8.5px] font-black uppercase tracking-wider appearance-none disabled:bg-slate-100 disabled:opacity-50"
                  value={formData.onFoot ? "a_pe" : (formData.deliverySubtype || (type === 'delivery' ? 'motoboy' : 'carro'))}
                  onChange={(e) => {
                    const val = e.target.value as DeliverySubtype;
                    if (val === 'a_pe') {
                      setFormData({ ...formData, onFoot: true, deliverySubtype: 'a_pe', plate: '', vehicleModel: '' });
                    } else if (val === 'bicicleta') {
                      setFormData({ ...formData, onFoot: false, deliverySubtype: 'bicicleta', plate: '', vehicleModel: '' });
                    } else {
                      setFormData({ ...formData, onFoot: false, deliverySubtype: val });
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = formData.onFoot ? "a_pe" : (formData.deliverySubtype || (type === 'delivery' ? 'motoboy' : 'carro'));
                      if (val === 'a_pe' || val === 'bicicleta') {
                        e.preventDefault();
                        handleSubmit(e);
                      }
                    }
                  }}
                >
                  <option value="motoboy">MOTO</option>
                  <option value="carro">CARRO</option>
                  <option value="bicicleta">BIKE</option>
                  <option value="transportadora">VAN</option>
                  <option value="outro">OUTRO</option>
                  {formData.onFoot && <option value="a_pe">A PÉ</option>}
                </select>
                <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronDown className="w-2.5 h-2.5" />
                </div>
              </div>

              {/* PLACA: Takes 3 of 12 columns */}
              <div className="col-span-3 relative group">
                <Car className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  ref={el => inputRefs.current.subtype_plate = el}
                  type="text"
                  disabled={formData.onFoot || formData.deliverySubtype === 'bicicleta'}
                  placeholder={(formData.onFoot || formData.deliverySubtype === 'bicicleta') ? (formData.onFoot ? "A PÉ" : "BIKE") : "PLACA"}
                  className={cn(
                    "w-full h-[46px] pl-7.5 pr-1 border-2 rounded-xl focus:outline-none text-xs font-black uppercase tracking-wider transition-all",
                    (formData.onFoot || formData.deliverySubtype === 'bicicleta') ? "bg-slate-100 border-slate-200 opacity-50 cursor-not-allowed" : "bg-slate-50 border-slate-100 focus:border-blue-500"
                  )}
                  value={(formData.onFoot || formData.deliverySubtype === 'bicicleta') ? "" : formData.plate}
                  onChange={(e) => {
                    setFormData({ ...formData, plate: e.target.value.toUpperCase() });
                    setActiveSuggestionField('plate');
                  }}
                  onFocus={() => setActiveSuggestionField('plate')}
                  onBlur={() => setTimeout(() => setActiveSuggestionField(null), 200)}
                  onKeyDown={(e) => handleKeyDown(e, 'subtype_plate')}
                />
                {renderSmartSuggestions('plate')}
              </div>

              {/* VEÍCULO (vehicleModel): Takes 5 of 12 columns */}
              <div className="col-span-5 relative group">
                <input
                  ref={el => inputRefs.current.vehicleModel = el}
                  type="text"
                  disabled={formData.onFoot || formData.deliverySubtype === 'bicicleta'}
                  placeholder={(formData.onFoot || formData.deliverySubtype === 'bicicleta') ? "" : "VEÍCULO"}
                  className={cn(
                    "w-full h-[46px] px-2 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 focus:bg-white outline-none focus:outline-none text-xs font-bold uppercase tracking-tight transition-all disabled:bg-slate-100 disabled:opacity-50",
                    (formData.onFoot || formData.deliverySubtype === 'bicicleta') ? "bg-slate-100 border-slate-200 opacity-50 cursor-not-allowed" : "bg-slate-50 border-slate-100 focus:border-blue-500"
                  )}
                  value={(formData.onFoot || formData.deliverySubtype === 'bicicleta') ? "" : formData.vehicleModel}
                  onChange={(e) => setFormData({ ...formData, vehicleModel: e.target.value.toUpperCase() })}
                  onKeyDown={(e) => handleKeyDown(e, 'vehicleModel')}
                />
              </div>

              {/* A PÉ Button: Takes 2 of 12 columns */}
              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  const newOnFoot = !formData.onFoot;
                  setFormData({ 
                    ...formData, 
                    onFoot: newOnFoot, 
                    plate: '', 
                    vehicleModel: '', 
                    deliverySubtype: newOnFoot ? 'a_pe' : (type === 'delivery' ? 'motoboy' : 'carro')
                  });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                className={cn(
                  "col-span-2 h-[46px] rounded-xl border-2 transition-all flex flex-col items-center justify-center tracking-tight uppercase font-black text-[8px]",
                  formData.onFoot 
                    ? "bg-blue-600 border-blue-400 text-white shadow-lg" 
                    : "bg-slate-50 border-slate-100 text-slate-400"
                )}
              >
                <User className="w-3.5 h-3.5" />
                A PÉ
              </button>
            </div>

            {(type === 'delivery' || type === 'service') && (
              <div className="relative group">
                <Package className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  ref={el => inputRefs.current.company = el}
                  type="text"
                  placeholder="EMPRESA / SERVIÇOS"
                  className="w-full h-[46px] pl-12 pr-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 focus:bg-white outline-none transition-all text-base font-medium tracking-tight uppercase"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value.toUpperCase() })}
                  onKeyDown={(e) => handleKeyDown(e, 'company')}
                />
              </div>
            )}

            <div className="relative group">
              <FileText className="absolute left-4 top-3 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              <textarea
                ref={el => inputRefs.current.notes = el}
                placeholder="OBSERVAÇÕES..."
                className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 focus:bg-white outline-none transition-all text-sm font-medium min-h-[70px] sm:min-h-[85px] resize-none"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value.toUpperCase() })}
                onKeyDown={(e) => handleKeyDown(e, 'notes')}
              />
            </div>
          </form>
        )}
          </>
        )}
      </div>

      {/* FOOTER FIXO OPERACIONAL PADRONIZADO (PARA TODOS OS TIPOS) */}
      <div className="p-4 pt-3 md:p-3 border-t border-slate-100 bg-white shrink-0">
        <div className="space-y-2.5 md:space-y-1.5">
          {showDuplicityWarning && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="p-3 bg-amber-500/15 border border-amber-500/30 text-amber-900 rounded-xl flex flex-col gap-2.5 shadow-sm"
            >
              <div className="flex items-start gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-amber-800">Possível Duplicidade</h4>
                  <p className="text-[11px] text-amber-700 font-bold mt-0.5 leading-snug">
                    {duplicityWarningText} Deseja prosseguir com o registro duplicado ou prefere cancelar?
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDuplicityWarning(false);
                    if (type === 'uber') {
                      setIsSubmitting(true);
                      onSubmit({
                        ...formData,
                        destination: destSearch,
                        type: type,
                        status: 'em_andamento',
                        uberArrivalMinutes: formData.uberArrivalMinutes,
                        printImage: ocrPreview || undefined
                      });
                      setTimeout(() => {
                        resetUberOCR();
                        setIsSubmitting(false);
                      }, 500);
                    } else {
                      onSubmit({ 
                        ...formData, 
                        destination: destSearch,
                        type,
                        fastFlow,
                        deliverySubtype: type === 'delivery' ? formData.deliverySubtype : undefined,
                        notes: formData.onFoot ? `(A pé) ${formData.notes}` : formData.notes,
                        printImage: ocrPreview || undefined
                      });
                    }
                  }}
                  className="px-2.5 py-1 bg-amber-50 text-slate-900 rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-amber-400 transition"
                >
                  Gravar Mesmo Assim
                </button>
                <button
                  type="button"
                  onClick={() => setShowDuplicityWarning(false)}
                  className="px-2.5 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-[9px] font-black uppercase tracking-wider transition"
                >
                   Visualizar Form
                </button>
              </div>
            </motion.div>
          )}

          {isFastFlowActive ? (
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => onClose()}
                className="h-[44px] bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-1.5 border-b-2 border-red-800 shadow-md px-2"
              >
                <X className="w-3.5 h-3.5" />
                CANCELAR
              </button>

              <button
                ref={submitButtonRef}
                type="button"
                onClick={handleFastSubmit}
                className="h-[44px] bg-emerald-600 hover:bg-emerald-700 focus:ring-2 focus:ring-white text-white font-black rounded-xl text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-1.5 border-b-2 border-emerald-800 shadow-md px-2 focus:outline-none"
              >
                <Check className="w-3.5 h-3.5" />
                CRIAR AGORA
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => { handleNotifyPortaria(); setIsNotified(true); }}
                  className={cn(
                    "h-[40px] rounded-xl font-black text-[9px] uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-1 border shadow-md px-1 text-center leading-snug",
                    isNotified || (type !== 'uber' && formData.preAuthId)
                      ? "bg-emerald-600 text-white border-emerald-400" 
                      : "bg-yellow-400 text-slate-900 border-yellow-300 hover:bg-yellow-500 shadow-yellow-100"
                  )}
                >
                  <div className="flex items-center gap-1">
                    {isNotified || (type !== 'uber' && formData.preAuthId) ? <Check className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5 text-slate-800/80" />}
                    <span className="text-[8px] font-black tracking-lighter uppercase whitespace-nowrap">ENTREGADOR PORTARIA</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleNotifyCaminho}
                  className={cn(
                    "h-[40px] rounded-xl font-black text-[9px] uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-1 border shadow-md px-1 text-center shrink-0 font-sans leading-snug",
                    isNotifiedCaminho
                      ? "bg-emerald-600 text-white border-emerald-400" 
                      : "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800"
                  )}
                >
                  {isNotifiedCaminho ? (
                    <div className="flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span className="text-[8px] font-black tracking-lighter uppercase whitespace-nowrap">MORADOR AVISADO</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="text-[8px] font-black tracking-lighter uppercase whitespace-nowrap">📢 A CAMINHO DA UNIDADE</span>
                    </div>
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={handleAuthorizedRelease}
                className="w-full h-[44px] bg-cyan-500 hover:bg-cyan-600 focus:ring-2 focus:ring-cyan-300 text-white rounded-xl text-[10.5px] font-black uppercase tracking-wider shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 group border-b-2 border-cyan-700"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                LIBERAÇÃO AUTORIZADA
              </button>

              <div className="grid grid-cols-2 gap-2.5 font-bold">
                <button
                  type="button"
                  onClick={() => onClose()}
                  className="h-[44px] bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-1.5 border-b-2 border-red-800 shadow-md px-2"
                >
                  <X className="w-3.5 h-3.5" />
                  CANCELAR
                </button>

                <button
                  ref={submitButtonRef}
                  type="button"
                  onClick={handleSubmit}
                  className="h-[44px] bg-emerald-600 hover:bg-emerald-700 focus:ring-2 focus:ring-white text-white font-black rounded-xl text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-1.5 border-b-2 border-emerald-800 shadow-md px-2 focus:outline-none"
                >
                  <Check className="w-3.5 h-3.5" />
                  {type === 'uber' ? 'LIBERAR AGORA' : 'LIBERAR ACESSO'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
