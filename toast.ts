import { OCRResult } from '../types';
import { validateAndCorrectPlate } from '../lib/plateValidation';

export interface UberTemplate {
  id: string;
  name: string;
  plateRaw: string;
  plateCorrected: string;
  vehicleModel: string;
  vehicleColor: string;
  type: string;
  imageUrl: string;
  driverName: string;
}

export const UBER_TEMPLATES: UberTemplate[] = [
  {
    id: 'template_moto_azul',
    name: 'Uber Flash Moto - Azul',
    plateRaw: 'EVU-4I8O', // typical OCR reading error
    plateCorrected: 'EVU-4180',
    vehicleModel: 'HONDA NXR160 BROS ESDD',
    vehicleColor: 'AZUL',
    type: 'Entrega Moto',
    driverName: 'ADRIANO SILVA',
    imageUrl: 'https://images.unsplash.com/photo-1599819811279-d5ad9cccf838?w=100&q=80'
  },
  {
    id: 'template_kwid_bege',
    name: 'Uber Pop - Kwid Bege',
    plateRaw: 'IYS-8D06',
    plateCorrected: 'IYS-8D06',
    vehicleModel: 'RENAULT KWID ZEN 10MT',
    vehicleColor: 'BEGE',
    type: 'Uber',
    driverName: 'RICARDO BARBOSA',
    imageUrl: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=100&q=80'
  },
  {
    id: 'template_kwid_branco',
    name: 'Uber Pop - Kwid Branco',
    plateRaw: '1ZV-8G2O', // misspelled for correction
    plateCorrected: 'IZV-8G20',
    vehicleModel: 'RENAULT KWID',
    vehicleColor: 'BRANCO',
    type: 'Uber',
    driverName: 'MARCUS SOUZA',
    imageUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=100&q=80'
  },
  {
    id: 'template_moto_preta',
    name: 'Uber Flash Moto - Preta',
    plateRaw: 'MGK-9J64',
    plateCorrected: 'MGK-9J64',
    vehicleModel: 'HONDA CG 150 TITAN KS',
    vehicleColor: 'PRETO',
    type: 'Entrega Moto',
    driverName: 'LOEZER OLIVEIRA',
    imageUrl: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=100&q=80'
  }
];

class OCRQueueService {
  private static instance: OCRQueueService;
  private jobs: Map<string, OCRResult> = new Map();
  private maxRetries = 1;

  private constructor() {}

  public static getInstance(): OCRQueueService {
    if (!OCRQueueService.instance) {
      OCRQueueService.instance = new OCRQueueService();
    }
    return OCRQueueService.instance;
  }

  public createJob(jobId: string): OCRResult {
    const initialJob: OCRResult = {
      jobId,
      status: 'PROCESSANDO',
      placa: { valor: null, confianca: 0 },
      motorista: { nome: null, confianca: 0 },
      veiculo: { modelo_cor: null, confianca: 0 },
      retryCount: 0
    };
    this.jobs.set(jobId, initialJob);
    return initialJob;
  }

  public getJob(jobId: string): OCRResult | undefined {
    return this.jobs.get(jobId);
  }

  public async processJob(
    jobId: string, 
    fileOrTemplateId: File | string, 
    onComplete: (result: OCRResult) => void,
    onStepChange?: (step: 'loading' | 'cropping' | 'preprocessing' | 'reading' | 'identifying' | 'completed') => void
  ) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    try {
      // 1. Loading Image
      if (onStepChange) onStepChange('loading');
      await new Promise(resolve => setTimeout(resolve, 600));

      // 2. Zone OCR Cropping Animation
      if (onStepChange) onStepChange('cropping');
      await new Promise(resolve => setTimeout(resolve, 800));

      // 3. Image Prebuilding filters
      if (onStepChange) onStepChange('preprocessing');
      await new Promise(resolve => setTimeout(resolve, 700));

      // 4. Localized OCR reading
      if (onStepChange) onStepChange('reading');
      await new Promise(resolve => setTimeout(resolve, 800));

      // 5. Intelligent Correction & Parsing
      if (onStepChange) onStepChange('identifying');
      await new Promise(resolve => setTimeout(resolve, 500));

      // Execute OCR Extraction
      const result = await this.simulateOCR(jobId, fileOrTemplateId);
      
      // Update job state
      result.status = 'OK';
      this.jobs.set(jobId, result);

      if (onStepChange) onStepChange('completed');
      onComplete(result);
    } catch (error) {
      console.error(`[QUEUE] Error processing job ${jobId}:`, error);
      job.status = 'INVALIDO';
      onComplete(job);
    }
  }

  private async simulateOCR(jobId: string, fileOrTemplateId: File | string): Promise<OCRResult> {
    // 1. Identify which template to load
    let matchedTemplate = UBER_TEMPLATES[1]; // default: Kwid Bege

    if (typeof fileOrTemplateId === 'string') {
      const found = UBER_TEMPLATES.find(t => t.id === fileOrTemplateId);
      if (found) matchedTemplate = found;
    } else {
      // It's a real file upload. Check name or size to match template
      const nameLower = fileOrTemplateId.name.toLowerCase();
      if (nameLower.includes('evu') || nameLower.includes('moto') || nameLower.includes('azul') || fileOrTemplateId.size % 4 === 1) {
        matchedTemplate = UBER_TEMPLATES[0]; // Moto azul
      } else if (nameLower.includes('iys') || nameLower.includes('bege') || fileOrTemplateId.size % 4 === 2) {
        matchedTemplate = UBER_TEMPLATES[1]; // Kwid bege
      } else if (nameLower.includes('izv') || nameLower.includes('kwid') || nameLower.includes('branco') || fileOrTemplateId.size % 4 === 3) {
        matchedTemplate = UBER_TEMPLATES[2]; // Kwid branco
      } else if (nameLower.includes('mgk') || nameLower.includes('titan') || nameLower.includes('preto') || fileOrTemplateId.size % 4 === 0) {
        matchedTemplate = UBER_TEMPLATES[3]; // Moto preta
      }
    }

    // Run the intelligent validation/correction engine!
    const correction = validateAndCorrectPlate(matchedTemplate.plateRaw);

    return {
      jobId,
      retryCount: 0,
      status: 'OK',
      placa: { 
        valor: correction.corrected, // return the corrected version
        confianca: correction.confidence 
      },
      motorista: { 
        nome: matchedTemplate.driverName, 
        confianca: 0.95 
      },
      veiculo: { 
        modelo_cor: `${matchedTemplate.vehicleModel} ${matchedTemplate.vehicleColor}`, 
        confianca: 0.94 
      }
    };
  }
}

export const ocrQueue = OCRQueueService.getInstance();
