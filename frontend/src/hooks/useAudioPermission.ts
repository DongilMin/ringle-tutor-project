import { useState, useCallback, useEffect } from 'react';

export type PermissionState = 'granted' | 'denied' | 'prompt' | 'unknown';

interface UseAudioPermissionReturn {
  permissionState: PermissionState;
  requestPermission: () => Promise<boolean>;
  error: string | null;
}

export function useAudioPermission(): UseAudioPermissionReturn {
  const [permissionState, setPermissionState] = useState<PermissionState>('unknown');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let permissionStatus: PermissionStatus | null = null;

    const handleChange = () => {
      if (permissionStatus) {
        setPermissionState(permissionStatus.state as PermissionState);
      }
    };

    const checkPermission = async () => {
      try {
        if (navigator.permissions) {
          permissionStatus = await navigator.permissions.query({
            name: 'microphone' as PermissionName,
          });
          setPermissionState(permissionStatus.state as PermissionState);
          permissionStatus.addEventListener('change', handleChange);
        }
      } catch {
        setPermissionState('prompt');
      }
    };

    checkPermission();

    return () => {
      if (permissionStatus) {
        permissionStatus.removeEventListener('change', handleChange);
      }
    };
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setPermissionState('granted');
      return true;
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setPermissionState('denied');
          setError('Microphone permission denied');
        } else if (err.name === 'NotFoundError') {
          setError('No microphone found');
        } else {
          setError(err.message);
        }
      }
      return false;
    }
  }, []);

  return { permissionState, requestPermission, error };
}
