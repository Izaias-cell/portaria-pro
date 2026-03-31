export type AccessType = 'visitor' | 'delivery' | 'service';

export type DeliverySubtype = 'motoboy' | 'delivery' | 'transportadora' | 'correios_encomenda' | 'outro';

export type AccessRule = 'SEMPRE_LIBERADO' | 'AVISAR_ANTES';
export type PreAuthStatus = 'pendente' | 'autorizada' | 'pendente_confirmacao' | 'utilizada' | 'expirada';
export type WhatsAppTrustStatus = 'vinculada' | 'nao_vinculada';

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
  plate?: string;
  observation?: string;
  validity: Date;
  status: PreAuthStatus;
  isOutsideTimeLimit?: boolean;
  origin?: 'manual' | 'whatsapp';
  whatsappMetadata?: {
    originalMessage: string;
    phoneNumber: string;
    receivedAt: Date;
    trustStatus: WhatsAppTrustStatus;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface AccessRecord {
  id: string;
  type: AccessType;
  deliverySubtype?: DeliverySubtype;
  fastFlow?: boolean;
  name: string;
  document?: string;
  plate?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  destination: string;
  timestamp: Date; // data/hora da entrada
  status: 'em_andamento' | 'finalizado';
  exitTimestamp?: Date;
  notes?: string;
  origin?: 'visitante_frequente' | 'manual' | 'pre_autorizacao' | 'whatsapp';
  whatsappMetadata?: {
    originalMessage: string;
    phoneNumber: string;
    receivedAt: Date;
    trustStatus: WhatsAppTrustStatus;
  };
  ruleUsed?: AccessRule;
}

export interface Resident {
  id: string;
  name: string;
  unit: string;
  phone?: string;
}
