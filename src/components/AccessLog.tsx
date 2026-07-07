import React, { useState } from 'react';
import { AccessRecord } from '../types';
import { format } from 'date-fns';
import { User, Bike, Wrench, LogOut, Clock, MapPin, Car, Zap, Shield, ShieldAlert, Users, Calendar, Trash2, Package, CheckCircle2, History, Eye, Camera, X, FileText, Copy } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from '../lib/toast';
import { motion, AnimatePresence } from 'motion/react';

interface AccessLogProps {
  title: string;
  records: AccessRecord[];
  emptyMessage?: string;
  onDeleteRecord?: (id: string) => void;
  compact?: boolean;
}

export function AccessLog({ title, records, emptyMessage = "Nenhum registro encontrado.", onDeleteRecord, compact }: AccessLogProps) {
  const [selectedRecord, setSelectedRecord] = useState<AccessRecord | null>(null);
  const [showPhotoZoom, setShowPhotoZoom] = useState<boolean>(false);
  const [documentOnlyRecord, setDocumentOnlyRecord] = useState<AccessRecord | null>(null);
  const [hoveredRecordId, setHoveredRecordId] = useState<string | null>(null);

  const handleCopyDocument = (doc?: string) => {
    if (!doc) {
      toast.error('Nenhum documento para copiar.');
      return;
    }
    navigator.clipboard.writeText(doc);
    toast.success('Documento copiado com sucesso!');
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'visitor': return User;
      case 'delivery': return Bike;
      case 'service': return Wrench;
      case 'uber': return Car;
      default: return User;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'visitor': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      case 'delivery': return 'text-orange-600 bg-orange-50 border-orange-100';
      case 'service': return 'text-blue-600 bg-blue-50 border-blue-100';
      case 'uber': return 'text-[#133d47] bg-[#eefcfc] border-[#133d47]/20';
      default: return 'text-slate-600 bg-slate-50 border-slate-100';
    }
  };

  const getSubtypeLabel = (subtype?: string) => {
    if (!subtype) return null;
    switch (subtype) {
      case 'motoboy': return 'MOTO';
      case 'carro': return 'CARRO';
      case 'bicicleta': return 'BIKE';
      case 'transportadora': return 'VAN';
      case 'outro': return 'OUTRO';
      case 'delivery': return 'OUTRO';
      case 'a_pe': return 'A PÉ';
      default: return subtype.toUpperCase();
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

  const getStatusLabel = (status: string) => {
    if (status === 'finalizado' || status === 'utilizada') return 'FINALIZADA';
    if (status === 'não_liberada') return 'NÃO LIBERADA';
    return status.toUpperCase();
  };

  return (
    <div className={cn("p-4 space-y-4", !compact && "bg-slate-50/50 rounded-3xl")}>
      <div className="flex items-center justify-between px-1 mb-2">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <History className="w-4 h-4" />
          {title}
        </h3>
      </div>
      
      {records.length === 0 ? (
        <div className="p-8 text-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200 shadow-sm">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-20" />
          <p className="text-xs font-black uppercase tracking-widest">{emptyMessage}</p>
        </div>
      ) : (
        <div className="relative space-y-4">
          {/* Vertical Timeline Line */}
          {!compact && (
            <div className="absolute left-[23px] top-4 bottom-4 w-[2px] bg-slate-200 z-0" />
          )}

          {records.map((record, index) => {
            const Icon = getIcon(record.type);
            const isDenied = record.status === 'não_liberada';
            const isFrequent = record.origin === 'visitante_frequente' || record.origin === 'Frequente';
            const isPreAuth = record.origin === 'pre_autorizacao';

            return (
              <div
                key={record.id}
                onClick={() => {
                  setSelectedRecord(record);
                }}
                className={cn(
                  "relative z-10 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center transition-all cursor-pointer hover:shadow-lg hover:border-slate-300 active:scale-[0.99] select-none group",
                  compact ? "p-3 gap-3" : "p-4 gap-4",
                  isDenied && "border-red-100 bg-red-50/10"
                )}
              >
                {/* Timeline Dot (only on first item or specific points if wanted) */}
                {!compact && (
                  <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-4 border-white bg-blue-500 shadow-sm hidden sm:block" />
                )}

                <div className={cn(
                  "rounded-xl shrink-0 flex items-center justify-center border transition-all group-hover:scale-110", 
                  isDenied ? "text-red-600 bg-red-50 border-red-100" : getTypeColor(record.type),
                  compact ? "w-10 h-10" : "w-12 h-12"
                )}>
                  <Icon className={cn(compact ? "w-5 h-5" : "w-6 h-6")} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="relative inline-block">
                          <button
                            onMouseEnter={() => setHoveredRecordId(record.id)}
                            onMouseLeave={() => setHoveredRecordId(null)}
                            onClick={(e) => {
                              e.stopPropagation();
                              setDocumentOnlyRecord(record);
                            }}
                            className={cn(
                              "font-black text-blue-600 hover:text-blue-800 hover:underline cursor-pointer truncate uppercase tracking-tight text-left select-text",
                              compact ? "text-xs" : "text-sm"
                            )}
                            title="Clique para consultar documento"
                          >
                            {record.name}
                          </button>
                          <AnimatePresence>
                            {hoveredRecordId === record.id && (
                              <motion.div
                                initial={{ opacity: 0, y: 4, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 4, scale: 0.95 }}
                                transition={{ duration: 0.1 }}
                                className="absolute bottom-full left-0 mb-2.5 z-[250] pointer-events-none bg-slate-950 text-white px-3.5 py-2 rounded-xl text-[12px] sm:text-xs font-mono font-bold border-2 border-slate-700 shadow-2xl flex flex-col gap-0.5 whitespace-nowrap leading-normal"
                              >
                                <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-[0.2em]">DOCUMENTO (CONFIRA ABAIXO)</span>
                                <div className="flex items-center gap-1.5">
                                  <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                                  <span className="text-white text-xs sm:text-sm font-black tracking-[0.18em]" style={{ fontVariantNumeric: 'slashed-zero' }}>
                                    {record.document || record.cpf || record.rg || 'NÃO CONFIGURADO'}
                                  </span>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </span>
                        
                        {/* TRUST BADGES */}
                        {isFrequent && (
                          <div className="flex items-center gap-1 bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border border-blue-100">
                            <Users className="w-2.5 h-2.5" />
                            CONFIÁVEL
                          </div>
                        )}
                        {record.count && record.count > 3 && (
                          <div className="flex items-center gap-1 bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border border-amber-100">
                            <Clock className="w-2.5 h-2.5" />
                            FREQUENTE
                          </div>
                        )}
                        {record.fastFlow && (
                          <div className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border border-emerald-100">
                            RECORRENTE
                          </div>
                        )}
                        {record.printImage && (
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRecord(record);
                              setShowPhotoZoom(true);
                            }}
                            className="flex items-center gap-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border border-emerald-200 transition-colors cursor-pointer select-none"
                            title="Visualizar Print de Comprovação Anexado"
                          >
                            <Camera className="w-2.5 h-2.5 animate-pulse text-emerald-600" />
                            📷 VER PRINT
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-0.5 mt-0.5 leading-tight text-left">
                        <div className="flex items-center gap-2">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                             {getTypeLabel(record.type)}
                           </span>
                           <span className="w-1 h-1 rounded-full bg-slate-300" />
                           <span className="text-[10px] font-black text-slate-900">
                             UNIDADE {record.destination}
                           </span>
                        </div>
                        {record.morador_solicitante_nome && (
                          <div className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wide">
                            Solicitado por: <span className="text-blue-600 font-black">{record.morador_solicitante_nome}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className={cn(
                        "font-mono font-black bg-slate-100 px-2 py-0.5 rounded text-slate-600 border border-slate-200",
                        compact ? "text-[8px]" : "text-[9px]"
                      )}>
                        {format(record.timestamp, 'HH:mm')}
                      </span>
                      <div className={cn(
                        "text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest border",
                        isDenied ? "bg-red-50 text-red-600 border-red-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                      )}>
                        {getStatusLabel(record.status)}
                      </div>
                    </div>
                  </div>
                  
                  {(record.deliverySubtype || (record as any).company || record.plate || record.vehicleModel || (record.vehicleColor && record.vehicleColor !== 'COR') || isPreAuth || record.prismaNumber || (record.type === 'visitor' && (!record.plate || record.plate.trim() === '' || record.plate.toUpperCase() === '---' || (record as any).onFoot || record.deliverySubtype === 'a_pe' || (record.notes && record.notes.toLowerCase().includes('(a pé)'))))) && (
                    <div className="flex flex-wrap gap-2 mt-2">
                       {(record.type === 'visitor' && (!record.plate || record.plate.trim() === '' || record.plate.toUpperCase() === '---' || (record as any).onFoot || record.deliverySubtype === 'a_pe' || (record.notes && record.notes.toLowerCase().includes('(a pé)')))) && (
                         <div className="flex items-center gap-1.5 bg-amber-100/70 text-amber-800 px-2.5 py-1 rounded-lg border border-amber-200 text-[9px] font-black uppercase tracking-wider">
                           🚶 A PÉ (PEDESTRE)
                         </div>
                       )}
                       {record.deliverySubtype && record.deliverySubtype !== 'a_pe' && (
                        <div className="flex items-center gap-1.5 bg-slate-50 text-slate-600 px-2 py-1 rounded-lg border border-slate-100 text-[9px] font-bold uppercase">
                          <Package className="w-3 h-3 text-slate-400" />
                          {getSubtypeLabel(record.deliverySubtype)}
                        </div>
                      )}
                      {(record as any).company && (
                        <div className="flex items-center gap-1.5 bg-slate-50 text-slate-600 px-2 py-1 rounded-lg border border-slate-100 text-[9px] font-bold uppercase">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {record.company}
                        </div>
                      )}
                      {record.plate && (
                        <div className="flex items-center gap-1.5 bg-slate-50 text-slate-800 px-2 py-1 rounded-lg border border-slate-200 text-[10px] sm:text-xs font-sans leading-none">
                          <Car className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="text-[8px] text-slate-400 font-extrabold uppercase">PLACA:</span>
                          <span className="bg-white border-[1.5px] border-slate-400 text-slate-950 font-mono font-black tracking-widest px-2 py-0.5 rounded text-[11px] sm:text-xs shadow-xs" style={{ fontVariantNumeric: 'slashed-zero' }}>
                            {record.plate.toUpperCase()}
                          </span>
                        </div>
                      )}
                      {record.vehicleModel && (
                        <div className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-2 py-1 rounded-lg border border-slate-200 text-[9px] font-black uppercase tracking-tight">
                          VEÍCULO: {record.vehicleModel}
                        </div>
                      )}
                      {record.vehicleColor && record.vehicleColor !== 'COR' && (
                        <div className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-2 py-1 rounded-lg border border-slate-200 text-[9px] font-black uppercase tracking-tight">
                          COR: {record.vehicleColor}
                        </div>
                      )}
                      {record.prismaNumber && (() => {
                        const colSelected = (record.prismaColor || '').toLowerCase().trim();
                        return (
                          <div className={cn(
                            "flex flex-col items-center justify-center px-2 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wider shadow-xs leading-tight text-center min-w-[70px]",
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
                      {isPreAuth && (
                        <div className="flex items-center gap-1.5 bg-purple-50 text-purple-600 px-2 py-1 rounded-lg border border-purple-100 text-[9px] font-black uppercase">
                          <Zap className="w-3 h-3" />
                          AUTO-API
                        </div>
                      )}
                    </div>
                  )}

                  {!compact && onDeleteRecord && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Deseja excluir este registro operacional?')) {
                          onDeleteRecord(record.id);
                        }
                      }}
                      className="absolute bottom-2 right-2 p-1.5 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* AUDIT FOOTER */}
                  <div className="flex justify-end items-center mt-2.5 pt-1.5 border-t border-slate-100/70">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider pr-6">
                      LIBERADO POR: <span className="font-extrabold text-[#0f172a]">{record.porterName || 'CARLOS (PORTARIA)'}</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Small Document Quick Look Modal (CPF/RG only) */}
      <AnimatePresence>
        {documentOnlyRecord && (
          <div 
            className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md"
            onClick={() => setDocumentOnlyRecord(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full text-center space-y-4"
            >
              <div className="space-y-1">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest block">CPF/RG:</span>
                <span className="text-2xl font-mono font-black text-slate-950 block bg-slate-50 py-4 px-3 rounded-xl border-2 border-slate-200 tracking-[0.12em] uppercase shadow-inner" style={{ fontVariantNumeric: 'slashed-zero' }}>
                  {documentOnlyRecord.document || 'NÃO CONFIGURADO / INFORMADO'}
                </span>
              </div>
              
              {documentOnlyRecord.document && (
                <button
                  type="button"
                  onClick={() => handleCopyDocument(documentOnlyRecord.document)}
                  className="w-full py-2.5 bg-blue-50 text-blue-600 hover:bg-blue-100/80 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors flex items-center justify-center gap-1.5 border border-blue-200"
                >
                  <Copy className="w-4 h-4" />
                  📋 COPIAR DOCUMENTO
                </button>
              )}

              <button 
                onClick={() => setDocumentOnlyRecord(null)}
                className="w-full py-2.5 bg-slate-900 text-white hover:bg-slate-950 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors"
                id="close-doc-btn"
              >
                Fechar Consulta Rápida
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Details Consultation Backdrop Modal */}
      <AnimatePresence>
        {selectedRecord && (
          <div 
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-sm"
            onClick={() => setSelectedRecord(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-white rounded-[2rem] border border-slate-200 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
            >
              {/* Header */}
              <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center border",
                    selectedRecord.status === 'não_liberada' 
                      ? "text-red-600 bg-red-50 border-red-100" 
                      : getTypeColor(selectedRecord.type)
                  )}>
                    {React.createElement(getIcon(selectedRecord.type), { className: "w-5 h-5" })}
                  </div>
                  <div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">CONSULTA OPERACIONAL</h3>
                    <h4 className="font-sans font-black text-slate-900 uppercase tracking-tight text-base leading-tight">
                      {selectedRecord.name}
                    </h4>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedRecord(null)}
                  className="p-1.5 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Details */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white text-left">
                <div className="grid grid-cols-2 gap-4">
                  {/* Status Badge */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Status da Liberação</span>
                    <span className={cn(
                      "text-[10px] font-black px-2.5 py-2 rounded-xl text-center border uppercase tracking-wider block leading-tight",
                      selectedRecord.status === 'não_liberada'
                        ? "bg-red-50 text-red-600 border-red-100"
                        : "bg-emerald-50 text-emerald-600 border-emerald-100"
                    )}>
                      {getStatusLabel(selectedRecord.status)}
                    </span>
                  </div>

                  {/* Modalidade */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Modalidade</span>
                    <span className="text-xs font-bold text-slate-700 bg-slate-50 px-2.5 py-2 rounded-xl border border-slate-100 block uppercase tracking-tight leading-tight">
                      {getTypeLabel(selectedRecord.type)}
                      {selectedRecord.deliverySubtype && ` (${getSubtypeLabel(selectedRecord.deliverySubtype)})`}
                    </span>
                  </div>

                  {/* Destino / Unidade */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Unidade de Destino</span>
                    <span className="text-sm font-extrabold text-slate-900 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 block">
                      UNIDADE {selectedRecord.destination}
                    </span>
                  </div>

                  {/* Morador Solicitante */}
                  {selectedRecord.morador_solicitante_nome && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Morador Solicitante</span>
                      <span className="text-sm font-extrabold text-blue-800 bg-blue-50/50 px-3 py-2 rounded-xl border border-blue-100/30 block truncate">
                        {selectedRecord.morador_solicitante_nome}
                      </span>
                    </div>
                  )}

                  {/* Documento (CPF / RG) */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Documento (CPF / RG)</span>
                    <span className="text-sm font-bold text-blue-600 bg-blue-50/40 px-3 py-2 rounded-xl border border-blue-100/50 block font-mono">
                      {selectedRecord.document || 'NÃO INFORMADO'}
                    </span>
                  </div>

                  {/* Data / Hora */}
                  <div className="space-y-1 col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Data e Hora de Entrada</span>
                    <span className="text-xs font-bold text-slate-700 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 block flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {format(new Date(selectedRecord.timestamp), "dd/MM/yyyy 'às' HH:mm")}
                    </span>
                  </div>

                  {/* Porteiro Responsável */}
                  <div className="space-y-1 col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Responsável Portaria</span>
                    <span className="text-xs font-extrabold text-slate-800 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 block flex items-center gap-2 uppercase">
                      <Shield className="w-3.5 h-3.5 text-blue-500" />
                      {selectedRecord.porterName || 'CARLOS (PORTARIA)'}
                    </span>
                  </div>
                </div>

                {/* Veículo (if exists) */}
                {(selectedRecord.plate || selectedRecord.vehicleModel) ? (
                  <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-3">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 leading-none">
                      <Car className="w-4 h-4 text-slate-500" />
                      Dados do Veículo
                    </h5>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      {selectedRecord.plate && (
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 block uppercase">Placa</span>
                          <span className="font-mono font-black text-slate-950 bg-white px-3 py-2 rounded-lg border-2 border-slate-400 block mt-1 uppercase text-center tracking-[0.14em] text-sm max-w-[140px] shadow-sm" style={{ fontVariantNumeric: 'slashed-zero' }}>
                            {selectedRecord.plate.toUpperCase()}
                          </span>
                        </div>
                      )}
                      {selectedRecord.vehicleModel && (
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 block uppercase">Modelo / Cor</span>
                          <span className="font-bold text-slate-900 bg-white px-2.5 py-1.5 rounded-lg border border-slate-100 block mt-1 uppercase">
                            {selectedRecord.vehicleModel}
                            {selectedRecord.vehicleColor && <span className="opacity-40 font-normal"> ({selectedRecord.vehicleColor})</span>}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  (selectedRecord.type === 'visitor' || selectedRecord.type === 'service' || (selectedRecord as any).onFoot || selectedRecord.deliverySubtype === 'a_pe') && (
                    <div className="bg-amber-50/30 p-4 rounded-2xl border border-amber-200/60 space-y-2">
                      <h5 className="text-[10px] font-black text-amber-800 uppercase tracking-widest flex items-center gap-1.5 leading-none">
                        🚶 IDENTIFICAÇÃO PEDESTRE
                      </h5>
                      <span className="text-xs font-black text-amber-800 uppercase bg-amber-100 border border-amber-200 px-3 py-2 rounded-xl block w-fit">
                        ENTRADA A PÉ (SEM VEÍCULO REGISTRADO)
                      </span>
                    </div>
                  )
                )}

                {/* Observações / Notas */}
                {selectedRecord.notes && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Observações Relatadas</span>
                    <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-medium text-slate-600 italic leading-relaxed">
                      "{selectedRecord.notes}"
                    </div>
                  </div>
                )}

                {/* Print Comprovante Anexado */}
                {selectedRecord.printImage ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Camera className="w-4 h-4 text-emerald-500 animate-pulse" />
                        Print de Comprovação Anexado
                      </span>
                      <button 
                        onClick={() => setShowPhotoZoom(true)}
                        className="text-[9px] font-black text-blue-600 hover:text-blue-700 tracking-wider uppercase flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Ampliar Comprovante
                      </button>
                    </div>
                    <div 
                      onClick={() => setShowPhotoZoom(true)}
                      className="border border-slate-200 rounded-2xl overflow-hidden shadow-inner bg-slate-50 cursor-zoom-in group max-h-[160px] flex items-center justify-center transition-all hover:border-blue-400"
                    >
                      <img 
                        src={selectedRecord.printImage} 
                        alt="Print Anexado" 
                        className="max-w-full max-h-[160px] object-cover transition-transform group-hover:scale-105"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center gap-2 text-slate-400 select-none">
                    <Camera className="w-4 h-4 opacity-55" />
                    <span className="text-[10px] font-black uppercase tracking-widest leading-none">Sem imagens anexas</span>
                  </div>
                )}
              </div>

              {/* Tool Actions footer */}
              <div className="p-5 border-t border-slate-50 bg-slate-50/50 flex justify-center">
                <button 
                  onClick={() => setSelectedRecord(null)}
                  className="px-6 py-2.5 bg-slate-800 text-white hover:bg-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-md shadow-slate-100 cursor-pointer"
                >
                  Fechar Detalhes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Picture Zoom Modal inside history details */}
      <AnimatePresence>
        {showPhotoZoom && selectedRecord?.printImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/95 flex items-center justify-center p-4 md:p-10"
            onClick={() => setShowPhotoZoom(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 15 }}
              className="relative max-w-full max-h-full"
              onClick={(e) => e.stopPropagation()}
            >
              <img 
                src={selectedRecord.printImage} 
                alt="Zoom" 
                className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl border-4 border-white/10"
              />
              <button
                type="button"
                onClick={() => setShowPhotoZoom(false)}
                className="absolute top-4 right-4 bg-black/50 hover:bg-black/80 text-white rounded-full p-2.5 transition-colors shadow-lg cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
