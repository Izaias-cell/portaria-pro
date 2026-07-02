import { PreAuthorization, FrequentVisitor } from '../types';

export function findPotentialMatches(preAuth: Partial<PreAuthorization>, frequents: FrequentVisitor[]): FrequentVisitor[] {
  if (!frequents.length) return [];

  const matches = frequents.map(f => {
    let score = 0;

    // 1. Match by Unit (Strong signal)
    if (f.unit.toLowerCase() === preAuth.unit?.toLowerCase()) {
      score += 40;
    }

    // 2. Match by Name (Fuzzy matching)
    const fName = f.name.toLowerCase();
    const pName = preAuth.name?.toLowerCase() || '';
    
    if (pName && pName !== 'visitante' && pName !== 'entregador' && pName !== 'prestador') {
      if (fName === pName) score += 60;
      else if (fName.includes(pName) || pName.includes(fName)) score += 30;
    }

    // 3. Match by Type
    if (f.type === preAuth.type) {
      score += 20;
    }

    // 4. Match by Relationship
    if (preAuth.relationship && f.relationship?.toLowerCase() === preAuth.relationship.toLowerCase()) {
      score += 25;
    }

    // 5. Match by Plate (Strength if provided)
    if (preAuth.plate && f.plate?.toLowerCase() === preAuth.plate.toLowerCase()) {
      score += 50;
    }

    return { visitor: f, score };
  });

  // Filter threshold and sort
  return matches
    .filter(m => m.score >= 50) // Threshold for "intelligent suggestion"
    .sort((a, b) => b.score - a.score)
    .map(m => m.visitor);
}
