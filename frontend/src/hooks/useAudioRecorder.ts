import { useState, useCallback, useRef, useEffect } from 'react';

export type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped';

export interface VADConfig {
  enabled: boolean;
  silenceThreshold: number; // 0-255, lower = more sensitive
  silenceDuration: number; // ms of silence before auto-stop
  minRecordingTime: number; // minimum recording time before VAD kicks in (ms)
  maxRecordingTime: number; // maximum recording time in ms (0 = unlimited)
}

const DEFAULT_VAD_CONFIG: VADConfig = {
  enabled: true,
  silenceThreshold: 15, // audio level below this is considered silence
  silenceDuration: 1500, // 1.5 seconds of silence to auto-stop
  minRecordingTime: 1000, // at least 1 second of recording
  maxRecordingTime: 60000, // 60 seconds max recording time
};

function getSupportedMimeType(): string {
  const mimeTypes = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/wav',
  ];

  for (const mimeType of mimeTypes) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }
  return '';
}

interface UseAudioRecorderReturn {
  state: RecordingState;
  audioBlob: Blob | null;
  audioUrl: string | null;
  duration: number;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  resetRecording: () => void;
  error: string | null;
  mediaStream: MediaStream | null;
  audioLevel: number; // 0-100 for visualization
  isVADActive: boolean;
  vadConfig: VADConfig;
  setVADConfig: (config: Partial<VADConfig>) => void;
}

export function useAudioRecorder(initialVADConfig?: Partial<VADConfig>): UseAudioRecorderReturn {
  const [state, setState] = useState<RecordingState>('idle');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isVADActive, setIsVADActive] = useState(false);
  const [vadConfig, setVADConfigState] = useState<VADConfig>({
    ...DEFAULT_VAD_CONFIG,
    ...initialVADConfig,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<number | null>(null);

  // VAD refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceStartRef = useRef<number | null>(null);
  const vadIntervalRef = useRef<number | null>(null);
  const hasSpokenRef = useRef<boolean>(false);

  const setVADConfig = useCallback((config: Partial<VADConfig>) => {
    setVADConfigState((prev) => ({ ...prev, ...config }));
  }, []);

  // VAD monitoring
  const startVADMonitoring = useCallback(
    (stream: MediaStream) => {
      if (!vadConfig.enabled) return;

      try {
        const audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);

        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        source.connect(analyser);

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        vadIntervalRef.current = window.setInterval(() => {
          if (!analyserRef.current) return;

          analyserRef.current.getByteFrequencyData(dataArray);

          // Calculate average audio level
          const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          const normalizedLevel = Math.min(100, Math.round((average / 128) * 100));
          setAudioLevel(normalizedLevel);

          const recordingTime = Date.now() - startTimeRef.current;

          // Check max recording time limit
          if (vadConfig.maxRecordingTime > 0 && recordingTime >= vadConfig.maxRecordingTime) {
            console.log('[VAD] Max recording time reached, auto-stopping recording');
            if (mediaRecorderRef.current?.state === 'recording') {
              mediaRecorderRef.current.stop();
              setState('stopped');
              if (durationIntervalRef.current) {
                clearInterval(durationIntervalRef.current);
                durationIntervalRef.current = null;
              }
            }
            return;
          }

          // Check if user has started speaking (above threshold)
          if (average > vadConfig.silenceThreshold * 2) {
            hasSpokenRef.current = true;
          }

          // Only activate VAD after minimum recording time and user has spoken
          if (recordingTime < vadConfig.minRecordingTime || !hasSpokenRef.current) {
            setIsVADActive(false);
            silenceStartRef.current = null;
            return;
          }

          setIsVADActive(true);

          // Check for silence
          if (average < vadConfig.silenceThreshold) {
            if (!silenceStartRef.current) {
              silenceStartRef.current = Date.now();
            } else {
              const silenceDuration = Date.now() - silenceStartRef.current;
              if (silenceDuration >= vadConfig.silenceDuration) {
                console.log('[VAD] Silence detected, auto-stopping recording');
                // Auto-stop recording
                if (mediaRecorderRef.current?.state === 'recording') {
                  mediaRecorderRef.current.stop();
                  setState('stopped');
                  if (durationIntervalRef.current) {
                    clearInterval(durationIntervalRef.current);
                    durationIntervalRef.current = null;
                  }
                }
              }
            }
          } else {
            silenceStartRef.current = null;
          }
        }, 100);
      } catch (err) {
        console.error('[VAD] Failed to start monitoring:', err);
      }
    },
    [vadConfig]
  );

  const stopVADMonitoring = useCallback(() => {
    if (vadIntervalRef.current) {
      clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = null;
    }
    if (audioContextRef.current) {
      // Safe close - handle already closed state
      if (audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch((err) => {
          console.warn('[VAD] AudioContext close warning:', err);
        });
      }
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    silenceStartRef.current = null;
    hasSpokenRef.current = false;
    setAudioLevel(0);
    setIsVADActive(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopVADMonitoring();
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [stopVADMonitoring]);

  const startRecording = useCallback(async () => {
    setError(null);
    chunksRef.current = [];
    hasSpokenRef.current = false;

    // Cleanup previous Object URL to prevent memory leak
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setAudioBlob(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMediaStream(stream);

      const mimeType = getSupportedMimeType();
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
      const mediaRecorder = new MediaRecorder(stream, options);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      const blobType = mimeType || 'audio/webm';
      mediaRecorder.onstop = () => {
        console.log('[onstop] Creating blob from chunks:', chunksRef.current.length, 'chunks');
        const blob = new Blob(chunksRef.current, { type: blobType });
        console.log('[onstop] Blob created, size:', blob.size, 'type:', blob.type);
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
        setMediaStream(null);
        stopVADMonitoring();
        console.log('[onstop] audioBlob set, mediaStream cleared');
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100);

      startTimeRef.current = Date.now();
      durationIntervalRef.current = window.setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);

      // Start VAD monitoring
      startVADMonitoring(stream);

      setState('recording');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      }
      setState('idle');
    }
  }, [audioUrl, startVADMonitoring, stopVADMonitoring]);

  const stopRecording = useCallback(() => {
    console.log('[stopRecording] mediaRecorderRef.current:', mediaRecorderRef.current);
    console.log(
      '[stopRecording] mediaRecorderRef.current?.state:',
      mediaRecorderRef.current?.state
    );
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      console.log('[stopRecording] Stopping MediaRecorder...');
      mediaRecorderRef.current.stop();
      setState('stopped');

      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    } else {
      console.log('[stopRecording] Condition not met, not stopping');
    }
  }, []);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.pause();
      setState('paused');

      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }
  }, [state]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && state === 'paused') {
      mediaRecorderRef.current.resume();
      setState('recording');

      const pausedDuration = duration * 1000;
      startTimeRef.current = Date.now() - pausedDuration;
      durationIntervalRef.current = window.setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    }
  }, [state, duration]);

  const resetRecording = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setState('idle');
    chunksRef.current = [];
    stopVADMonitoring();
  }, [audioUrl, stopVADMonitoring]);

  return {
    state,
    audioBlob,
    audioUrl,
    duration,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
    error,
    mediaStream,
    audioLevel,
    isVADActive,
    vadConfig,
    setVADConfig,
  };
}
