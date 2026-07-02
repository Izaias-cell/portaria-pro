/**
 * Utility for intelligent Brazilian Plate validation and spelling correction.
 * Formats supported:
 * - Traditional (AAA-1111)
 * - Mercosul (AAA1D23)
 */

export interface PlateCorrectionResult {
  original: string;
  cleaned: string;
  corrected: string;
  format: 'TRADITIONAL' | 'MERCOSUL' | 'INVALID';
  isValid: boolean;
  confidence: number;
  changes: { position: number; from: string; to: string; reason: string }[];
}

// Letter/Number typical confusion mappings for OCR
const TO_LETTER_MAP: Record<string, string> = {
  '0': 'O', '1': 'I', '2': 'Z', '3': 'B', '4': 'A',
  '5': 'S', '6': 'G', '7': 'T', '8': 'B', '9': 'G'
};

const TO_NUMBER_MAP: Record<string, string> = {
  'O': '0', 'Q': '0', 'D': '0', 'I': '1', 'L': '1', 'J': '1',
  'Z': '2', 'E': '3', 'A': '4', 'S': '5', 'G': '6',
  'T': '7', 'B': '8', 'Y': '7'
};

/**
 * Normalizes and attempts intelligent probabilistic correction on a license plate string
 */
export function validateAndCorrectPlate(rawPlate: string): PlateCorrectionResult {
  // Strip non-alphanumeric and uppercase
  const cleaned = rawPlate.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  
  if (cleaned.length !== 7) {
    return {
      original: rawPlate,
      cleaned,
      corrected: rawPlate.toUpperCase(),
      format: 'INVALID',
      isValid: false,
      confidence: 0.2,
      changes: []
    };
  }

  // Calculate mismatch scores for Traditional (LLL-NNNN) and Mercosul (LLL-NLNN)
  // Traditional format: L L L N N N N
  let tradScore = 0;
  for (let i = 0; i < 7; i++) {
    const isLetter = /[A-Z]/.test(cleaned[i]);
    if (i < 3 && !isLetter) tradScore++;
    if (i >= 3 && isLetter) tradScore++;
  }

  // Mercosul format: L L L N L N N
  let mercScore = 0;
  for (let i = 0; i < 7; i++) {
    const isLetter = /[A-Z]/.test(cleaned[i]);
    if (i < 3 && !isLetter) mercScore++;
    if (i === 3 && isLetter) mercScore++;
    if (i === 4 && !isLetter) mercScore++;
    if (i >= 5 && isLetter) mercScore++;
  }

  // Select the closest matching format
  const format = tradScore <= mercScore ? 'TRADITIONAL' : 'MERCOSUL';
  const changes: { position: number; from: string; to: string; reason: string }[] = [];
  const correctedChars = cleaned.split('');

  // Expected character types per position
  // 'L' = Letter, 'N' = Number
  const template = format === 'TRADITIONAL' 
    ? ['L', 'L', 'L', 'N', 'N', 'N', 'N']
    : ['L', 'L', 'L', 'N', 'L', 'N', 'N'];

  for (let i = 0; i < 7; i++) {
    const char = cleaned[i];
    const expected = template[i];
    const isLetter = /[A-Z]/.test(char);
    
    if (expected === 'L' && !isLetter) {
      const corrected = TO_LETTER_MAP[char] || 'A';
      correctedChars[i] = corrected;
      changes.push({
        position: i + 1,
        from: char,
        to: corrected,
        reason: `Substituição de número por letra típica no padrão visual (posição ${i + 1})`
      });
    } else if (expected === 'N' && isLetter) {
      const corrected = TO_NUMBER_MAP[char] || '0';
      correctedChars[i] = corrected;
      changes.push({
        position: i + 1,
        from: char,
        to: corrected,
        reason: `Substituição de letra por número típica no padrão visual (posição ${i + 1})`
      });
    }
  }

  // Re-assemble corrected plate string with standard Brazilian hyphen for traditional
  const correctedStr = format === 'TRADITIONAL'
    ? `${correctedChars.slice(0, 3).join('')}-${correctedChars.slice(3).join('')}`
    : correctedChars.join('');

  // Confidence calculation
  const totalCorrected = changes.length;
  const baseConfidence = format === 'TRADITIONAL' ? (1 - tradScore / 7) : (1 - mercScore / 7);
  const confidence = Math.max(0.5, Math.min(1.0, baseConfidence + (totalCorrected > 0 ? 0.05 : 0.1)));

  return {
    original: rawPlate,
    cleaned,
    corrected: correctedStr,
    format,
    isValid: true,
    confidence,
    changes
  };
}
