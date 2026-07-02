import { AccessType, PreAuthorization, WpApiStatus } from '../types';

/**
 * Portaria Pro - API Invisible Architecture
 * 
 * This service is prepared for future bidirectional synchronization with external APIs
 * such as official WhatsApp Business API, AI Agents, or IoT Hardware.
 * 
 * Flow:
 * 1. Porter sends notification -> Callback registered
 * 2. External event (SMS/WhatsApp/App) -> API updates state via callback
 * 3. Frontend reflects state change automatically
 */
export class OperationalApiService {
  private static instance: OperationalApiService;
  private isConnected: boolean = false;

  private constructor() {
    this.isConnected = true;
  }

  public static getInstance(): OperationalApiService {
    if (!OperationalApiService.instance) {
      OperationalApiService.instance = new OperationalApiService();
    }
    return OperationalApiService.instance;
  }

  /**
   * Simulates sending a notification to the resident via external API
   */
  public async sendNotification(request: {
    id: string;
    unit: string;
    type: AccessType;
    residentPhone: string;
    message: string;
  }): Promise<{ success: boolean; callbackId: string }> {
    console.log(`[API] Sending notification to ${request.unit} via ${request.residentPhone}`);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return {
      success: true,
      callbackId: `cb_${request.id}_${Date.now()}`
    };
  }

  /**
   * Future method for real-time state synchronization
   * Could be used with WebSockets or Polling
   */
  public async checkUpdates(lastTimestamp: Date): Promise<Partial<PreAuthorization>[]> {
    // This is where we would fetch external authorizations
    return [];
  }

  /**
   * Reports a local finalization to the cloud
   */
  public async reportFinalization(accessId: string, status: string): Promise<void> {
    console.log(`[API] Reporting finalization for ${accessId} as ${status}`);
  }
}

export const operationalApi = OperationalApiService.getInstance();
