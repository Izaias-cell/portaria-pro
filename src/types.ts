export interface OCRResult {
  jobId: string;
  status: 'OK' | 'PARCIAL' | 'SEM_DADOS' | 'PROCESSANDO' | 'INVALIDO';
  motorista: {
    nome: string | null;
    confianca: number;
  };
  veiculo: {
    modelo_cor: string | null;
    confianca: number;
  };
  placa: {
    valor: string | null;
    confianca: number;
  };
  retryCount?: number;
}

export type AccessType = 'visitor' | 'delivery' | 'service' | 'uber';

export type DeliverySubtype = 'motoboy' | 'delivery' | 'carro' | 'bicicleta' | 'a_pe' | 'transportadora' | 'correios_encomenda' | 'outro';

export type AccessRule = 'SEMPRE_LIBERADO' | 'AVISAR_ANTES';
export type PreAuthStatus = 'pendente' | 'autorizada' | 'pendente_confirmacao' | 'finalizada' | 'expirada';
export type WhatsAppTrustStatus = 'vinculada' | 'nao_vinculada';
export type WhatsappMode = 'manual' | 'api';

export type WpApiStatus = 
  | 'AGUARDANDO_LIBERACAO' 
  | 'ENVIADO_AO_MORADOR' 
  | 'RESPOSTA_RECEBIDA' 
  | 'AUTORIZADO' 
  | 'NAO_AUTORIZADO' 
  | 'FINALIZADA' 
  | 'CANCELADA' 
  | 'FALHA_NO_ENVIO';

export type UserRole = 'porteiro' | 'sindico' | 'admin';

export interface UnitRules {
  unit: string;
  allowAutoWhatsAppAuth: boolean;
  requireVisitorConfirmation: boolean;
  requireDeliveryConfirmation: boolean;
  requireServiceConfirmation: boolean;
  allowFrequentAlwaysReleased: boolean;
  fixedObservation?: string;
  deliveryTimeLimit?: string; // e.g. "22:00"
  visitorTimeLimit?: string;  // e.g. "23:00"
  updatedAt: Date;
}

