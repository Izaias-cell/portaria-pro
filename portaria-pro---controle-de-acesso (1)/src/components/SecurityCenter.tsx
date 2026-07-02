import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  Smartphone, 
  Unlock, 
  Lock, 
  Globe, 
  Clock, 
  AlertTriangle, 
  Plus, 
  Check, 
  X, 
  Trash2, 
  RefreshCw, 
  Monitor, 
  MapPin, 
  Sparkles, 
  Activity, 
  LogOut,
  ChevronRight,
  Wifi,
  Settings,
  Mail,
  Bell
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { toast } from '../lib/toast';

// Interfaces and Types
export interface SecurityDevice {
  id: string;
  user: string;
  role: 'porteiro' | 'sindico' | 'admin';
  status: 'authorized' | 'pending' | 'blocked' | 'blocked_foreign';
  model: string;
  manufacturer: string;
  os: string;
  deviceId: string;
  ip: string;
  city: string;
  country: string;
  timestamp: string;
  authorizedAt?: string;
  lastAccess?: string;
  isPrimary?: boolean;
  isTemporary?: boolean;
}

export interface SecurityLog {
  id: string;
  user: string;
  device: string;
  deviceId: string;
  ip: string;
  city: string;
  country: string;
  timestamp: string;
  status: 'Permitido' | 'Pendente' | 'Bloqueado' | 'BLOQUEADO AUTOMATICAMENTE';
  type: 'login_attempt' | 'session_activity' | 'emergency';
}

export interface SecurityAlert {
  id: string;
  type: 'new_device' | 'international_login' | 'emergency';
  title: string;
  message: string;
  user: string;
  model: string;
  os: string;
  deviceId: string;
  city: string;
  ip: string;
  timestamp: string;
  status: 'active' | 'dismissed';
}

interface SecurityCenterProps {
  onRegisterOperationalLog: (action: string) => void;
  userRole: 'porteiro' | 'sindico' | 'admin';
}

