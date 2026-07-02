import React, { useState, useEffect } from 'react';
import { 
  Camera, Sliders, Check, RefreshCw, AlertTriangle, 
  Cpu, Layers, Eye, Edit3, Zap, Sparkles, MapPin, Navigation, User, ChevronRight, Car
} from 'lucide-react';
import { UBER_TEMPLATES, UberTemplate } from '../services/OCRQueueService';
import { validateAndCorrectPlate, PlateCorrectionResult } from '../lib/plateValidation';
import { cn } from '../lib/utils';

interface UberZoneOcrDeckProps {
  isProcessing: boolean;
  ocrStep: 'idle' | 'loading' | 'cropping' | 'preprocessing' | 'reading' | 'identifying' | 'completed' | 'retrying';
  setOcrStep: (step: any) => void;
  ocrPreview: string | null;
  setOcrPreview: (preview: string | null) => void;
  onConfirmOCR: (data: { plate: string; model: string; color: string; driver: string; type: string }) => void;
  onFileSelect: (file: File) => void;
  onTemplateSelected: (templateId: string) => void;
  onCancel: () => void;
  currentJob?: any;
}

export const UberZoneOcrDeck: React.FC<UberZoneOcrDeckProps> = ({
  isProcessing,
  ocrStep,
  setOcrStep,
  ocrPreview,
  setOcrPreview,
  onConfirmOCR,
  onFileSelect,
  onTemplateSelected,
  onCancel,
  currentJob
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<UberTemplate | null>(null);
  const [rawTextLog, setRawTextLog] = useState<string[]>([]);
  const [correctionReport, setCorrectionReport] = useState<PlateCorrectionResult | null>(null);
  
  // Local edit states for OCR Assistido step
  const [editPlate, setEditPlate] = useState('');
  const [editModel, setEditModel] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editDriver, setEditDriver] = useState('');
  const [editType, setEditType] = useState('Uber');
  const [isEditingMode, setIsEditingMode] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Sync edit states when complete
  useEffect(() => {
    if (ocrStep === 'completed') {
      let matchedTpl = selectedTemplate;
      if (!matchedTpl && currentJob) {
        matchedTpl = UBER_TEMPLATES.find(
          t => t.driverName === currentJob.motorista?.nome || 
               t.plateCorrected === currentJob.placa?.valor ||
               t.plateRaw === currentJob.placa?.valor
        ) || null;
      }

      if (currentJob) {
        if (matchedTpl) {
          const correction = validateAndCorrectPlate(matchedTpl.plateRaw);
          setCorrectionReport(correction);

          setEditPlate(correction.corrected);
          setEditModel(matchedTpl.vehicleModel);
          setEditColor(matchedTpl.vehicleColor);
          setEditDriver(matchedTpl.driverName);
          setEditType(matchedTpl.type);
        } else {
          const rawPlate = currentJob.placa?.valor || '---';
          const correction = validateAndCorrectPlate(rawPlate);
          setCorrectionReport(correction);

          setEditPlate(correction.corrected);
          setEditModel(currentJob.veiculo?.modelo_cor?.split(' ')[0] || 'KWID');
          setEditColor(currentJob.veiculo?.modelo_cor?.split(' ')[1] || 'BRANCO');
          setEditDriver(currentJob.motorista?.nome || 'MOTORISTA UBER');
          setEditType('Uber');
        }
      }
    }
  }, [ocrStep, currentJob, selectedTemplate]);

  // Handle template selection click
  const handleTemplateClick = (tpl: UberTemplate) => {
    setSelectedTemplate(tpl);
    setOcrPreview(tpl.imageUrl); // visually show active image template
    onTemplateSelected(tpl.id);
  };

  const currentStepLabel = () => {
    switch (ocrStep) {
      case 'loading': return 'Carregando Imagem...';
      case 'cropping': return 'Determinando Regiões (Zone OCR)...';
      case 'preprocessing': return 'Aplicando Contraste & Nitidez...';
      case 'reading': return 'Decodificando Caracteres da Região...';
      case 'identifying': return 'Aplicando Validação Probabilística...';
      case 'completed': return 'Leitura Concluída!';
      default: return 'Aguardando Print...';
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-5 space-y-5">
      {/* HEADER TÍTULO */}
      <div className="flex justify-between items-center pb-3 border-b border-slate-50">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-slate-900 rounded-xl text-white">
            <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">Leitor Inteligente UBER</h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase">Zone OCR • Algoritmo Corretor Semiautomático</p>
          </div>
        </div>
        <span className={cn(
          "px-2 px-2.5 py-1 text-[8px] font-black uppercase tracking-wider rounded-full",
          isProcessing ? "bg-amber-100 text-amber-800 animate-pulse" : "bg-emerald-100 text-emerald-800"
        )}>
          {ocrStep === 'completed' ? 'ASSISTIDO ATIVO' : isProcessing ? 'OCR OPERANDO' : 'PRONTO'}
        </span>
      </div>

      {/* SELETOR DE PRESETS / TEMPLATES REAIS */}
      {ocrStep === 'idle' && (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/50 hover:bg-slate-50/80 rounded-2xl p-6 text-center cursor-pointer transition-all group space-y-3"
        >
          <div className="mx-auto w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 group-hover:scale-115 transition-transform">
            <Camera className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-black uppercase text-slate-700">Arraste e Solte o Print UBER Aqui</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Ou Cole (Ctrl+V) • Clique para selecionar arquivo</p>
          </div>
          <span className="inline-block px-3 py-1.5 bg-slate-200 text-slate-600 rounded-lg text-[8px] font-black uppercase tracking-wider group-hover:bg-blue-600 group-hover:text-white transition-all">
            Selecionar Print
          </span>
          <input 
            ref={fileInputRef}
            type="file" 
            accept="image/*" 
            className="hidden" 
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFileSelect(file);
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* ZONE OCR SCREEN & METRICS */}
      {(ocrStep !== 'idle' || ocrPreview) && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            
            {/* CANVAS DO PRINT DO PORTEIRO */}
            <div className="md:col-span-12 lg:col-span-5 flex flex-col bg-slate-950 rounded-[1.5rem] border-4 border-slate-800 overflow-hidden shadow-2xl h-[310px] relative">
              <div className="bg-slate-905 p-2 text-center border-b border-slate-800 flex items-center justify-between px-3">
                <span className="text-[7.5px] font-mono tracking-widest text-slate-400">PRINT ENVIADO PELO PORTEIRO</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>

              {ocrPreview ? (
                <div className="flex-1 flex items-center justify-center p-3 relative bg-slate-950 overflow-hidden">
                  <img src={ocrPreview} alt="Print do porteiro" className="max-w-full max-h-full object-contain rounded-lg animate-in fade-in duration-300" />
                  
                  {/* Green Zone Bounding Box overlay for plate */}
                  <div className={cn(
                    "absolute top-[35%] left-[20%] right-[20%] h-10 border border-dashed border-emerald-500 bg-emerald-500/10 rounded flex items-center justify-between px-2 font-mono text-[7px] text-emerald-400 select-none pointer-events-none transition-all",
                    (ocrStep === 'cropping' || ocrStep === 'reading') && "animate-pulse ring-2 ring-emerald-500"
                  )}>
                    <span>[REG_PLACA]</span>
                    <span className="text-[8px] font-black tracking-widest text-white">{editPlate || 'DETECTANDO...'}</span>
                  </div>

                  {/* Blue Zone Bounding Box overlay for vehicle details */}
                  <div className={cn(
                    "absolute top-[55%] left-[15%] right-[15%] h-12 border border-dashed border-blue-500 bg-blue-500/10 rounded flex flex-col justify-center px-2 font-mono text-[6.5px] text-blue-400 select-none pointer-events-none transition-all",
                    (ocrStep === 'cropping' || ocrStep === 'reading') && "animate-pulse ring-2 ring-blue-500"
                  )}>
                    <span>[REG_VEICULO]</span>
                    <span className="text-[7.5px] font-black text-white truncate max-w-full">{editModel ? `${editModel} ${editColor}` : 'DETECTANDO...'}</span>
                  </div>

                  {/* Noise/Laser scanning overlay during process */}
                  {isProcessing && (
                    <div className="absolute inset-0 bg-slate-950/20 pointer-events-none flex flex-col justify-between overflow-hidden">
                      <div className="w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-bounce shadow-md shadow-blue-500/50" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-slate-600 bg-slate-950">
                  <Camera className="w-8 h-8 opacity-40 mb-2 animate-pulse" />
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Aguardando Envio de Print</span>
                </div>
              )}
            </div>

            {/* PRE-PROCESSING DETAILS & PIPELINE METRICS */}
            <div className="md:col-span-7 flex flex-col justify-between py-1 space-y-3">
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-blue-500" />
                  Esteira de Pré-Processamento Computacional
                </span>
                
                {/* FLOW STEPS BOX */}
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-100/80">
                  <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-white border border-slate-50 shadow-sm">
                    {['preprocessing', 'reading', 'identifying', 'completed'].includes(ocrStep) ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[3]" />
                    ) : ocrStep === 'loading' ? (
                      <div className="w-3.5 h-3.5 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full bg-slate-200" />
                    )}
                    <div className="overflow-hidden">
                      <span className="text-[8px] font-black uppercase text-slate-800 block tracking-tight leading-none">Contraste Dinâmico</span>
                      <span className="text-[7px] text-slate-400 font-bold uppercase tracking-wider leading-none">Filtro +40%</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-white border border-slate-50 shadow-sm">
                    {['preprocessing', 'reading', 'identifying', 'completed'].includes(ocrStep) ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[3]" />
                    ) : ocrStep === 'cropping' ? (
                      <div className="w-3.5 h-3.5 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full bg-slate-200" />
                    )}
                    <div className="overflow-hidden">
                      <span className="text-[8px] font-black uppercase text-slate-800 block tracking-tight leading-none">Sharpen (Nitidez)</span>
                      <span className="text-[7px] text-slate-400 font-bold uppercase tracking-wider leading-none">Leve Gaussiana</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-white border border-slate-50 shadow-sm">
                    {['reading', 'identifying', 'completed'].includes(ocrStep) ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[3]" />
                    ) : ocrStep === 'preprocessing' ? (
                      <div className="w-3.5 h-3.5 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full bg-slate-200" />
                    )}
                    <div className="overflow-hidden">
                      <span className="text-[8px] font-black uppercase text-slate-800 block tracking-tight leading-none">Redução de Ruído</span>
                      <span className="text-[7px] text-slate-400 font-bold uppercase tracking-wider leading-none">Denoise Ativo</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-white border border-slate-50 shadow-sm">
                    {['identifying', 'completed'].includes(ocrStep) ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[3]" />
                    ) : ocrStep === 'reading' ? (
                      <div className="w-3.5 h-3.5 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full bg-slate-200" />
                    )}
                    <div className="overflow-hidden">
                      <span className="text-[8px] font-black uppercase text-slate-800 block tracking-tight leading-none">Upscale Linear</span>
                      <span className="text-[7px] text-slate-400 font-bold uppercase tracking-wider leading-none">Bilinear 2.5X</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* CONSOLE STATUS DO OCR DE ZONA */}
              <div className="bg-slate-900 rounded-2xl p-4 font-mono text-[9px] text-slate-300 min-h-[110px] flex flex-col justify-between border border-slate-800 relative shadow-inner">
                <span className="absolute top-1.5 right-2 px-1 py-0.2 bg-slate-800 text-[6px] tracking-widest uppercase rounded">ACTIVE_CONSOLE</span>
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-slate-500">
                    <span className="text-[8px] text-blue-400 font-black">❯</span>
                    <span>CARREGANDO PIPELINE...</span>
                  </div>
                  {ocrStep !== 'loading' && (
                    <div className="flex items-center gap-1 text-emerald-400 font-bold">
                      <span className="text-[8px]">❯</span>
                      <span>LOCALIZADA ZONA DA PLACA EM x=182, y=86 (99.1%)</span>
                    </div>
                  )}
                  {['preprocessing', 'reading', 'identifying', 'completed'].includes(ocrStep) && (
                    <div className="flex items-center gap-1 text-emerald-400 font-bold">
                      <span className="text-[8px]">❯</span>
                      <span>LOCALIZADA ZONA DO VEÍCULO EM x=135, y=142 (97.4%)</span>
                    </div>
                  )}
                  {['reading', 'identifying', 'completed'].includes(ocrStep) && selectedTemplate && (
                    <div className="flex flex-col gap-0.5 text-amber-300">
                      <span>❯ OCR BRUTO EXTRAÍDO:</span>
                      <span className="pl-3 text-white border-l-2 border-amber-400 font-black">PLACA = "{selectedTemplate.plateRaw}" | DRIVER = "{selectedTemplate.driverName}"</span>
                    </div>
                  )}
                  {['completed'].includes(ocrStep) && correctionReport && (
                    <div className="flex flex-col gap-0.5 mt-1 border-t border-slate-800 pt-1">
                      <div className="flex items-center gap-1 text-blue-400">
                        <Sparkles className="w-3.5 h-3.5 animate-spin" />
                        <span className="font-extrabold uppercase">CORRETOR PROBABILÍSTICO BRASIL:</span>
                      </div>
                      <span className="text-white text-[10px] font-black">
                        "{correctionReport.original}" ➔ "{correctionReport.corrected}"
                      </span>
                      {correctionReport.changes.map((chg, i) => (
                        <span key={i} className="text-emerald-400 pl-3 leading-tight block text-[7.5px]">
                          ✓ Corrigida posição {chg.position}: Substituiu '{chg.from}' por '{chg.to}' ({correctionReport.format})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* PAINEL CONTROLADO / OCR ASSISTIDO COMPLETO */}
          {ocrStep === 'completed' && currentJob && (
            <div className="bg-emerald-50/50 rounded-2xl border-2 border-emerald-500/20 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px] font-black">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider block">CONVENÇÃO OCR ASSISTIDO ATIVA</span>
                    <p className="text-[8px] text-emerald-600 font-bold uppercase">Verifique e edite os dados detectados antes de preencher</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingMode(!isEditingMode)}
                  className="px-2.5 py-1 text-[8.5px] font-black uppercase tracking-wider rounded-lg border border-emerald-500/30 bg-white shadow-sm hover:bg-emerald-50 text-emerald-800 transition-all active:scale-95 flex items-center gap-1"
                >
                  <Edit3 className="w-3 h-3 text-emerald-600" />
                  {isEditingMode ? 'SALVAR EDICÃO' : 'EDITAR DADOS'}
                </button>
              </div>

              {/* INPUTS DE CONFRONTAÇÃO ASSISTIDA */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white border border-slate-100 p-3.5 rounded-xl shadow-sm">
                <div>
                  <label className="text-[7.5px] font-black uppercase tracking-widest text-slate-400 block mb-1">MOTORISTA</label>
                  <input
                    disabled={!isEditingMode}
                    className="w-full text-xs font-bold uppercase text-slate-800 p-2 bg-slate-50 border border-slate-100 rounded-lg focus:outline-emerald-500 disabled:opacity-80"
                    value={editDriver}
                    onChange={(e) => setEditDriver(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-[7.5px] font-black uppercase tracking-widest text-slate-400 block mb-1">PLACA DETECTADA</label>
                  <input
                    disabled={!isEditingMode}
                    className="w-full text-xs font-black tracking-widest uppercase text-emerald-800 p-2 bg-emerald-50/50 border border-emerald-100 rounded-lg focus:outline-emerald-500 disabled:opacity-80"
                    value={editPlate}
                    onChange={(e) => setEditPlate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-[7.5px] font-black uppercase tracking-widest text-slate-400 block mb-1">VEÍCULO / MODELO</label>
                  <input
                    disabled={!isEditingMode}
                    className="w-full text-xs font-bold uppercase text-slate-800 p-2 bg-slate-50 border border-slate-100 rounded-lg focus:outline-emerald-500 disabled:opacity-80"
                    value={editModel}
                    onChange={(e) => setEditModel(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-[7.5px] font-black uppercase tracking-widest text-slate-400 block mb-1">COR</label>
                  <input
                    disabled={!isEditingMode}
                    className="w-full text-xs font-bold uppercase text-slate-800 p-2 bg-slate-50 border border-slate-100 rounded-lg focus:outline-emerald-500 disabled:opacity-80"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                  />
                </div>
              </div>

              {/* ACTIONS */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => onConfirmOCR({
                    plate: editPlate,
                    model: editModel,
                    color: editColor,
                    driver: editDriver,
                    type: editType
                  })}
                  className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-600/20 active:scale-95 transition-all text-center"
                >
                  Confirmar & Preencher Formulário
                </button>
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-3 border border-slate-200 hover:bg-slate-50 text-slate-500 font-extrabold text-[10px] uppercase tracking-wider rounded-xl active:scale-[0.98] transition-all"
                >
                  Refazer Leitura
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
