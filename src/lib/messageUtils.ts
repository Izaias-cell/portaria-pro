import { CondoInfo } from '../types';

interface ReplacementParams {
  residentName?: string;
  unit?: string;
  type?: string;
  visitorName?: string;
  providerName?: string;
  deliveryEntry?: string;
  condoName?: string;
  porterName?: string;
}

export function replaceMessageVariables(template: string, params: ReplacementParams): string {
  let message = template;
  
  const hour = new Date().getHours();
  let saudacao = "Bom dia";
  if (hour >= 12 && hour < 18) saudacao = "Boa tarde";
  else if (hour >= 18 || hour < 5) saudacao = "Boa noite";

  const replacements: Record<string, string> = {
    '{saudacao}': saudacao,
    '{nome_morador}': params.residentName || '',
    '{nomeMorador}': params.residentName || '',
    '{unidade}': params.unit || '',
    '{tipo}': params.type || '',
    '{nome_visitante}': params.visitorName || '',
    '{nome_prestador}': params.providerName || '',
    '{nome_entregador}': params.deliveryEntry || '',
    '{condominio}': params.condoName || '',
    '{porteiro}': params.porterName || ''
  };

  Object.entries(replacements).forEach(([key, value]) => {
    message = message.split(key).join(value);
  });

  return message;
}
