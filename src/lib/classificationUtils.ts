import { AccessType, DeliverySubtype } from '../types';

const DELIVERY_KEYWORDS = [
  'entregador', 'motoboy', 'libera entrega', 'libera o motoboy', 'vai chegar entrega', 'vai chegar lanche',
  'ifood', 'mercado livre', 'amazon', 'shopee', 'entrega amazon', 'entrega ml', 'entrega ifood', 'pedido',
  'delivery', 'rappi', 'uber eats', 'encomenda', 'correios', 'sedex', 'pacote', 'transportadora'
];

const SERVICE_KEYWORDS = [
  'libera o pedreiro', 'libera o rapaz', 'libera o técnico', 'libera o tecnico',
  'manutenção', 'manutencao', 'prestador', 'serviço', 'servico', 'eletricista', 'encanador',
  'internet', 'técnico', 'tecnico', 'instalação', 'instalacao', 'pintor', 'montador', 'reparo',
  'faxina', 'limpeza', 'diarista', 'reforma', 'instalador'
];

const VISITOR_KEYWORDS = [
  'vai chegar meu irmão', 'vai chegar minha mãe', 'vai chegar meu pai', 'vai chegar meu amigo',
  'visita', 'visitante', 'familiar', 'parente', 'amigo', 'primo', 'tia', 'tio', 'namorada', 'namorado',
  'irma', 'irmao', 'mae', 'convidado', 'prima', 'avô', 'avó', 'esposo', 'esposa'
];

// Normalized keywords for diacritic-insensitive matching
const normalize = (str: string | undefined | null) => {
  if (!str) return '';
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

const DELIVERY_KEYWORDS_NORM = DELIVERY_KEYWORDS.map(normalize);
const SERVICE_KEYWORDS_NORM = SERVICE_KEYWORDS.map(normalize);
const VISITOR_KEYWORDS_NORM = VISITOR_KEYWORDS.map(normalize);

/**
 * Classifies the access type based on a given text using priority rules.
 * 1. ENTREGA
 * 2. PRESTADOR
 * 3. VISITANTE (Default)
 */
export function classifyAccessType(text: string): AccessType {
  const normText = normalize(text);

  if (DELIVERY_KEYWORDS_NORM.some(k => normText.includes(k))) {
    return 'delivery';
  }

  if (SERVICE_KEYWORDS_NORM.some(k => normText.includes(k))) {
    return 'service';
  }

  return 'visitor';
}

/**
 * Determines the delivery subtype based on keywords in the text.
 */
export function getDeliverySubtype(text: string): DeliverySubtype {
  const normText = normalize(text);

  if (normText.includes('ifood') || normText.includes('rappi') || normText.includes('delivery') || normText.includes('uber eats')) {
    return 'delivery';
  }
  
  if (normText.includes('motoboy')) {
    return 'motoboy';
  }
  
  if (normText.includes('correios') || normText.includes('encomenda') || normText.includes('pacote') || normText.includes('sedex') || normText.includes('mercado livre')) {
    return 'correios_encomenda';
  }
  
  if (normText.includes('transportadora')) {
    return 'transportadora';
  }

  return 'delivery'; // Default delivery subtype
}

/**
 * Utility to fix a record or pre-authorization type based on its name or observation.
 */
export function getCorrectedType<T extends { name: string; observation?: string; notes?: string; type: AccessType }>(item: T): { type: AccessType; deliverySubtype?: DeliverySubtype } {
  const searchText = `${item.name} ${item.observation || ''} ${item.notes || ''}`;
  const classifiedType = classifyAccessType(searchText);
  
  const result: { type: AccessType; deliverySubtype?: DeliverySubtype } = {
    type: classifiedType
  };

  if (classifiedType === 'delivery') {
    result.deliverySubtype = getDeliverySubtype(searchText);
  }

  return result;
}

/**
 * Validates if the content typed/pasted inside a form card matches other modality's keywords,
 * returning errors of cross-modality classification if an inconsistency is detected.
 */
export function verifyContentForCrossModality(name: string, notes: string, currentType: AccessType): { invalid: boolean; detectedType?: AccessType; message?: string } {
  const normText = normalize(`${name} ${notes}`);

  const deliveryMatched = DELIVERY_KEYWORDS_NORM.some(k => normText.includes(k));
  const serviceMatched = SERVICE_KEYWORDS_NORM.some(k => normText.includes(k));
  const visitorMatched = VISITOR_KEYWORDS_NORM.some(k => normText.includes(k));

  if (currentType !== 'delivery' && deliveryMatched) {
    return {
      invalid: true,
      detectedType: 'delivery',
      message: '⚠️ Este conteúdo corresponde à modalidade ENTREGA'
    };
  }

  if (currentType !== 'service' && serviceMatched) {
    return {
      invalid: true,
      detectedType: 'service',
      message: '⚠️ Este conteúdo corresponde à modalidade PRESTADOR DE SERVIÇOS'
    };
  }

  if (currentType !== 'visitor' && currentType !== 'uber' && visitorMatched && !deliveryMatched && !serviceMatched) {
    return {
      invalid: true,
      detectedType: 'visitor',
      message: '⚠️ Este conteúdo corresponde à modalidade VISITANTE'
    };
  }

  return { invalid: false };
}
