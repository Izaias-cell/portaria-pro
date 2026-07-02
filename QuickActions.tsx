// Polyfill for crypto.randomUUID to ensure compatibility in non-secure contexts, webviews, and iframe environments like the AI Studio preview
if (typeof window !== 'undefined') {
  if (!window.crypto) {
    (window as any).crypto = {} as any;
  }
  if (!window.crypto.randomUUID) {
    window.crypto.randomUUID = function() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      }) as any;
    };
  }

  // Gracefully handle unhandled runtime errors in development/preview to prevent complete white-screens or focus loss
  window.addEventListener('error', (event) => {
    console.error('Captured runtime error:', event.error);
  });
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Captured unhandled promise rejection:', event.reason);
  });
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