export function SecurityCenter({ onRegisterOperationalLog, userRole }: SecurityCenterProps) {
  // Tabs for the security center
  const [activeTab, setActiveTab] = useState<'summary' | 'authorized' | 'pending' | 'attempts' | 'logs' | 'sessions' | 'security_settings'>('summary');
  const [devices, setDevices] = useState<SecurityDevice[]>([]);
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<string>('');

  // Security settings state loaded from localStorage
  const [securitySettings, setSecuritySettings] = useState(() => {
    const saved = localStorage.getItem('portaria_admin_security_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      receivePush: true,
      receiveEmail: true,
      receiveCriticalAlerts: true,
      primaryEmail: "admin.master@portariapro.com.br",
      secondaryEmail: "gestao@portariapro.com.br",
      adminWhatsapp: "(41) 99999-8888",
      internationalBlock: true,
      allowedCountries: ["Brasil"],
      maxSimultaneousSessions: 3,
      maxInactivityTime: 15,
      criticalAlertMode: true,
    };
  });

  // Form input states
  const [formReceivePush, setFormReceivePush] = useState(securitySettings.receivePush);
  const [formReceiveEmail, setFormReceiveEmail] = useState(securitySettings.receiveEmail);
  const [formReceiveCriticalAlerts, setFormReceiveCriticalAlerts] = useState(securitySettings.receiveCriticalAlerts);

  const [formPrimaryEmail, setFormPrimaryEmail] = useState(securitySettings.primaryEmail);
  const [formSecondaryEmail, setFormSecondaryEmail] = useState(securitySettings.secondaryEmail);
  const [formAdminWhatsapp, setFormAdminWhatsapp] = useState(securitySettings.adminWhatsapp);

  const [formInternationalBlock, setFormInternationalBlock] = useState(securitySettings.internationalBlock);
  const [formNewCountry, setFormNewCountry] = useState('');
  const [formAllowedCountries, setFormAllowedCountries] = useState<string[]>(securitySettings.allowedCountries || ["Brasil"]);

  const [formMaxSessions, setFormMaxSessions] = useState(securitySettings.maxSimultaneousSessions);
  const [formInactivityTime, setFormInactivityTime] = useState(securitySettings.maxInactivityTime);

  const [formCriticalAlertMode, setFormCriticalAlertMode] = useState(securitySettings.criticalAlertMode);

  // Sync state if settings are loaded/refreshed
  useEffect(() => {
    setFormReceivePush(securitySettings.receivePush);
    setFormReceiveEmail(securitySettings.receiveEmail);
    setFormReceiveCriticalAlerts(securitySettings.receiveCriticalAlerts);
    setFormPrimaryEmail(securitySettings.primaryEmail);
    setFormSecondaryEmail(securitySettings.secondaryEmail || '');
    setFormAdminWhatsapp(securitySettings.adminWhatsapp || '');
    setFormInternationalBlock(securitySettings.internationalBlock);
    setFormAllowedCountries(securitySettings.allowedCountries || ["Brasil"]);
    setFormMaxSessions(securitySettings.maxSimultaneousSessions);
    setFormInactivityTime(securitySettings.maxInactivityTime);
    setFormCriticalAlertMode(securitySettings.criticalAlertMode);
  }, [securitySettings]);

  // Count metrics for quick filters
  const [simulationMode, setSimulationMode] = useState<boolean>(false);

  // Load and initialize security data from localStorage
  useEffect(() => {
    // 1. Initialize Current Device ID
    let deviceId = localStorage.getItem('portaria_current_device_id');
    if (!deviceId) {
      deviceId = 'DEV-' + Math.random().toString(36).substring(2, 10).toUpperCase();
      localStorage.setItem('portaria_current_device_id', deviceId);
    }
    setCurrentDeviceId(deviceId);

    // 2. Initialize Devices List
    const storedDevices = localStorage.getItem('portaria_security_devices');
    let initializedDevices: SecurityDevice[] = [];

    if (storedDevices) {
      try {
        initializedDevices = JSON.parse(storedDevices);
      } catch (e) {
        initializedDevices = [];
      }
    }

    // If list is empty, initialize with default values including the first main trusted admin device
    if (initializedDevices.length === 0) {
      const primaryDevice: SecurityDevice = {
        id: 'dev-master-primary',
        user: 'Admin Master',
        role: 'admin',
        status: 'authorized',
        model: 'iPhone 15 Pro Max',
        manufacturer: 'Apple',
        os: 'iOS 17.5',
        deviceId: deviceId, // Bind current session device ID as primary master!
        ip: '189.125.43.210',
        city: 'Curitiba/PR',
        country: 'Brasil',
        timestamp: new Date().toISOString(),
        authorizedAt: new Date().toISOString(),
        lastAccess: new Date().toISOString(),
        isPrimary: true
      };

      const porteiroDevice: SecurityDevice = {
        id: 'dev-porteiro-carlos',
        user: 'Porteiro Carlos',
        role: 'porteiro',
        status: 'authorized',
        model: 'Moto G34',
        manufacturer: 'Motorola',
        os: 'Android 13',
        deviceId: 'MOTO-G34-CARLOS-FP',
        ip: '189.125.43.212',
        city: 'Curitiba/PR',
        country: 'Brasil',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        authorizedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        lastAccess: new Date(Date.now() - 2 * 60 * 1000).toISOString()
      };

      const pendingAdminSec: SecurityDevice = {
        id: 'dev-sec-admin-pending',
        user: 'Admin Master (Simulado Secundário)',
        role: 'admin',
        status: 'pending',
        model: 'Galaxy S24 Ultra',
        manufacturer: 'Samsung',
        os: 'Android 14',
        deviceId: 'SAMS-S24U-ADMIN-SEC',
        ip: '177.45.19.88',
        city: 'São Paulo/SP',
        country: 'Brasil',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString()
      };

      initializedDevices = [primaryDevice, porteiroDevice, pendingAdminSec];
      localStorage.setItem('portaria_security_devices', JSON.stringify(initializedDevices));
    } else {
      // Ensure the master primary device's DeviceId matches the current browser session device if none exists
      const hasSessionBinding = initializedDevices.some(d => d.deviceId === deviceId);
      if (!hasSessionBinding) {
        // Look for primary device and bind it, or make an authorized item
        const primary = initializedDevices.find(d => d.isPrimary);
        if (primary) {
          primary.deviceId = deviceId;
          localStorage.setItem('portaria_security_devices', JSON.stringify(initializedDevices));
        }
      }
    }
    setDevices(initializedDevices);

    // 3. Initialize Security Logs
    const storedLogs = localStorage.getItem('portaria_security_logs');
    let initializedLogs: SecurityLog[] = [];
    if (storedLogs) {
      try {
        initializedLogs = JSON.parse(storedLogs);
      } catch (e) {
        initializedLogs = [];
      }
    }

    if (initializedLogs.length === 0) {
      initializedLogs = [
        {
          id: 'log-1',
          user: 'Admin Master',
          device: 'iPhone 15 Pro Max',
          deviceId: deviceId,
          ip: '189.125.43.210',
          city: 'Curitiba/PR',
          country: 'Brasil',
          timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
          status: 'Permitido',
          type: 'session_activity'
        },
        {
          id: 'log-2',
          user: 'Porteiro Carlos',
          device: 'Moto G34',
          deviceId: 'MOTO-G34-CARLOS-FP',
          ip: '189.125.43.212',
          city: 'Curitiba/PR',
          country: 'Brasil',
          timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          status: 'Permitido',
          type: 'session_activity'
        },
        {
          id: 'log-3',
          user: 'Admin Master (Tentativa Block)',
          device: 'Galaxy S24 Ultra',
          deviceId: 'SAMS-S24U-ADMIN-SEC',
          ip: '177.45.19.88',
          city: 'São Paulo/SP',
          country: 'Brasil',
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          status: 'Pendente',
          type: 'login_attempt'
        },
        {
          id: 'log-4',
          user: 'Invasor Desconhecido',
          device: 'Xiaomi Mi 11',
          deviceId: 'XIAO-MI11-INCIDENTE',
          ip: '45.109.22.41',
          city: 'Madrid/ES',
          country: 'Espanha',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          status: 'BLOQUEADO AUTOMATICAMENTE',
          type: 'login_attempt'
        }
      ];
      localStorage.setItem('portaria_security_logs', JSON.stringify(initializedLogs));
    }
    setSecurityLogs(initializedLogs);

    // 4. Initialize Security Alerts
    const storedAlerts = localStorage.getItem('portaria_security_alerts');
    let initializedAlerts: SecurityAlert[] = [];
    if (storedAlerts) {
      try {
        initializedAlerts = JSON.parse(storedAlerts);
      } catch (e) {
        initializedAlerts = [];
      }
    }

    if (initializedAlerts.length === 0) {
      initializedAlerts = [
        {
          id: 'alert-1',
          type: 'new_device',
          title: 'Novo Dispositivo Detectado',
          message: 'Aguardando autorização do ADMIN MASTER.',
          user: 'Admin Master',
          model: 'Galaxy S24 Ultra',
          os: 'Android 14',
          deviceId: 'SAMS-S24U-ADMIN-SEC',
          city: 'São Paulo/SP',
          ip: '177.45.19.88',
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          status: 'active'
        },
        {
          id: 'alert-2',
          type: 'international_login',
          title: 'Bloqueio Internacional de Acesso',
          message: 'Acesso bloqueado automaticamente por tentativa oriunda de fora do Brasil (Espanha).',
          user: 'Invasor Desconhecido',
          model: 'Xiaomi Mi 11',
          os: 'Android 12',
          deviceId: 'XIAO-MI11-INCIDENTE',
          city: 'Madrid/ES',
          ip: '45.109.22.41',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          status: 'active'
        }
      ];
      localStorage.setItem('portaria_security_alerts', JSON.stringify(initializedAlerts));
    }
    setAlerts(initializedAlerts);

    // Sync active session status
    localStorage.setItem('portaria_current_device_status', 'authorized');
  }, []);

  // Utility to update files and states safely
  const updateStoreDevices = (updated: SecurityDevice[]) => {
    setDevices(updated);
    localStorage.setItem('portaria_security_devices', JSON.stringify(updated));
  };

  const updateStoreLogs = (updated: SecurityLog[]) => {
    setSecurityLogs(updated);
    localStorage.setItem('portaria_security_logs', JSON.stringify(updated));
  };

  const updateStoreAlerts = (updated: SecurityAlert[]) => {
    setAlerts(updated);
    localStorage.setItem('portaria_security_alerts', JSON.stringify(updated));
  };

  // ACTIONS
  const handleAuthorize = (device: SecurityDevice, temporary: boolean = false) => {
    const updated = devices.map(d => {
      if (d.id === device.id) {
        return {
          ...d,
          status: 'authorized' as const,
          authorizedAt: new Date().toISOString(),
          lastAccess: new Date().toISOString(),
          isTemporary: temporary
        };
      }
      return d;
    });
    updateStoreDevices(updated);

    // If it's authorized, clear its associated alerts
    const updatedAlerts = alerts.filter(a => a.deviceId !== device.deviceId);
    updateStoreAlerts(updatedAlerts);

    // Add Security Log
    const newLog: SecurityLog = {
      id: 'log-' + Math.random().toString(36).substring(2, 10),
      user: device.user,
      device: device.model,
      deviceId: device.deviceId,
      ip: device.ip,
      city: device.city,
      country: device.country,
      timestamp: new Date().toISOString(),
      status: 'Permitido',
      type: 'session_activity'
    };
    updateStoreLogs([newLog, ...securityLogs]);

    toast.success(
      temporary
        ? `DISPOSITIVO AUTORIZADO TEMPORARIAMENTE`
        : `DISPOSITIVO AUTORIZADO PERMANENTEMENTE`,
      {
        description: `${device.model} (${device.user}) está agora autorizado a acessar.`
      }
    );
    onRegisterOperationalLog(`DISPOSITIVO AUTORIZADO PELO ADMIN MASTER: ${device.model} - ${device.user}`);
  };

  const handleRevokeAuthorization = (device: SecurityDevice) => {
    const updated = devices.map(d => {
      if (d.id === device.id) {
        return {
          ...d,
          status: 'pending' as const,
          authorizedAt: undefined,
          isTemporary: false
        };
      }
      return d;
    });
    updateStoreDevices(updated);

    // Register Log
    const newLog: SecurityLog = {
      id: 'log-' + Math.random().toString(36).substring(2, 10),
      user: device.user,
      device: device.model,
      deviceId: device.deviceId,
      ip: device.ip,
      city: device.city,
      country: device.country,
      timestamp: new Date().toISOString(),
      status: 'Pendente',
      type: 'login_attempt'
    };
    updateStoreLogs([newLog, ...securityLogs]);

    toast.info(`AUTORIZAÇÃO REVOGADA`, {
      description: `${device.model} de ${device.user} retornou para o status de pendente.`
    });
    onRegisterOperationalLog(`REVOGADO ACESSO DO DISPOSITIVO: ${device.model} - ${device.user}`);
  };

  const handleBlockDevice = (device: SecurityDevice) => {
    const updated = devices.map(d => {
      if (d.id === device.id) {
        return {
          ...d,
          status: 'blocked' as const
        };
      }
      return d;
    });
    updateStoreDevices(updated);

    // If we blocked the current session device ID, let's update current device status to blocked in localStorage!
    if (device.deviceId === currentDeviceId) {
      localStorage.setItem('portaria_current_device_status', 'blocked');
      // For immediate effect
      window.dispatchEvent(new Event('storage_device_changed'));
    }

    // Register Log
    const newLog: SecurityLog = {
      id: 'log-' + Math.random().toString(36).substring(2, 10),
      user: device.user,
      device: device.model,
      deviceId: device.deviceId,
      ip: device.ip,
      city: device.city,
      country: device.country,
      timestamp: new Date().toISOString(),
      status: 'Bloqueado',
      type: 'login_attempt'
    };
    updateStoreLogs([newLog, ...securityLogs]);

    toast.error(`DISPOSITIVO BLOQUEADO`, {
      description: `${device.model} (${device.user}) foi colocado na lista negra do sistema.`
    });
    onRegisterOperationalLog(`DISPOSITIVO BLOQUEADO DO SISTEMA: ${device.model} - ${device.user}`);
  };

  const handleManualDeleteDevice = (id: string) => {
    const dToRemove = devices.find(x => x.id === id);
    if (!dToRemove) return;
    
    if (dToRemove.isPrimary) {
      toast.error('DISPOSITIVO CONFIÁVEL PRINCIPAL', {
        description: 'Não é possível remover o seu próprio dispositivo confiável principal.'
      });
      return;
    }

    const updated = devices.filter(d => d.id !== id);
    updateStoreDevices(updated);
    toast.success('Dispositivo deletado com sucesso.');
  };

  const handleDismissAlert = (alertId: string) => {
    const updated = alerts.map(a => {
      if (a.id === alertId) {
        return { ...a, status: 'dismissed' as const };
      }
      return a;
    });
    updateStoreAlerts(updated);

    toast.info('Alerta arquivado.');
  };

  // SIMULATIONS ENGINE
  const triggerSimulatedNewDevice = () => {
    const randId = Math.random().toString(36).substring(2, 6).toUpperCase();
    const newPend: SecurityDevice = {
      id: 'dev-' + Math.random().toString(36).substring(2, 10),
      user: 'Síndico Auxiliar (Simulado)',
      role: 'sindico',
      status: 'pending',
      model: 'Redmi Note 13',
      manufacturer: 'Xiaomi',
      os: 'Android 13',
      deviceId: `REDM-13-${randId}`,
      ip: '191.102.5.73',
      city: 'Curitiba/PR',
      country: 'Brasil',
      timestamp: new Date().toISOString()
    };

    updateStoreDevices([newPend, ...devices]);

    const newAlert: SecurityAlert = {
      id: 'alert-' + Math.random().toString(36).substring(2, 10),
      type: 'new_device',
      title: 'Novo Dispositivo Detectado',
      message: 'Aguardando autorização do ADMIN MASTER.',
      user: newPend.user,
      model: newPend.model,
      os: newPend.os,
      deviceId: newPend.deviceId,
      city: newPend.city,
      ip: newPend.ip,
      timestamp: new Date().toISOString(),
      status: 'active'
    };
    updateStoreAlerts([newAlert, ...alerts]);

    const newLog: SecurityLog = {
      id: 'log-' + Math.random().toString(36).substring(2, 10),
      user: newPend.user,
      device: newPend.model,
      deviceId: newPend.deviceId,
      ip: newPend.ip,
      city: newPend.city,
      country: newPend.country,
      timestamp: new Date().toISOString(),
      status: 'Pendente',
      type: 'login_attempt'
    };
    updateStoreLogs([newLog, ...securityLogs]);

    toast.warning('⚠ ALERTA: NOVO DISPOSITIVO', {
      description: `Dispositivo ${newPend.model} tentará logar e aguarda aprovação.`
    });
  };

  const triggerSimulatedInternationalAttack = () => {
    const randId = Math.random().toString(36).substring(2, 6).toUpperCase();
    const attackerDevice = {
      model: 'OnePlus 12',
      deviceId: `ONEP-12-${randId}`,
      ip: '82.112.44.11',
      city: 'Paris',
      country: 'França'
    };

    const newAlert: SecurityAlert = {
      id: 'alert-' + Math.random().toString(36).substring(2, 10),
      type: 'international_login',
      title: 'Bloqueio Internacional de Acesso',
      message: 'Acesso bloqueado automaticamente por tentativa de fora do Brasil (França).',
      user: 'Invasor Anônimo',
      model: attackerDevice.model,
      os: 'Android 14',
      deviceId: attackerDevice.deviceId,
      city: attackerDevice.city,
      ip: attackerDevice.ip,
      timestamp: new Date().toISOString(),
      status: 'active'
    };
    updateStoreAlerts([newAlert, ...alerts]);

    const newLog: SecurityLog = {
      id: 'log-' + Math.random().toString(36).substring(2, 10),
      user: 'Admin Master (Estrangeiro)',
      device: attackerDevice.model,
      deviceId: attackerDevice.deviceId,
      ip: attackerDevice.ip,
      city: attackerDevice.city,
      country: attackerDevice.country,
      timestamp: new Date().toISOString(),
      status: 'BLOQUEADO AUTOMATICAMENTE',
      type: 'login_attempt'
    };
    updateStoreLogs([newLog, ...securityLogs]);

    toast.error('🚨 INVASÃO INTERNACIONAL BLOQUEADA', {
      description: `Detectada tentativa vinda de ${attackerDevice.city}/${attackerDevice.country}. IP bloqueado.`
    });
    onRegisterOperationalLog(`SISTEMA BLOQUEOU AUTOMATICAMENTE TENTATIVA DE LOGIN EM: ${attackerDevice.country}`);
  };

  const triggerSimulatedValidLogin = () => {
    const newLog: SecurityLog = {
      id: 'log-' + Math.random().toString(36).substring(2, 10),
      user: 'Porteiro Carlos',
      device: 'Moto G34',
      deviceId: 'MOTO-G34-CARLOS-FP',
      ip: '189.125.43.212',
      city: 'Curitiba/PR',
      country: 'Brasil',
      timestamp: new Date().toISOString(),
      status: 'Permitido',
      type: 'session_activity'
    };
    updateStoreLogs([newLog, ...securityLogs]);

    toast.success('Sucesso: Login Válido Simulado', {
      description: 'Porteiro Carlos realizou um login seguro e sua atividade foi registrada.'
    });
  };

  const triggerSimulateAdminSecondaryAcc = () => {
    const secAdminDevice: SecurityDevice = {
      id: 'dev-sec-adm-' + Math.random().toString(36).substring(2, 10),
      user: 'Admin Secundário Desconhecido',
      role: 'admin',
      status: 'pending',
      model: 'iPad Pro',
      manufacturer: 'Apple',
      os: 'iPadOS 17',
      deviceId: 'IPAD-PRO-SEC-ADMIN-MOCK',
      ip: '179.34.12.94',
      city: 'Rio de Janeiro/RJ',
      country: 'Brasil',
      timestamp: new Date().toISOString()
    };

    updateStoreDevices([secAdminDevice, ...devices]);

    const newAlert: SecurityAlert = {
      id: 'alert-' + Math.random().toString(36).substring(2, 10),
      type: 'new_device',
      title: '🚨 NOVO DISPOSITIVO ADMIN DETECTADO',
      message: 'Dispositivo desconhecido tentou usar credenciais administrativas. Acesso bloqueado!',
      user: secAdminDevice.user,
      model: secAdminDevice.model,
      os: secAdminDevice.os,
      deviceId: secAdminDevice.deviceId,
      city: secAdminDevice.city,
      ip: secAdminDevice.ip,
      timestamp: new Date().toISOString(),
      status: 'active'
    };
    updateStoreAlerts([newAlert, ...alerts]);

    const newLog: SecurityLog = {
      id: 'log-' + Math.random().toString(36).substring(2, 10),
      user: 'Admin Master (Secundário)',
      device: secAdminDevice.model,
      deviceId: secAdminDevice.deviceId,
      ip: secAdminDevice.ip,
      city: secAdminDevice.city,
      country: secAdminDevice.country,
      timestamp: new Date().toISOString(),
      status: 'Pendente',
      type: 'login_attempt'
    };
    updateStoreLogs([newLog, ...securityLogs]);

    toast.error('🛡 SEGURANÇA MÁXIMA ATIVADA', {
      description: 'Credencial Administrativa em dispositivo alternativo bloqueada! Aguardando autorização manual.'
    });
  };

  const simulateActiveDeviceLock = () => {
    // Mark current device as pending/unauthorized to show user how the locking screen functions!
    const updated = devices.map(d => {
      if (d.deviceId === currentDeviceId) {
        return {
          ...d,
          status: 'pending' as const
        };
      }
      return d;
    });
    updateStoreDevices(updated);
    
    localStorage.setItem('portaria_current_device_status', 'pending');
    
    // Add Security Log
    const newLog: SecurityLog = {
      id: 'log-' + Math.random().toString(36).substring(2, 10),
      user: 'Admin Master',
      device: 'iPhone 15 Pro Max',
      deviceId: currentDeviceId,
      ip: '189.125.43.210',
      city: 'Curitiba/PR',
      country: 'Brasil',
      timestamp: new Date().toISOString(),
      status: 'Pendente',
      type: 'login_attempt'
    };
    updateStoreLogs([newLog, ...securityLogs]);

    toast.warning('Alterando status do dispositivo atual para PENDENTE', {
      description: 'Você será redirecionado para a tela de bloqueio e aguardo de autorização.'
    });

    // Fire event for current browser/app.tsx to update
    setTimeout(() => {
      window.dispatchEvent(new Event('storage_device_changed'));
    }, 1200);
  };

  // BOTÃO DE EMERGÊNCIA - BLOQUEAR TODOS OS ACESSOS (Confirm Modal inside interface)
  const [showEmergencyModal, setShowEmergencyModal] = useState<boolean>(false);
  const triggerEmergencyLock = () => {
    // 1. Keep only the current session device authorized, turn all others to blocked/pending!
    const updated = devices.map(d => {
      if (d.deviceId === currentDeviceId) {
        return {
          ...d,
          status: 'authorized' as const,
          isPrimary: true
        };
      }
      return {
        ...d,
        status: 'pending' as const // Revoke and demand login
      };
    });
    updateStoreDevices(updated);

    // 2. Set force logout state for all other porteiros / sessions
    localStorage.setItem('portaria_force_all_logout', 'true');
    // Save current active session
    localStorage.setItem('portaria_active_view', 'admin');
    
    // 3. Add to secure logs
    const newLog: SecurityLog = {
      id: 'log-emergency-' + Date.now(),
      user: 'Admin Master',
      device: 'Console do Sistema',
      deviceId: 'EMERGENCY_LOCK',
      ip: '189.125.43.210',
      city: 'Curitiba/PR',
      country: 'Brasil',
      timestamp: new Date().toISOString(),
      status: 'Bloqueado',
      type: 'emergency'
    };
    updateStoreLogs([newLog, ...securityLogs]);

    setShowEmergencyModal(false);
    toast.error('🚨 EMERGÊNCIA ACIONADA', {
      description: 'Todas as sessões ativas foram revogadas e encerradas. Apenas seu dispositivo atual pôde continuar online.'
    });
    onRegisterOperationalLog(`BOTÃO DE EMERGÊNCIA ACIONADO PELO ADMIN MASTER - TODOS OS ACESSOS BLOQUEADOS E SESSÕES ENCERRADAS.`);
  };

  // ----------------------------------------------------
  // ACTION HANDLERS AND HELPERS FOR SECURITY SETTINGS:
  // ----------------------------------------------------
  const isCriticalAlert = (alert: SecurityAlert) => {
    if (!securitySettings.criticalAlertMode) return false;
    // - Tentativas de acesso administrativo geram alerta prioritário
    if (alert.title.toLowerCase().includes('admin') || alert.user.toLowerCase().includes('admin')) return true;
    // - Tentativas internacionais geram alerta prioritário
    if (alert.type === 'international_login' || alert.message.toLowerCase().includes('internacional') || alert.message.toLowerCase().includes('fora do brasil')) return true;
    // - Múltiplas tentativas consecutivas geram alerta prioritário
    if (alert.message.toLowerCase().includes('múltiplas') || alert.message.toLowerCase().includes('várias') || alert.message.toLowerCase().includes('repetidas')) return true;
    return false;
  };

  const handleSaveAlertSettings = () => {
    const updated = {
      ...securitySettings,
      receivePush: formReceivePush,
      receiveEmail: formReceiveEmail,
      receiveCriticalAlerts: formReceiveCriticalAlerts,
    };
    setSecuritySettings(updated);
    localStorage.setItem('portaria_admin_security_settings', JSON.stringify(updated));
    toast.success('Configurações de Alertas Salvas', {
      description: 'As regras de push e disparo de e-mails para incidentes de segurança foram atualizadas.'
    });
    onRegisterOperationalLog('CONFIGURAÇÕES DE ALERTAS ATUALIZADAS PELO ADMIN MASTER.');
  };

  const handleSaveEmergencyContacts = () => {
    if (!formPrimaryEmail.trim()) {
      toast.error('Erro de Validação', {
        description: 'O e-mail principal não pode ficar em branco.'
      });
      return;
    }
    const updated = {
      ...securitySettings,
      primaryEmail: formPrimaryEmail,
      secondaryEmail: formSecondaryEmail,
      adminWhatsapp: formAdminWhatsapp,
    };
    setSecuritySettings(updated);
    localStorage.setItem('portaria_admin_security_settings', JSON.stringify(updated));
    toast.success('Contatos de Emergência Salvos', {
      description: 'Os e-mails e link telefônico administrativos vinculados ao Admin Master foram gravados com sucesso.'
    });
    onRegisterOperationalLog('CONTATOS DE EMERGÊNCIA ATUALIZADOS PELO ADMIN MASTER.');
  };

  const handleSaveInternationalSettings = () => {
    const updated = {
      ...securitySettings,
      internationalBlock: formInternationalBlock,
      allowedCountries: formAllowedCountries,
    };
    setSecuritySettings(updated);
    localStorage.setItem('portaria_admin_security_settings', JSON.stringify(updated));
    toast.success('Bloqueio Internacional de IP Configurado', {
      description: `Bloqueio internacional ${formInternationalBlock ? 'habilitado' : 'desabilitado'}. Países com exceção: ${formAllowedCountries.join(', ')}.`
    });
    onRegisterOperationalLog(`REGRAS DE BLOQUEIO INTERNACIONAL ATUALIZADAS PELO ADMIN MASTER (${formInternationalBlock ? 'ATIVO' : 'INATIVO'}).`);
  };

  const handleSaveSessionSettings = () => {
    const updated = {
      ...securitySettings,
      maxSimultaneousSessions: formMaxSessions,
      maxInactivityTime: formInactivityTime,
    };
    setSecuritySettings(updated);
    localStorage.setItem('portaria_admin_security_settings', JSON.stringify(updated));
    toast.success('Controle de Sessões Atualizado', {
      description: `Capacidade concorrente de ${formMaxSessions} logins e expiração de inação em ${formInactivityTime}m configurados com sucesso.`
    });
    onRegisterOperationalLog('CONTROLE DE SESSÕES SIMULTÂNEAS ATUALIZADO PELO ADMIN MASTER.');
  };

  const handleToggleCriticalAlertMode = (checkedValue: boolean) => {
    const updated = {
      ...securitySettings,
      criticalAlertMode: checkedValue,
    };
    setSecuritySettings(updated);
    localStorage.setItem('portaria_admin_security_settings', JSON.stringify(updated));
    if (checkedValue) {
      toast.warning('☣ MODO ALERTA CRÍTICO ATIVADO', {
        description: 'Os algoritmos de triagem passam a auditar com rigidez militar tentativas e relatórios.'
      });
      onRegisterOperationalLog('MODO ALERTA CRÍTICO ATIVADO - Triagem de segurança rigida iniciada.');
    } else {
      toast.info('Modo Alerta Crítico Desativado', {
        description: 'O monitoramento proativo retornou ao nível de auditoria civil básico.'
      });
      onRegisterOperationalLog('MODO ALERTA CRÍTICO DESATIVADO.');
    }
  };

  const handleAddCountry = () => {
    if (!formNewCountry.trim()) return;
    const cleanCountry = formNewCountry.trim();
    if (formAllowedCountries.includes(cleanCountry)) {
      toast.info('País já listado', {
        description: 'Este país já figura nas exceções geográficas do sistema.'
      });
      return;
    }
    const updatedCountries = [...formAllowedCountries, cleanCountry];
    setFormAllowedCountries(updatedCountries);
    setFormNewCountry('');
    toast.success(`País Autorizado: ${cleanCountry}`, {
      description: `Adicionado à lista de excessões geográficas do firewall.`
    });
  };

  const handleRemoveCountry = (country: string) => {
    if (country === 'Brasil') return; // Cannot delete Brazil
    const updatedCountries = formAllowedCountries.filter(c => c !== country);
    setFormAllowedCountries(updatedCountries);
    toast.warning(`País Removido: ${country}`, {
      description: 'O país foi excluído da lista de excessões geográficas de firewall.'
    });
  };

  const handleMakeThisPrimary = () => {
    const updated = devices.map(d => ({
      ...d,
      isPrimary: d.deviceId === currentDeviceId
    }));
    const exists = devices.some(d => d.deviceId === currentDeviceId);
    if (!exists) {
      const newPrimary: SecurityDevice = {
        id: 'dev-' + Math.random().toString(36).substring(2, 9),
        user: 'Admin Master (Este Navegador)',
        role: 'admin',
        status: 'authorized',
        model: 'Navegador Principal (Chrome/Firefox/Web)',
        manufacturer: 'Dispositivo Master',
        os: 'Web Application Client',
        deviceId: currentDeviceId,
        ip: '189.125.43.' + Math.floor(Math.random() * 255),
        city: 'Curitiba/PR',
        country: 'Brasil',
        timestamp: new Date().toISOString(),
        authorizedAt: new Date().toISOString(),
        lastAccess: new Date().toISOString(),
        isPrimary: true
      };
      updateStoreDevices([...updated, newPrimary]);
    } else {
      updateStoreDevices(updated);
    }
    toast.success('Dispositivo Vinculado como Principal', {
      description: 'Este navegador agora é o dispositivo confiável âncora de segurança do sistema.'
    });
    onRegisterOperationalLog(`DISPOSITIVO PRINCIPAL ALTERADO - Este navegador (${currentDeviceId}) foi rotulado como Confiável Master.`);
  };

  const handleRevokePrimary = () => {
    const updated = devices.map(d => ({
      ...d,
      isPrimary: false
    }));
    updateStoreDevices(updated);
    toast.warning('Dispositivo Principal Revogado', {
      description: 'Nenhum dispositivo no sistema é considerado 100% confiável de forma âncora.'
    });
    onRegisterOperationalLog(`DISPOSITIVO PRINCIPAL REVOGADO - O status de âncora de segurança foi limpo.`);
  };

  const handleSetPrimaryById = (id: string) => {
    const updated = devices.map(d => ({
      ...d,
      isPrimary: d.id === id
    }));
    updateStoreDevices(updated);
    const target = devices.find(d => d.id === id);
    toast.success('Dispositivo Principal Alterado', {
      description: `${target?.model} (${target?.user}) é o novo dispositivo confiável principal.`
    });
    onRegisterOperationalLog(`DISPOSITIVO PRINCIPAL ALTERADO - Configurado para ${target?.model} (${target?.deviceId}).`);
  };

  // Filter lists
  const authorizedDevices = devices.filter(d => d.status === 'authorized');
  const pendingDevices = devices.filter(d => d.status === 'pending');
  const blockedDevices = devices.filter(d => d.status === 'blocked' || d.status === 'blocked_foreign');
  const activeAlerts = alerts.filter(a => a.status === 'active');
  
  // Simulated stats counts
  const totalAuthorized = authorizedDevices.length;
  const totalPending = pendingDevices.length;
  const totalBlocked = securityLogs.filter(l => l.status === 'Bloqueado' || l.status === 'BLOQUEADO AUTOMATICAMENTE').length;
  const totalActiveSessions = authorizedDevices.length; // assuming authorized are active session simulators

  return (
    <div className="space-y-6">
      {/* Dynamic Security Warning Alert */}
      <AnimatePresence>
        {activeAlerts.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-2xl space-y-3 shadow-xs"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 animate-pulse animate-duration-1000" />
              <h4 className="text-xs font-black text-amber-950 uppercase tracking-wider">Alertas de Segurança Ativos ({activeAlerts.length})</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {activeAlerts.slice(0, 4).map(alert => {
                const isCrit = isCriticalAlert(alert);
                return (
                  <div 
                    key={alert.id} 
                    className={cn(
                      "p-3 rounded-xl border text-[11px] font-bold space-y-1 relative group transition-all",
                      isCrit 
                        ? "bg-rose-50 border-rose-300 text-rose-950 shadow-sm animate-pulse animate-duration-3000 border-l-4 border-l-red-650"
                        : "bg-white/80 border-amber-200 text-slate-700"
                    )}
                  >
                    <div className="flex justify-between items-start pr-12">
                      <span className={cn(
                        "uppercase tracking-wide flex items-center gap-1 font-black text-[10px]",
                        isCrit ? "text-rose-700" : "text-amber-700"
                      )}>
                        {isCrit ? '🚨 ALERTA CRÍTICO PRIORITY-1' : (alert.type === 'international_login' ? '🚨 BLOQUEIO INTERNACIONAL' : '⚠ NOVO DISPOSITIVO')}
                      </span>
                      <span className="text-[9px] text-slate-400 font-normal">{format(new Date(alert.timestamp), 'dd/MM/yyyy HH:mm')}</span>
                    </div>
                    <div className="text-slate-700 font-black uppercase text-xs">{alert.model} ({alert.user})</div>
                    <div className="text-slate-500 text-[10px]">
                      OS: <span className="text-slate-700">{alert.os}</span> | ID: <span className="font-mono text-slate-700">{alert.deviceId}</span>
                    </div>
                    <div className="text-slate-500 text-[10px]">
                      IP: <span className="text-slate-700 font-mono">{alert.ip}</span> | Localidade: <span className="text-slate-700">{alert.city}</span>
                    </div>
                    <div className={cn(
                      "text-[10px] mt-1 italic font-bold",
                      isCrit ? "text-rose-800 font-extrabold" : "text-amber-800"
                    )}>
                      "{alert.message}"
                    </div>
                    
                    <div className="absolute top-2 right-2 flex gap-1">
                      <button 
                        onClick={() => handleDismissAlert(alert.id)}
                        className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Arquivar alerta"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Security Interactive Controls Deck */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 text-white flex flex-col md:flex-row gap-4 items-center justify-between shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-32 bg-radial from-blue-600/10 to-transparent pointer-events-none" />
        <div className="space-y-1 relative">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
            </span>
            <h3 className="text-sm font-black text-blue-400 uppercase tracking-widest">Painel Inteligente do Simulador</h3>
          </div>
          <p className="text-[10px] text-slate-400 uppercase font-black tracking-wide">
            Utilize os botões à direita para simular conexões e auditar as reações de proteção em tempo real.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5 justify-center">
          <button 
            onClick={triggerSimulatedNewDevice}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs border border-slate-700 font-black rounded-xl uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-95 text-slate-200"
          >
            <Smartphone className="w-3.5 h-3.5 text-blue-400" />
            Novo Celular
          </button>
          <button 
            onClick={triggerSimulateAdminSecondaryAcc}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs border border-slate-700 font-black rounded-xl uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-95 text-slate-200"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            Outro Admin
          </button>
          <button 
            onClick={triggerSimulatedInternationalAttack}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs border border-slate-700 font-black rounded-xl uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-95 text-slate-200"
          >
            <Globe className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
            Conexão Int.
          </button>
          <button 
            onClick={triggerSimulatedValidLogin}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs border border-slate-700 font-black rounded-xl uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-95 text-slate-200"
          >
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            Login Válido
          </button>
          <button 
            onClick={simulateActiveDeviceLock}
            className="px-3 py-2 bg-rose-950 hover:bg-rose-900 text-xs border border-rose-800 text-rose-300 font-black rounded-xl uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-95"
          >
            <Lock className="w-3.5 h-3.5 text-rose-400" />
            Bloquear Eu
          </button>
        </div>
      </div>

      {/* Main Tab Bar (Horizontal, matches style) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-1 shadow-sm overflow-x-auto no-scrollbar">
        <div className="flex gap-1 whitespace-nowrap min-w-max">
          {[
            { id: 'summary', name: 'Painel Resumo', icon: Activity },
            { id: 'authorized', name: 'Dispositivos Autorizados', icon: ShieldCheck },
            { id: 'pending', name: 'Pendentes de Autorização', icon: Clock },
            { id: 'attempts', name: 'Tentativas de Acesso', icon: Globe },
            { id: 'logs', name: 'Log de Segurança Completo', icon: Lock },
            { id: 'sessions', name: 'Sessões Ativas', icon: Smartphone },
            { id: 'security_settings', name: 'Configurações de Segurança', icon: Settings }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "py-2.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2",
                activeTab === tab.id 
                  ? "bg-slate-900 text-white shadow-sm font-black" 
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-50 font-bold"
              )}
            >
              <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? "text-blue-400" : "text-slate-400")} />
              {tab.name}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        
        {/* TAB 1: SUMMARY PANELS & INFO CARDS */}
        {activeTab === 'summary' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Row of Metrics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
              <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-3xl space-y-1 shadow-xs">
                <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase block">Dispositivos Autorizados</span>
                <span className="text-3xl font-black text-slate-900">{totalAuthorized}</span>
                <span className="text-[9px] text-emerald-600 font-black tracking-wide block uppercase flex items-center gap-0.5">
                  <ShieldCheck className="w-3 h-3 h-inline" /> Ativos & Seguros
                </span>
              </div>
              <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-3xl space-y-1 shadow-xs">
                <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase block">Aguardando Aprovação</span>
                <span className="text-3xl font-black text-amber-600">{totalPending}</span>
                <span className="text-[9px] text-amber-600 font-black tracking-wide block uppercase flex items-center gap-0.5">
                  <Clock className="w-3 h-3 h-inline" /> Travados pelo Admin
                </span>
              </div>
              <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-3xl space-y-1 shadow-xs">
                <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase block">Tentativas Bloqueadas</span>
                <span className="text-3xl font-black text-rose-600">{totalBlocked}</span>
                <span className="text-[9px] text-rose-600 font-black tracking-wide block uppercase flex items-center gap-0.5">
                  <ShieldAlert className="w-3 h-3 h-inline" /> Incidentes barreados
                </span>
              </div>
              <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-3xl space-y-1 shadow-xs">
                <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase block">Sessões Ativas</span>
                <span className="text-3xl font-black text-blue-600">{totalActiveSessions}</span>
                <span className="text-[9px] text-blue-600 font-black tracking-wide block uppercase flex items-center gap-0.5">
                  <Wifi className="w-3 h-3 h-inline" /> Conectadas agora
                </span>
              </div>
              <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-3xl col-span-2 lg:col-span-1 space-y-1 shadow-xs">
                <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase block">Países Bloqueados</span>
                <span className="text-sm font-black text-red-700 bg-red-100/80 px-2 py-1 rounded-lg inline-block uppercase tracking-wider mt-1 text-center">
                  TODOS EXCETO BR
                </span>
                <span className="text-[8px] text-red-600 font-black tracking-wide block uppercase pt-0.5">
                  🛡 Bloqueio Automático Ativo
                </span>
              </div>
            </div>

            {/* Emergency and Geographic Policy Widget */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Emergency Stop Module */}
              <div className="bg-white border-2 border-slate-200 p-6 rounded-3xl flex flex-col justify-between shadow-sm space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                      <Lock className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">BOTÃO DE EMERGÊNCIA</h3>
                  </div>
                  <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                    Em caso de indícios de vazamento de credenciais ou ataque massivo ao condomínio, o ADMIN MASTER poderá acionar o bloqueio absoluto de todas as sessões. Esta ação encerra sessões de todos os porteiros, síndicos e demais administradores, obrigando um novo login manual por meio de PIN verificado. O seu próprio console permanecerá online e seguro.
                  </p>
                </div>
                <div className="pt-2">
                  <button 
                    onClick={() => setShowEmergencyModal(true)}
                    className="w-full bg-rose-600 hover:bg-rose-700 border-b-4 border-rose-800 text-white font-black text-xs uppercase tracking-widest py-3 sm:py-4 px-4 rounded-2xl active:translate-y-1 active:border-b-0 transition-all flex items-center justify-center gap-2"
                  >
                    <ShieldAlert className="w-4 h-4 animate-bounce" />
                    BLOQUEAR TODOS OS ACESSOS (LOCKDOWN)
                  </button>
                </div>
              </div>

              {/* Geo Block and First Device Policy Rules */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white p-6 rounded-3xl shadow-md space-y-4">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-blue-400" />
                  <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest">Regras Ativas e Políticas de Grupo</h3>
                </div>

                <div className="space-y-3.5 divide-y divide-slate-800">
                  <div className="space-y-1 pt-1">
                    <span className="text-[9px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-amber-400" /> BLOQUEIO GEOGRÁFICO DE PAÍS
                    </span>
                    <p className="text-[10px] text-slate-300 font-semibold leading-relaxed">
                      Qualquer requisição procedente de endereços de IP fora do Brasil será imediatamente congelada com o status <span className="text-red-400">"BLOQUEADO AUTOMATICAMENTE"</span>. O sistema gera alertas em tempo real e armazena os coordenadas de rede.
                    </p>
                  </div>

                  <div className="space-y-1 pt-3">
                    <span className="text-[9px] font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> DISPOSITIVO CONFIÁVEL PRINCIPAL (ADMIN)
                    </span>
                    <p className="text-[10px] text-slate-300 font-semibold leading-relaxed">
                      O primeiro navegador ou celular que fizer a autenticação da credencial de Admin Master é eleito automaticamente como confiável principal. Tentativas de outros celulares usando o mesmo PIN serão retidas no portal de aprovação por design.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DISPOSITIVOS AUTORIZADOS */}
        {activeTab === 'authorized' && (
          <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden animate-in fade-in duration-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Lista de Dispositivos Autorizados ({authorizedDevices.length})</h3>
              <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Apenas estes podem navegar nos módulos</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-[10px] font-black uppercase text-slate-500 tracking-wider border-b border-slate-200">
                    <th className="py-3 px-4">Nome do Usuário</th>
                    <th className="py-3 px-4">Perfil</th>
                    <th className="py-3 px-4">Modelo/Fabricante</th>
                    <th className="py-3 px-4">Dev. ID Fingerprint</th>
                    <th className="py-3 px-4">Data Autorização</th>
                    <th className="py-3 px-4">IP / Cidade</th>
                    <th className="py-3 px-4 text-right">Ações de Bloqueio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px] font-black uppercase text-slate-700">
                  {authorizedDevices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 font-bold uppercase tracking-wider">
                        Nenhum dispositivo cadastrado como confiável.
                      </td>
                    </tr>
                  ) : (
                    authorizedDevices.map(device => {
                      const isCurrent = device.deviceId === currentDeviceId;
                      return (
                        <tr key={device.id} className={cn("hover:bg-slate-50/50", isCurrent && "bg-blue-50/40")}>
                          <td className="py-3 px-4">
                            <div className="space-y-0.5">
                              <span className="font-extrabold text-xs text-slate-900">{device.user}</span>
                              {device.isPrimary && (
                                <span className="text-[8px] bg-blue-600 text-white font-extrabold block w-fit px-1.5 py-0.5 rounded-[4px] uppercase tracking-wider">
                                  Principal Confiável
                                </span>
                              )}
                              {device.isTemporary && (
                                <span className="text-[8px] bg-purple-600 text-white font-extrabold block w-fit px-1.5 py-0.5 rounded-[4px] uppercase tracking-wider">
                                  Temporário (Expira em 2h)
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={cn(
                              "px-2 py-0.5 rounded-full font-black text-[9px] border uppercase",
                              device.role === 'admin' 
                                ? "bg-red-50 border-red-100 text-red-600" 
                                : "bg-blue-50 border-blue-100 text-blue-600"
                            )}>
                              {device.role}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="space-y-0.5">
                              <span className="text-slate-800">{device.model}</span>
                              <span className="text-[9px] text-slate-400 block font-normal text-[9px]">{device.os} • {device.manufacturer}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-[10px] text-slate-500 font-normal">{device.deviceId}</td>
                          <td className="py-3 px-4 text-slate-500 font-bold">
                            {device.authorizedAt ? format(new Date(device.authorizedAt), 'dd/MM/yyyy HH:mm') : '-'}
                          </td>
                          <td className="py-3 px-4 font-bold">
                            <div className="space-y-0.5">
                              <span>{device.city}</span>
                              <span className="text-[9px] text-slate-400 font-mono block font-normal">{device.ip}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex gap-1 justify-end">
                              {!device.isPrimary && (
                                <>
                                  <button
                                    onClick={() => handleRevokeAuthorization(device)}
                                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all font-black text-[9px]"
                                    title="Revogar autorização"
                                  >
                                    Revogar
                                  </button>
                                  <button
                                    onClick={() => handleBlockDevice(device)}
                                    className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-all font-black text-[9px]"
                                    title="Bloquear Dispositivo"
                                  >
                                    Bloquear
                                  </button>
                                </>
                              )}
                              {device.isPrimary && (
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block pr-2">
                                  Protegido
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: DISPOSITIVOS PENDENTES */}
        {activeTab === 'pending' && (
          <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden animate-in fade-in duration-200">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center bg-slate-50/50 gap-2">
              <div className="space-y-0.5">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                  Fila de Dispositivos Pendentes ({pendingDevices.length})
                </h3>
                <p className="text-[10px] text-amber-600 font-black uppercase tracking-wider">
                  Nenhum dispositivo listado abaixo conseguirá ver dados até um Admin Master aprovar
                </p>
              </div>
              <span className="text-[9px] bg-amber-500 text-white w-fit px-2.5 py-1 rounded-full uppercase tracking-wider font-extrabold text-center">
                POLÍTICA ZERO-TRUST ATIVADA
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-[10px] font-black uppercase text-slate-500 tracking-wider border-b border-slate-200">
                    <th className="py-3 px-4">Login Informado</th>
                    <th className="py-3 px-4">Modelo do Aparelho</th>
                    <th className="py-3 px-4">Fabricante</th>
                    <th className="py-3 px-4">Sist. Operacional</th>
                    <th className="py-3 px-4">Device ID Fingerprint</th>
                    <th className="py-3 px-4">Cidade / IP</th>
                    <th className="py-3 px-4 text-center">Tentativa</th>
                    <th className="py-3 px-4 text-right">Ações Rápidas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px] font-black uppercase text-slate-700">
                  {pendingDevices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 font-bold uppercase tracking-wider">
                        Não existem novos aparelhos aguardando na fila. Todos estão autorizados ou bloqueados.
                      </td>
                    </tr>
                  ) : (
                    pendingDevices.map(device => (
                      <tr key={device.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            <span className="font-extrabold text-slate-900">{device.user}</span>
                            <span className="text-[8px] bg-amber-100/80 border border-amber-200 text-amber-700 font-extrabold block w-fit px-1.5 py-0.5 rounded-[4px] uppercase tracking-wider">
                              Aguardando Master
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">{device.model}</td>
                        <td className="py-3 px-4 text-slate-500">{device.manufacturer}</td>
                        <td className="py-3 px-4 text-slate-500">{device.os}</td>
                        <td className="py-3 px-4 font-mono text-[10px] text-slate-500">{device.deviceId}</td>
                        <td className="py-3 px-4 font-bold">
                          <div className="space-y-0.5">
                            <span>{device.city}</span>
                            <span className="text-[9px] text-slate-400 font-mono block font-normal">{device.ip}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-500">
                          {format(new Date(device.timestamp), 'dd/MM/yyyy HH:mm')}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex gap-1.5 justify-end">
                            <button
                              onClick={() => handleAuthorize(device, false)}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all font-black text-[9px] uppercase tracking-wider shadow-xs"
                            >
                              Autorizar
                            </button>
                            <button
                              onClick={() => handleAuthorize(device, true)}
                              className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-all font-black text-[9px] uppercase tracking-wider shadow-xs"
                            >
                              Autorizar Temp (2h)
                            </button>
                            <button
                              onClick={() => handleBlockDevice(device)}
                              className="px-2.5 py-1.5 bg-red-650 hover:bg-red-700 text-white rounded-xl transition-all font-black text-[9px] uppercase tracking-wider shadow-xs"
                              title="Banir"
                            >
                              Bloquear
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: TENTATIVAS DE ACESSO */}
        {activeTab === 'attempts' && (
          <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden animate-in fade-in duration-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Tentativas de Autenticação Recentes ({securityLogs.filter(l => l.type === 'login_attempt').length})</h3>
              <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Histórico de acessos aos PINs</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-[10px] font-black uppercase text-slate-500 tracking-wider border-b border-slate-200">
                    <th className="py-3 px-4">Login Informado</th>
                    <th className="py-3 px-4">Dispositivo</th>
                    <th className="py-3 px-4">Device ID Fingerprint</th>
                    <th className="py-3 px-4 text-center">Data e Hora</th>
                    <th className="py-3 px-4 font-mono">Endereço IP</th>
                    <th className="py-3 px-4">Cidade / País</th>
                    <th className="py-3 px-4 text-right">Resultado / Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px] font-black uppercase text-slate-700">
                  {securityLogs.filter(l => l.type === 'login_attempt').map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-extrabold text-slate-900">{log.user}</td>
                      <td className="py-3 px-4">{log.device}</td>
                      <td className="py-3 px-4 font-mono text-[10px] text-slate-500">{log.deviceId}</td>
                      <td className="py-3 px-4 text-center font-bold text-slate-500">
                        {format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss')}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-500">{log.ip}</td>
                      <td className="py-3 px-4">
                        <span>{log.city}</span>
                        {log.country !== 'Brasil' && (
                          <span className="text-[8px] bg-red-100 border border-red-200 text-red-700 font-extrabold block w-fit px-1 rounded-[4px] mt-0.5">
                            Fora do Brasil (Invasão)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full font-black text-[9px] border inline-block uppercase tracking-wider",
                          log.status === 'Permitido' && "bg-emerald-50 border-emerald-100 text-emerald-700",
                          log.status === 'Pendente' && "bg-amber-50 border-amber-100 text-amber-700 animate-pulse",
                          log.status === 'Bloqueado' && "bg-red-50 border-red-100 text-red-700",
                          log.status === 'BLOQUEADO AUTOMATICAMENTE' && "bg-rose-100 border-rose-200 text-rose-700 font-black animate-pulse"
                        )}>
                          {log.status === 'BLOQUEADO AUTOMATICAMENTE' ? 'Automático Int' : log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: LOG DE SEGURANÇA E ACESSOS COMPLETO */}
        {activeTab === 'logs' && (
          <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden animate-in fade-in duration-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Registros de Segurança Totais (Logs Atividade - {securityLogs.length})</h3>
              <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Todos os eventos de rede rastreáveis</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-[10px] font-black uppercase text-slate-500 tracking-wider border-b border-slate-200">
                    <th className="py-3 px-4">Usuário / Operador</th>
                    <th className="py-3 px-4">Dispositivo Vinculado</th>
                    <th className="py-3 px-4">Cidade de Acesso</th>
                    <th className="py-3 px-4 text-center">Data e Hora do Evento</th>
                    <th className="py-3 px-4 text-right">Resultado do Acesso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px] font-black uppercase text-slate-700">
                  {securityLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <span className="font-extrabold text-slate-900">{log.user}</span>
                          <span className="text-[8px] text-slate-400 block font-normal">Tipo: {log.type}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <span>{log.device}</span>
                          <span className="text-[9px] text-slate-400 font-mono block font-normal">{log.deviceId}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">{log.city}</td>
                      <td className="py-3 px-4 text-center font-bold text-slate-500">
                        {format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss')}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={cn(
                          "font-bold text-[10px]",
                          log.status === 'Permitido' && "text-emerald-600",
                          log.status === 'Pendente' && "text-amber-600",
                          (log.status === 'Bloqueado' || log.status === 'BLOQUEADO AUTOMATICAMENTE') && "text-red-600"
                        )}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: SESSÕES ATIVAS */}
        {activeTab === 'sessions' && (
          <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden animate-in fade-in duration-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Rastreio de Conexões e Sessões Ativas ({authorizedDevices.length})</h3>
              <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Aparelhos conectados nos servidores agora</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-[10px] font-black uppercase text-slate-500 tracking-wider border-b border-slate-200">
                    <th className="py-3 px-4">Usuário Conectado</th>
                    <th className="py-3 px-4">Modelo do Aparelho</th>
                    <th className="py-3 px-4">Cidade / Local</th>
                    <th className="py-3 px-4 text-center">Horário do Login</th>
                    <th className="py-3 px-4 text-right">Ação Direta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px] font-black uppercase text-slate-700">
                  {authorizedDevices.map(device => (
                    <tr key={device.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-extrabold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span className="flex h-2.5 w-2.5 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                          </span>
                          <span>{device.user}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">{device.model}</td>
                      <td className="py-3 px-4">{device.city}</td>
                      <td className="py-3 px-4 text-center font-bold text-slate-500">
                        {device.authorizedAt ? format(new Date(device.authorizedAt), 'dd/MM/yyyy HH:mm') : '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex gap-2 justify-end">
                          {!device.isPrimary ? (
                            <>
                              <button
                                onClick={() => handleRevokeAuthorization(device)}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all font-black text-[9px] uppercase tracking-wider"
                              >
                                Encerrar Sessão
                              </button>
                              <button
                                onClick={() => handleBlockDevice(device)}
                                className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-650 rounded-xl transition-all font-black text-[9px] uppercase tracking-wider"
                              >
                                Bloquear Aparelho
                              </button>
                            </>
                          ) : (
                            <span className="text-[9px] text-emerald-600 font-extrabold pr-3">Sua Sessão Atual</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 7: CONFIGURAÇÕES DE SEGURANÇA */}
        {activeTab === 'security_settings' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Pulsing Alert banner introducing settings */}
            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 text-white relative overflow-hidden shadow-xl">
              <div className="absolute top-0 right-0 w-80 h-32 bg-radial from-blue-600/15 to-transparent pointer-events-none" />
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-400 animate-pulse" />
                    <span className="text-[9px] font-black bg-blue-500/25 text-blue-300 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      Gerenciamento de Segurança Master
                    </span>
                  </div>
                  <h3 className="text-lg font-black uppercase tracking-wider text-white">Configurações de Segurança do Sistema</h3>
                  <p className="text-[10px] text-slate-400 max-w-xl font-bold uppercase tracking-wide leading-relaxed">
                    Ajuste canais de monitoramento, dispositivos confiáveis de ancoragem, regras de bloqueio internacional e gatilhos de alerta emergencial. Apenas o Admin Master possui permissão de escrita e visualização desta tela.
                  </p>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl flex items-center gap-3">
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Painel Protegido</span>
                </div>
              </div>
            </div>

            {/* Grid layout of 2 columns or single column depending on screen format */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* CARD 1: ALERTAS */}
              <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden flex flex-col justify-between animate-in slide-in-from-bottom-2 duration-300">
                <div>
                  <div className="p-5 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                      <Bell className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Gatilhos de Alertas do Sistema</h4>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">Canais de envio para incidentes e logs prioritários</p>
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    <div className="text-[11px] text-slate-500 uppercase font-bold leading-normal">
                      Configure individualmente quais tipos de notificações e mídias de alertas devem ser acionadas em tempo real durante anomalias de acesso.
                    </div>

                    <div className="space-y-3.5 pt-2">
                      <label className="flex items-start gap-3 p-3 bg-slate-50 hover:bg-slate-100/75 rounded-2xl border border-slate-100 cursor-pointer transition-all active:scale-[0.99] select-none">
                        <input 
                          type="checkbox" 
                          checked={formReceivePush} 
                          onChange={(e) => setFormReceivePush(e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-650 focus:ring-blue-500 cursor-pointer"
                        />
                        <div className="space-y-0.5">
                          <span className="text-[11px] font-black text-slate-800 uppercase block tracking-wider">Receber Notificações Push</span>
                          <span className="text-[9px] text-slate-400 block font-semibold uppercase leading-snug">
                            Alertas instantâneos via balões flutuantes diretamente no navegador ou painel de portaria
                          </span>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 p-3 bg-slate-50 hover:bg-slate-100/75 rounded-2xl border border-slate-100 cursor-pointer transition-all active:scale-[0.99] select-none">
                        <input 
                          type="checkbox" 
                          checked={formReceiveEmail} 
                          onChange={(e) => setFormReceiveEmail(e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-650 focus:ring-blue-500 cursor-pointer"
                        />
                        <div className="space-y-0.5">
                          <span className="text-[11px] font-black text-slate-800 uppercase block tracking-wider">Receber Alertas por E-mail</span>
                          <span className="text-[9px] text-slate-400 block font-semibold uppercase leading-snug">
                            Disparos consolidados em lote ou unitários para os e-mails registrados do Admin Master
                          </span>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 p-3 bg-slate-50 hover:bg-slate-100/75 rounded-2xl border border-slate-100 cursor-pointer transition-all active:scale-[0.99] select-none">
                        <input 
                          type="checkbox" 
                          checked={formReceiveCriticalAlerts} 
                          onChange={(e) => setFormReceiveCriticalAlerts(e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-650 focus:ring-blue-500 cursor-pointer"
                        />
                        <div className="space-y-0.5">
                          <span className="text-[11px] font-black text-slate-800 uppercase block tracking-wider">Receber Alertas Críticos Imediatos</span>
                          <span className="text-[9px] text-slate-400 block font-semibold uppercase leading-snug text-rose-600">
                            Disparar sirene local imediata em todos os aparelhos de porteiro em serviço durante invasões bloqueadas
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                  <button
                    onClick={handleSaveAlertSettings}
                    className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-xs active:scale-[0.98]"
                  >
                    Salvar Configurações
                  </button>
                </div>
              </div>


              {/* CARD 2: CONTATOS DE EMERGÊNCIA */}
              <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden flex flex-col justify-between animate-in slide-in-from-bottom-2 duration-300">
                <div>
                  <div className="p-5 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Contatos de Emergência</h4>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">Canais e caixas postais para envios urgentes do sistema</p>
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    <div className="text-[11px] text-slate-500 uppercase font-bold leading-normal">
                      Insira os canais de recebimento de relatórios e notificações críticas de auditoria. Dados serão vinculados de forma confidencial ao perfil do Admin Master.
                    </div>

                    <div className="space-y-3 pt-2">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block font-bold">E-mail Principal</label>
                        <input 
                          type="email"
                          placeholder="exemplo@email.com"
                          value={formPrimaryEmail}
                          onChange={(e) => setFormPrimaryEmail(e.target.value)}
                          className="w-full text-xs font-bold bg-slate-50 border border-slate-200 p-3 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 transition-all uppercase"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block font-bold">E-mail Secundário (Opcional)</label>
                        <input 
                          type="email"
                          placeholder="gestao@email.com"
                          value={formSecondaryEmail}
                          onChange={(e) => setFormSecondaryEmail(e.target.value)}
                          className="w-full text-xs font-bold bg-slate-50 border border-slate-200 p-3 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 transition-all uppercase"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block font-bold">WhatsApp Administrativo (Opcional)</label>
                        <input 
                          type="text"
                          placeholder="(41) 99999-9999"
                          value={formAdminWhatsapp}
                          onChange={(e) => setFormAdminWhatsapp(e.target.value)}
                          className="w-full text-xs font-bold bg-slate-50 border border-slate-200 p-3 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 transition-all uppercase"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                  <button
                    onClick={handleSaveEmergencyContacts}
                    className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-xs active:scale-[0.98]"
                  >
                    Salvar Configurações
                  </button>
                </div>
              </div>


              {/* CARD 3: DISPOSITIVO PRINCIPAL DO ADMIN MASTER */}
              <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden lg:col-span-2 space-y-1 animate-in slide-in-from-bottom-2 duration-300">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Dispositivo Principal do Admin Master</h4>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">Dispositivo regulatório principal do Admin de Sistema</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-extrabold bg-blue-100 text-blue-800 px-3 py-1 rounded-full uppercase tracking-wider animate-pulse">
                    Nó Confiável do Sistema
                  </span>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left sub-column: current primary device attributes */}
                  <div className="space-y-4">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aparelho Vinculado Atual</h5>
                    
                    {devices.find(d => d.isPrimary) ? (
                      (() => {
                        const prim = devices.find(d => d.isPrimary)!;
                        return (
                          <div className="bg-slate-950 text-slate-300 font-mono text-[10px] uppercase rounded-2xl p-4 border border-slate-800 shadow-inner relative overflow-hidden space-y-2.5">
                            <div className="absolute top-2 right-2 flex items-center gap-1 bg-emerald-500/25 border border-emerald-500/50 text-emerald-400 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest animate-pulse">
                              ● ATIVO & PRINCIPAL
                            </div>
                            <div className="flex justify-between border-b border-slate-900 pb-1.5">
                              <span className="text-slate-500">Apelido:</span>
                              <span className="text-white font-bold">{prim.user}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-900 pb-1.5">
                              <span className="text-slate-500">Modelo do Aparelho:</span>
                              <span className="text-blue-300 font-bold">{prim.model}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-900 pb-1.5">
                              <span className="text-slate-500">Sistema Operacional:</span>
                              <span className="text-slate-300 font-bold">{prim.os}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-900 pb-1.5">
                              <span className="text-slate-500">Device ID Fingerprint:</span>
                              <span className="text-slate-200 select-all font-bold tracking-tight text-[9px] bg-slate-900 px-1 py-0.5 rounded">{prim.deviceId}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-900 pb-1.5">
                              <span className="text-slate-500">Cidade / País:</span>
                              <span className="text-slate-300 font-bold">{prim.city} ({prim.country})</span>
                            </div>
                            <div className="flex justify-between select-none">
                              <span className="text-slate-500">Data de Vinculação:</span>
                              <span className="text-amber-500 font-bold">{format(new Date(prim.authorizedAt || prim.timestamp), 'dd/MM/yyyy HH:mm:ss')}</span>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="bg-rose-50 border border-rose-100 text-rose-900 rounded-2xl p-5 text-center space-y-2">
                        <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto animate-bounce" />
                        <h6 className="text-xs font-black text-rose-955 uppercase tracking-widest text-rose-950">Nenhum Dispositivo Conectado Como Principal</h6>
                        <p className="text-[9px] text-slate-500 font-bold uppercase leading-relaxed max-w-sm mx-auto">
                          Atualmente nenhum dispositivo está registrado como a âncora principal de segurança. Isso permite flexibilidade total, porém diminui a rigidez de auditorias físicas.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Right sub-column: functional controls and instructions */}
                  <div className="flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Controle de Dispositivo Âncora</h5>
                      <p className="text-[11px] text-slate-500 uppercase font-bold leading-relaxed">
                        O Dispositivo Principal será considerado o dispositivo mais confiável do sistema. Tentativas de acesso administrativo realizadas por dispositivos diferentes deverão seguir as regras de autorização da Central de Segurança.
                      </p>
                      
                      {/* Interactive dropdown/select to pick from other authorized devices if we want to change primary */}
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Selecione outro aparelho para tornar o Principal</label>
                        <select 
                          onChange={(e) => {
                            if (e.target.value) {
                              handleSetPrimaryById(e.target.value);
                              e.target.value = '';
                            }
                          }}
                          className="w-full text-[10px] font-black uppercase bg-white border border-slate-200 p-2.5 rounded-xl text-slate-700 outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
                        >
                          <option value="">-- Escolher dispositivo autorizado --</option>
                          {devices.filter(d => !d.isPrimary && d.status === 'authorized').map(d => (
                            <option key={d.id} value={d.id}>
                              {d.model} - {d.user} ({d.deviceId})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-2">
                      <button
                        onClick={handleMakeThisPrimary}
                        className="flex-1 py-3 bg-blue-650 hover:bg-blue-700 text-white font-black text-[9px] uppercase tracking-wider rounded-xl transition-all shadow-sm active:scale-95 text-center flex items-center justify-center gap-1.5"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        Tornar este o principal
                      </button>
                      <button
                        onClick={handleRevokePrimary}
                        disabled={!devices.some(d => d.isPrimary)}
                        className="flex-1 py-3 bg-red-50 hover:bg-red-100 text-red-650 disabled:opacity-50 disabled:cursor-not-allowed font-black text-[9px] uppercase tracking-wider rounded-xl transition-all active:scale-95 text-center flex items-center justify-center gap-1.5 border border-red-200 font-extrabold"
                      >
                        <X className="w-3.5 h-3.5" />
                        Revogar principal
                      </button>
                    </div>
                  </div>
                </div>
              </div>


              {/* CARD 4: BLOQUEIO INTERNACIONAL */}
              <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden flex flex-col justify-between animate-in slide-in-from-bottom-2 duration-300">
                <div>
                  <div className="p-5 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Bloqueio Geográfico Internacional</h4>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">Impedir acessos baseados em geolocalização IP estrangeira</p>
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    <div className="text-[11px] text-slate-500 uppercase font-bold leading-normal">
                      Bloqueia tentativas de login ou conexões de API cujo IP seja originado fora de território brasileiro por padrão. Adicione países de exceção abaixo.
                    </div>

                    <div className="space-y-4 pt-1">
                      <label className="flex items-start gap-3 p-3 bg-slate-50 hover:bg-slate-100/75 rounded-2xl cursor-pointer transition-all active:scale-[0.99] border border-slate-150 select-none">
                        <input 
                          type="checkbox" 
                          checked={formInternationalBlock} 
                          onChange={(e) => setFormInternationalBlock(e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-650 focus:ring-blue-500 cursor-pointer"
                        />
                        <div className="space-y-0.5">
                          <span className="text-[11px] font-black text-rose-950 uppercase block tracking-wider">Bloqueio Internacional Ativado</span>
                          <span className="text-[9px] text-slate-500 block font-bold leading-snug">
                            Isolar tráfego internacional. IPs de fora do país serão barrados imediatamente na camada CDN.
                          </span>
                        </div>
                      </label>

                      {/* Allowed countries tag management block */}
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block font-bold">Lista de Países Autorizados (Exceções)</label>
                        <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl min-h-[50px] items-center">
                          {formAllowedCountries.map(country => (
                            <span key={country} className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase bg-sky-100 text-sky-850 px-2 py-1 rounded-lg">
                              {country}
                              {country !== 'Brasil' && (
                                <button 
                                  onClick={() => handleRemoveCountry(country)}
                                  className="text-sky-700 hover:text-sky-900"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </span>
                          ))}
                        </div>

                        {/* Input and button to insert country */}
                        <div className="flex gap-2">
                          <input 
                            type="text"
                            placeholder="Nome do País (Ex: Portugal)"
                            value={formNewCountry}
                            onChange={(e) => setFormNewCountry(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddCountry();
                              }
                            }}
                            className="flex-1 text-[10px] font-black uppercase bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl focus:bg-white focus:outline-none"
                          />
                          <button
                            onClick={handleAddCountry}
                            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all"
                          >
                            Adicionar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                  <button
                    onClick={handleSaveInternationalSettings}
                    className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-xs active:scale-[0.98]"
                  >
                    Salvar Configurações
                  </button>
                </div>
              </div>


              {/* CARD 5: CONTROLE DE SESSÕES */}
              <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden flex flex-col justify-between animate-in slide-in-from-bottom-2 duration-300">
                <div>
                  <div className="p-5 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Controle de Conexões e Sessões</h4>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">Limitar concorrência de acessos e tempo de expiração</p>
                    </div>
                  </div>

                  <div className="p-6 space-y-5">
                    <div className="text-[11px] text-slate-500 uppercase font-bold leading-normal">
                      Gerencie as restrições logísticas de concorrência simultânea. Isso evita vazamento de credenciais e logins duplicados não autorizados.
                    </div>

                    <div className="space-y-4 pt-1">
                      {/* Max sessions parameter */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-[9px] font-black uppercase text-slate-400 tracking-wider">
                          <span>Máximo de Sessões Simultâneas</span>
                          <span className="text-slate-800 font-extrabold text-[10px] bg-slate-100 px-2 py-0.5 rounded-md">
                            {formMaxSessions} {formMaxSessions === 1 ? 'Sessão Ativa' : 'Sessões Ativas'}
                          </span>
                        </div>
                        <input 
                          type="range"
                          min="1"
                          max="10"
                          step="1"
                          value={formMaxSessions}
                          onChange={(e) => setFormMaxSessions(parseInt(e.target.value))}
                          className="w-full accent-blue-650 h-2 bg-slate-100 rounded-lg cursor-pointer"
                        />
                        <div className="flex justify-between text-[8px] text-slate-400 font-semibold uppercase">
                          <span>1 Sessão (Máxima Restrição)</span>
                          <span>10 Sessões (Livre)</span>
                        </div>
                      </div>

                      {/* Inactivity timeout parameter */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-[9px] font-black uppercase text-slate-400 tracking-wider">
                          <span>Tempo Máximo de Inatividade</span>
                          <span className="text-slate-800 font-extrabold text-[10px] bg-slate-100 px-2 py-0.5 rounded-md">
                            {formInactivityTime === 0 ? 'Desativado' : `${formInactivityTime} Minutos`}
                          </span>
                        </div>
                        <input 
                          type="range"
                          min="0"
                          max="120"
                          step="5"
                          value={formInactivityTime}
                          onChange={(e) => setFormInactivityTime(parseInt(e.target.value))}
                          className="w-full accent-blue-650 h-2 bg-slate-100 rounded-lg cursor-pointer"
                        />
                        <div className="flex justify-between text-[8px] text-slate-400 font-semibold uppercase">
                          <span>Desativado (Manter online)</span>
                          <span>120 Minutos</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                  <button
                    onClick={handleSaveSessionSettings}
                    className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-xs active:scale-[0.98]"
                  >
                    Salvar Configurações
                  </button>
                </div>
              </div>


              {/* CARD 6: ALERTA CRÍTICO */}
              <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden flex flex-col justify-between lg:col-span-2 animate-in slide-in-from-bottom-2 duration-300">
                <div>
                  <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                        <ShieldAlert className="w-5 h-5 animate-pulse" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Modo Alerta Crítico Proativo</h4>
                        <p className="text-[9px] text-slate-400 font-bold uppercase">Protocolos rígidos para mitigar logins e acessos hostis ao sistema</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-slate-500 font-black uppercase">STATUS:</span>
                      <button
                        onClick={() => {
                          const val = !formCriticalAlertMode;
                          setFormCriticalAlertMode(val);
                          handleToggleCriticalAlertMode(val);
                        }}
                        className={cn(
                          "px-3 py-1.5 text-[9px] font-black rounded-lg uppercase tracking-wider transition-all",
                          formCriticalAlertMode 
                            ? "bg-rose-600 text-white shadow-sm"
                            : "bg-slate-100 text-slate-500 font-bold"
                        )}
                      >
                        {formCriticalAlertMode ? 'ATIVADO' : 'DESATIVADO'}
                      </button>
                    </div>
                  </div>

                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <div className="space-y-4">
                      <div className="text-[11px] text-slate-500 uppercase font-bold leading-relaxed">
                        Ao ligar o <strong>Modo Alerta Crítico</strong>, os algoritmos de triagem passam a auditar proativamente todas os logins do sistema. Veja quais eventos se tornarão incidentes prioritários instantâneos:
                      </div>

                      <div className="space-y-2.5">
                        <div className="flex gap-2.5 items-start text-[10px] font-black uppercase text-slate-700 bg-red-50/50 p-2.5 rounded-xl border border-red-100">
                          <span className="text-rose-600">🚨</span>
                          <div>
                            <span>Tentativas de acesso administrativo geram alerta prioritário</span>
                            <p className="text-[8px] text-slate-400 font-semibold uppercase mt-0.5">Tentativas em cargos como ADMIN MASTER têm o sinal luminoso disparado imediatamente</p>
                          </div>
                        </div>

                        <div className="flex gap-2.5 items-start text-[10px] font-black uppercase text-slate-700 bg-red-50/50 p-2.5 rounded-xl border border-red-100">
                          <span className="text-rose-600">🚨</span>
                          <div>
                            <span>Tentativas internacionais geram alerta prioritário</span>
                            <p className="text-[8px] text-slate-400 font-semibold uppercase mt-0.5">Trafego vindo de países de fora da sua whitelist aciona o alarmismo local</p>
                          </div>
                        </div>

                        <div className="flex gap-2.5 items-start text-[10px] font-black uppercase text-slate-700 bg-red-50/50 p-2.5 rounded-xl border border-red-100">
                          <span className="text-rose-600">🚨</span>
                          <div>
                            <span>Múltiplas tentativas consecutivas geram alerta prioritário</span>
                            <p className="text-[8px] text-slate-400 font-semibold uppercase mt-0.5">Erros reiterados de senha ou fingerprint no mesmo IP entram na lista de emergência e são suspensos</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
                      <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Simulação Visual de Sinalizador Ativado</h5>
                      <div className="bg-rose-950 text-rose-300 rounded-xl p-4 border border-rose-800 space-y-2 text-[10px] uppercase font-bold">
                        <div className="flex items-center gap-2 animate-pulse">
                          <span className="h-2 w-2 rounded-full bg-red-500" />
                          <span className="text-red-400 font-black tracking-widest text-[9px]">DIRETIVAS CRÍTICAS DE ENGENHARIA</span>
                        </div>
                        <p className="text-slate-300 text-[9px] font-normal tracking-wide leading-relaxed">
                          Quando ativo, incidentes prioritários aparecem destacados com painel de pulsação vermelho (<span className="text-rose-450 font-black text-rose-400">"Acesso Crítico Priority-1"</span>). Isso permite que incidentes de alta gravidade não passem desapercebidos.
                        </p>
                        <div className="pt-1.5">
                          <span className="text-[8px] text-rose-400 font-black tracking-wider block">MODO ATUAL:</span>
                          <span className={cn(
                            "text-[10px] font-black block tracking-wider",
                            formCriticalAlertMode ? "text-emerald-400 animate-pulse" : "text-amber-500"
                          )}>
                            {formCriticalAlertMode ? '☣ ATENÇÃO: AUDITANDO COM RIGIDEZ MILITAR' : '⚠ AUDITORIA DE SEGURANÇA PADRÃO EM CURSO'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                  <button
                    onClick={() => handleToggleCriticalAlertMode(formCriticalAlertMode)}
                    className="px-5 py-3 bg-red-650 hover:bg-red-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-xs active:scale-[0.98]"
                  >
                    Salvar Modo Alerta Crítico
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* CONFIRMATION EMERGENCY LOCK MODAL */}
      <AnimatePresence>
        {showEmergencyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border-2 border-slate-200 w-full max-w-md rounded-3xl p-6 shadow-2xl relative space-y-4"
            >
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
                <ShieldAlert className="w-9 h-9 animate-bounce animate-duration-1000" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-sm font-black text-rose-950 uppercase tracking-widest">CONCURTIR SEGURANÇA MÁXIMA?</h3>
                <p className="text-[11px] font-bold text-slate-500 uppercase leading-relaxed">
                  Você está prestes a acionar o lockdown total do sistema. Esta ação irá:
                </p>
                <ul className="text-left text-[10px] font-black text-rose-700 uppercase space-y-1 list-disc list-inside max-w-xs mx-auto">
                  <li>Encerrar todas as sessões ativas imediatamente</li>
                  <li>Exigir novo login em todos os outros aparelhos</li>
                  <li>Manter apenas esta sua sessão confiável principal ativa</li>
                  <li>Gerar incident code no log de auditoria</li>
                </ul>
              </div>
              
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowEmergencyModal(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all"
                >
                  Cancelar Operação
                </button>
                <button
                  onClick={triggerEmergencyLock}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-750 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all shadow"
                >
                  Confirmar Bloqueio Total
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
