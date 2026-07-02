import { ReactNode } from 'react';

export interface ToastOptions {
  description?: string;
  duration?: number;
  icon?: ReactNode;
  [key: string]: any;
}

export interface ToastMessage {
  id: string;
  message: string;
  description?: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'default';
  icon?: ReactNode;
}

type ToastListener = (toasts: ToastMessage[]) => void;
let listeners: ToastListener[] = [];
let toasts: ToastMessage[] = [];

export const toastStore = {
  subscribe(listener: ToastListener) {
    listeners.push(listener);
    listener([...toasts]);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  },
  getToasts() {
    return [...toasts];
  },
  add(message: string, type: ToastMessage['type'] = 'default', options?: ToastOptions) {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastMessage = {
      id,
      message,
      description: options?.description,
      type,
      icon: options?.icon
    };
    toasts = [...toasts, newToast];
    listeners.forEach(l => l([...toasts]));

    const duration = options?.duration ?? 4000;
    setTimeout(() => {
      this.remove(id);
    }, duration);

    return id;
  },
  remove(id: string) {
    toasts = toasts.filter(t => t.id !== id);
    listeners.forEach(l => l([...toasts]));
  },
  clear() {
    toasts = [];
    listeners.forEach(l => l([]));
  }
};

interface ToastFunction {
  (message: string, options?: ToastOptions): string;
  success: (message: string, options?: ToastOptions) => string;
  error: (message: string, options?: ToastOptions) => string;
  warning: (message: string, options?: ToastOptions) => string;
  info: (message: string, options?: ToastOptions) => string;
  dismiss: (id?: string) => void;
}

export const toast = ((message: string, options?: ToastOptions) => {
  return toastStore.add(message, 'default', options);
}) as ToastFunction;

toast.success = (message: string, options?: ToastOptions) => {
  return toastStore.add(message, 'success', options);
};

toast.error = (message: string, options?: ToastOptions) => {
  return toastStore.add(message, 'error', options);
};

toast.warning = (message: string, options?: ToastOptions) => {
  return toastStore.add(message, 'warning', options);
};

toast.info = (message: string, options?: ToastOptions) => {
  return toastStore.add(message, 'info', options);
};

toast.dismiss = (id?: string) => {
  if (id) {
    toastStore.remove(id);
  } else {
    toastStore.clear();
  }
};
