import { WpApiStatus } from "../types";

/**
 * Mock Service for Future WhatsApp API Integration
 * 
 * This service is prepared for future providers like Z-API, Evolution API, Meta Cloud API, etc.
 * For now, it stays in mock mode, but the structure is ready.
 */

export interface WhatsAppPayload {
  to: string;
  message: string;
  metadata?: any;
}

export const sendWhatsAppMessage = async (payload: WhatsAppPayload): Promise<{ success: boolean; messageId: string }> => {
  console.log('Mock WhatsApp API: Sending message to', payload.to, ':', payload.message);
  // Simulating API latency
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: true, messageId: `msg_${Date.now()}` });
    }, 1000);
  });
};

export const interpretResidentResponse = (text: string): 'AUTORIZADO' | 'NAO_AUTORIZADO' | 'UNKNOWN' => {
  const normalized = text.toLowerCase().trim();
  
  // Specific requested positive keywords
  const positiveKeywords = ['sim', 'pode liberar', 'ok', 'autorizado', 'libera', 'pode deixar entrar', '👍'];
  // Specific requested negative keywords
  const negativeKeywords = ['não', 'nao', 'não autorizo', 'nao autorizo', 'não conheço', 'nao conheço', 'não pode liberar', 'cancela', 'não vai vir'];

  if (positiveKeywords.some(kw => normalized.includes(kw))) {
    return 'AUTORIZADO';
  }

  if (negativeKeywords.some(kw => normalized.includes(kw))) {
    return 'NAO_AUTORIZADO';
  }

  return 'UNKNOWN';
};

/**
 * Simulates receiving a WhatsApp message (webhooks)
 */
export const receiveWhatsAppMessage = async (from: string, text: string) => {
  console.log('Mock WhatsApp API: Received message from', from, ':', text);
  const interpretation = interpretResidentResponse(text);
  return {
    from,
    text,
    interpretation,
    timestamp: new Date()
  };
};

export const updateActionFromResidentResponse = (actionId: string, response: string, interpretation: any) => {
  console.log(`Mock Update: Action ${actionId} received response "${response}" interpreted as ${interpretation}`);
  // In a real app, this would update the database/state
};

export const markActionAuthorized = (actionId: string) => {
  console.log(`Mock Update: Action ${actionId} marked as AUTHORIZED`);
};

export const markActionDenied = (actionId: string) => {
  console.log(`Mock Update: Action ${actionId} marked as DENIED`);
};
