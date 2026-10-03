import { useEffect, useState } from 'react';

interface USBAutoLogoutOptions {
  role?: 'ADMIN' | 'DOCTOR' | 'PATIENT';
  onLogout?: () => void;
  checkIntervalMs?: number;
}

export const useUSBAutoLogout = ({
  role,
  onLogout,
  checkIntervalMs = 3000
}: USBAutoLogoutOptions = {}) => {
  const [isConnected, setIsConnected] = useState<boolean>(true);

  useEffect(() => {
    // Only enforce hardware key check for Admin and Doctor roles
    if (!role || role === 'PATIENT') return;

    // 1. WebUSB Disconnect Listener
    const handleDisconnect = (event: Event) => {
      console.warn('[SECURITY ZERO-TRUST] Physical USB Security Key Disconnected!');
      setIsConnected(false);
      triggerEmergencyLogout('Hardware USB Key was unplugged from the device.');
    };

    const handleConnect = (event: Event) => {
      console.log('[SECURITY ZERO-TRUST] Physical USB Key Connected.');
      setIsConnected(true);
    };

    if (typeof window !== 'undefined' && 'usb' in navigator) {
      navigator.usb.addEventListener('disconnect', handleDisconnect);
      navigator.usb.addEventListener('connect', handleConnect);
    }

    // 2. Heartbeat Polling for Hardware Key Verification
    const heartbeatTimer = setInterval(async () => {
      if (typeof window !== 'undefined' && 'usb' in navigator) {
        try {
          const devices = await navigator.usb.getDevices();
          if (devices.length === 0) {
            console.warn('[SECURITY HEARTBEAT] No registered USB token detected.');
            // If hardware token requirement is enforced
            setIsConnected(false);
          }
        } catch (err) {
          console.error('[USB HEARTBEAT ERROR]', err);
        }
      }
    }, checkIntervalMs);

    return () => {
      if (typeof window !== 'undefined' && 'usb' in navigator) {
        navigator.usb.removeEventListener('disconnect', handleDisconnect);
        navigator.usb.removeEventListener('connect', handleConnect);
      }
      clearInterval(heartbeatTimer);
    };
  }, [role]);

  const triggerEmergencyLogout = (reason: string) => {
    // Invalidate cookies & Local Storage
    localStorage.removeItem('user_data');
    localStorage.removeItem('access_token');
    document.cookie = 'next-auth.session-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';

    if (onLogout) {
      onLogout();
    } else {
      alert(`🔒 SECURITY AUTO-LOGOUT: ${reason}`);
      window.location.href = `/login?reason=${encodeURIComponent(reason)}`;
    }
  };

  return { isConnected, triggerEmergencyLogout };
};
