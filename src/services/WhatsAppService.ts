import { AccessType, DeliverySubtype, PreAuthorization, UnitPhone, WhatsAppTrustStatus, UnitRules, PreAuthStatus } from '../types';
import { endOfDay } from 'date-fns';

export interface WhatsAppMessage {
  text: string;
  sender: string;
  timestamp: Date;
}

export class WhatsAppService {
  static parseMessage(message: WhatsAppMessage, unitPhones: UnitPhone[], unitRules: UnitRules[]): Partial<PreAuthorization> {
    const text = message.text.toLowerCase();
    
    // 0. Check for Linked Phone
    const linkedPhone = unitPhones.find(up => 
      up.active && (
        up.primaryPhone.replace(/\D/g, '').includes(message.sender.replace(/\D/g, '')) || 
        (up.secondaryPhone && up.secondaryPhone.replace(/\D/g, '').includes(message.sender.replace(/\D/g, '')))
      )
    );

    const trustStatus: WhatsAppTrustStatus = linkedPhone ? 'vinculada' : 'nao_vinculada';

    // 1. Extract Unit (e.g., "casa 354", "apto 102", "unidade 88")
    let unit = 'N/A';
    if (linkedPhone) {
      unit = linkedPhone.unit;
    } else {
      const unitMatch = text.match(/(?:casa|apto|unidade|unid|c|a)\s*(\d+)/i);
      unit = unitMatch ? `Casa ${unitMatch[1]}` : 'N/A';
    }

    const rules = unitRules.find(r => r.unit === unit);

    // 2. Determine Type & Subtype
    let type: AccessType = 'visitor';
    let deliverySubtype: DeliverySubtype | undefined = undefined;

    const visitorKeywords = ['mãe', 'pai', 'irmão', 'irmã', 'primo', 'prima', 'amigo', 'amiga', 'parente', 'visita', 'convidado'];
    const deliveryKeywords = ['motoboy', 'ifood', 'rappi', 'entrega', 'entregador', 'delivery', 'encomenda', 'pacote', 'correios', 'transportadora'];
    const serviceKeywords = ['eletricista', 'técnico', 'prestador', 'manutenção', 'serviço', 'reforma', 'pintor', 'pedreiro', 'encanador', 'limpeza', 'faxina'];

    if (deliveryKeywords.some(k => text.includes(k))) {
      type = 'delivery';
      if (text.includes('motoboy') || text.includes('ifood') || text.includes('rappi')) {
        deliverySubtype = 'motoboy';
      } else if (text.includes('correios')) {
        deliverySubtype = 'correios_encomenda';
      } else if (text.includes('transportadora')) {
        deliverySubtype = 'transportadora';
      } else {
        deliverySubtype = 'delivery';
      }
    } else if (serviceKeywords.some(k => text.includes(k))) {
      type = 'service';
    } else if (visitorKeywords.some(k => text.includes(k))) {
      type = 'visitor';
    }

    // 3. Extract Name (Very basic heuristic: look for "liberar o/a [Nome]" or "chegar o/a [Nome]")
    let name = type === 'delivery' ? 'Entregador' : (type === 'service' ? 'Prestador' : 'Visitante');

    const nameMatch = text.match(/(?:liberar|chegar|vai|o|a|um|uma|com|para)\s+([a-zà-ÿ]+(?:\s+[a-zà-ÿ]+)?)/i);
    if (nameMatch) {
      const extractedName = nameMatch[1].trim();
      // Filter out common words that aren't names
      const commonWords = ['o', 'a', 'um', 'uma', 'entrega', 'motoboy', 'ifood', 'rappi', 'prestador', 'serviço', 'manutenção', 'técnico', 'hoje', 'amanhã', 'agora'];
      if (!commonWords.includes(extractedName)) {
        name = extractedName.charAt(0).toUpperCase() + extractedName.slice(1);
      }
    }

    // 4. Extract Time
    const timeMatch = text.match(/(\d{1,2})[:h](\d{0,2})/);
    let extractedTime: string | undefined = undefined;
    if (timeMatch) {
      const hours = timeMatch[1].padStart(2, '0');
      const minutes = (timeMatch[2] || '00').padEnd(2, '0');
      extractedTime = `${hours}:${minutes}`;
    }

    // 5. Apply Rules for Status
    let status: PreAuthStatus = 'autorizada';
    let isOutsideTimeLimit = false;

    if (rules) {
      if (!rules.allowAutoWhatsAppAuth) {
        status = 'pendente_confirmacao';
      } else if (type === 'visitor' && rules.requireVisitorConfirmation) {
        status = 'pendente_confirmacao';
      } else if (type === 'delivery' && rules.requireDeliveryConfirmation) {
        status = 'pendente_confirmacao';
      } else if (type === 'service' && rules.requireServiceConfirmation) {
        status = 'pendente_confirmacao';
      }

      // Check time limits
      if (extractedTime) {
        const limit = type === 'delivery' ? rules.deliveryTimeLimit : rules.visitorTimeLimit;
        if (limit) {
          const [limitH, limitM] = limit.split(':').map(Number);
          const [msgH, msgM] = extractedTime.split(':').map(Number);
          if (msgH > limitH || (msgH === limitH && msgM > limitM)) {
            isOutsideTimeLimit = true;
          }
        }
      }
    }

    // 6. Create Pre-Authorization Object
    return {
      id: crypto.randomUUID(),
      unit,
      type,
      deliverySubtype,
      name,
      observation: `WhatsApp: "${message.text}"${extractedTime ? ` (Horário: ${extractedTime})` : ''}${rules?.fixedObservation ? ` | Obs Unidade: ${rules.fixedObservation}` : ''}`,
      validity: endOfDay(new Date()), // Valid until end of day
      status,
      isOutsideTimeLimit,
      origin: 'whatsapp',
      whatsappMetadata: {
        originalMessage: message.text,
        phoneNumber: message.sender,
        receivedAt: message.timestamp,
        trustStatus,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  static getAutoResponse(preAuth: Partial<PreAuthorization>): string {
    const trustMsg = preAuth.whatsappMetadata?.trustStatus === 'vinculada' 
      ? '✅ Autorização vinculada à sua unidade registrada.' 
      : '⚠️ Número não vinculado, mas autorização registrada.';
    
    const statusMsg = preAuth.status === 'pendente_confirmacao'
      ? '⏳ Sua unidade exige confirmação manual para este tipo de acesso. O porteiro irá interfonar.'
      : '✅ Acesso liberado no sistema da portaria para hoje.';

    const timeMsg = preAuth.isOutsideTimeLimit 
      ? '\n⚠️ Atenção: O horário citado está fora do limite padrão da sua unidade.' 
      : '';
    
    return `${trustMsg}\n${statusMsg}${timeMsg}\n${preAuth.name} na ${preAuth.unit}.`;
  }
}