export interface UnitPhone {
  id: string;
  unit: string;
  residentName: string;
  primaryPhone: string;
  secondaryPhone?: string;
  active: boolean;
  isPrimary?: boolean;
  releaseCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface FrequentVisitor {
  id: string;
  unit: string;
  name: string;
  relationship?: string;
  type: AccessType;
  deliverySubtype?: DeliverySubtype;
  plate?: string;
  additionalPlates?: string[];
  observation?: string;
  rule: AccessRule;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PreAuthorization {
  id: string;
  unit: string;
  type: AccessType;
  deliverySubtype?: DeliverySubtype;
  name: string;
  document?: string;
  plate?: string;
  relationship?: string;
  observation?: string;
  validity: Date;
  isManualValidity?: boolean;
  status: PreAuthStatus;
  isOutsideTimeLimit?: boolean;
  processedByPorter?: boolean;
  origin?: 'manual' | 'whatsapp' | 'porter_entry';
  suggestedMatches?: FrequentVisitor[];
  whatsappMetadata?: {
    originalMessage: string;
    phoneNumber: string;
    receivedAt: Date;
    trustStatus: WhatsAppTrustStatus;
    apiStatus?: WpApiStatus;
    residentId?: string;
    residentName?: string;
    sentMessage?: string;
    receivedResponse?: string;
    interpretedResponse?: string;
    respondedAt?: Date;
    finalizedAt?: Date;
  };
  company?: string;
  vehicleModel?: string;
  uberArrivalMinutes?: number;
  ocrProcessed?: boolean;
  draft?: any;
  printImage?: string;
  awaitingRelease?: boolean;
  prismaId?: string;
  prismaNumber?: string;
  prismaColor?: string;
  avisarMorador?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AccessRecord {
  id: string;
  type: AccessType;
  deliverySubtype?: DeliverySubtype;
  fastFlow?: boolean;
  count?: number;
  name: string;
  document?: string;
  plate?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  relationship?: string;
  destination: string;
  timestamp: Date; // data/hora da entrada
  exitTimestamp?: Date; // data/hora da saída
  status: 'em_andamento' | 'finalizado' | 'não_liberada' | 'Liberado Sempre';
  notes?: string;
  origin?: 'visitante_frequente' | 'manual' | 'pre_autorizacao' | 'whatsapp' | 'Frequente' | 'print_uber';
  whatsappMetadata?: {
    originalMessage: string;
    phoneNumber: string;
    receivedAt: Date;
    trustStatus: WhatsAppTrustStatus;
    apiStatus?: WpApiStatus;
    residentId?: string;
    residentName?: string;
    sentMessage?: string;
    receivedResponse?: string;
    interpretedResponse?: string;
    respondedAt?: Date;
    finalizedAt?: Date;
  };
  ruleUsed?: AccessRule;
  preAuthId?: string;
  company?: string;
  uberArrivalMinutes?: number;
  printImage?: string;
  porterName?: string;
  cpf?: string;
  rg?: string;
  phone?: string;
  prismaId?: string;
  prismaNumber?: string;
  prismaColor?: string;
  morador_solicitante_id?: string;
  morador_solicitante_nome?: string;
}

export interface Prisma {
  id: string;
  number: string;
  color: string; // "Amarelo", "Vermelho", "Azul", "Verde", "Preto", "Branco"
  status: 'disponivel' | 'em_uso';
  currentUnit?: string;
  currentRecordId?: string;
}

export interface Resident {
  id: string;
  name: string;
  unit: string;
  phone?: string;
}

export interface CondoInfo {
  name: string;
  managerName: string;
  address: string;
}

export interface AdminUser {
  id: string;
  name: string;
  contact: string;
  type: 'porteiro' | 'sindico' | 'admin';
  active: boolean;
}

export interface SystemSettings {
  allowFrequentDirectRelease: boolean;
  allowAutoDeliveryRelease: boolean;
  requireVisitorConfirmationByDefault: boolean;
  requireDocumentMandatory: boolean;
  timelineCleanupHours?: number; // 6, 12, 24, etc.
  porterPermissions: {
    canRegisterEntry: boolean;
    canEditResidents: boolean;
    canRegisterDeliveries: boolean;
  };
  whatsappMode: WhatsappMode;
  managerPermissions: {
    canViewHistory: boolean;
    canViewResidents: boolean;
    canExportData: boolean;
  };
}

export interface MessageTemplates {
  deliveryAuth: string;
  visitorArrival: string;
  serviceArrival: string;
  deliveryNotLiberated: string;
  authConfirmation: string;
  thanksClosure: string;
}

export interface MemorizedPerson {
  id: string;
  name: string;
  document?: string;
  plate?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  lastUnit: string;
  lastTimestamp: Date;
  lastType: AccessType;
  lastDeliverySubtype?: DeliverySubtype;
  lastCompany?: string;
  count: number;
  allPlates?: string[];
  phone?: string;
  cpf?: string;
  rg?: string;
  relationship?: string;
}

export interface PermanentProfile {
  id: string;
  name: string;
  cpf?: string;
  rg?: string;
  phone?: string;
  plate?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  type: AccessType;
  deliverySubtype?: DeliverySubtype;
  relationship?: string; // exclusive for visitors (parentesco)
  unit?: string;         // exclusive for visitors (casa)
  company?: string;
  count: number;         // visit count
  createdAt: string;
  updatedAt: string;
  platesHistory?: string[];
  notes?: string;
  trust?: number;
  status?: 'active' | 'blocked';
  blockReason?: string;
}

export interface Porteiro {
  id: string;
  name: string;
  pin: string;
  role: string;
  active: boolean;
  condoName: string;
  notes?: string;
  phone?: string;
  email?: string;
  condominio_id?: string;
}

export interface Condominio {
  id: string;
  nome: string;
}



