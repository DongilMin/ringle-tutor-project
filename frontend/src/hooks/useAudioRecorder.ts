import { useState, useCallback, useRef } from 'react';

export type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped';

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
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [state, setState] = useState<RecordingState>('idle');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<number | null>(null);

  const startRecording = useCallback(async () => {
    setError(null);
    chunksRef.current = [];

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
        console.log('[onstop] audioBlob set, mediaStream cleared');
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100);

      startTimeRef.current = Date.now();
      durationIntervalRef.current = window.setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);

      setState('recording');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      }
      setState('idle');
    }
  }, []);

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
  }, [audioUrl]);

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
  };
}
