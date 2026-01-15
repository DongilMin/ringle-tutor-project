import React, { useEffect, useCallback, useRef, useState } from 'react';
import { ChatBubble } from '../components/ChatBubble';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import {
  createSession,
  sendAudioMessage,
  type UIMessage,
  type ConversationError,
} from '../services/conversationService';

type ConversationState = 'idle' | 'recording' | 'processing' | 'playing' | 'error';

const Conversation: React.FC = () => {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [conversationState, setConversationState] = useState<ConversationState>('idle');
  const [error, setError] = useState<ConversationError | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const chatAreaRef = useRef<HTMLDivElement>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const {
    state: recordingState,
    audioBlob,
    duration,
    startRecording,
    stopRecording,
    resetRecording,
    error: recordingError,
  } = useAudioRecorder();

  // Initialize conversation on mount
  useEffect(() => {
    async function initConversation() {
      const result = await createSession();

      if (result.success) {
        setConversationId(result.conversationId);
        setMessages(result.messages);

        // Add welcome message if no messages
        if (result.messages.length === 0) {
          setMessages([
            {
              id: 'welcome',
              content: "Hello! I'm your AI English tutor. Press the record button and speak to me!",
              sender: 'ai',
              timestamp: new Date(),
            },
          ]);
        }
      } else {
        setError(result.error);
        setConversationState('error');
      }

      setIsInitializing(false);
    }

    initConversation();
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // Play audio helper - must be declared before the useEffect that uses it
  const playAudio = useCallback((url: string) => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }

    const audio = new Audio(url);
    audioPlayerRef.current = audio;

    audio.onended = () => {
      setConversationState('idle');
    };

    audio.onerror = () => {
      setConversationState('idle');
    };

    audio.play().catch(() => {
      setConversationState('idle');
    });
  }, []);

  // Handle audio blob when recording stops
  useEffect(() => {
    async function processAudio() {
      if (!audioBlob || !conversationId || conversationState !== 'idle') return;

      setConversationState('processing');
      setError(null);

      const result = await sendAudioMessage(
        conversationId,
        audioBlob,
        audioBlob.type || 'audio/webm'
      );

      if (result.success) {
        setMessages((prev) => [...prev, result.userMessage, result.assistantMessage]);

        // Play AI response audio if available
        if (result.audioUrl) {
          setConversationState('playing');
          playAudio(result.audioUrl);
        } else {
          setConversationState('idle');
        }
      } else {
        setError(result.error);
        setConversationState('error');
      }

      resetRecording();
    }

    if (audioBlob && recordingState === 'stopped') {
      processAudio();
    }
  }, [audioBlob, recordingState, conversationId, conversationState, resetRecording, playAudio]);

  // Recording handlers
  const handleStartRecording = useCallback(async () => {
    if (conversationState !== 'idle') return;

    setError(null);
    setConversationState('recording');
    await startRecording();
  }, [conversationState, startRecording]);

  const handleStopRecording = useCallback(() => {
    if (recordingState !== 'recording') return;

    stopRecording();
    setConversationState('idle');
  }, [recordingState, stopRecording]);

  // Error retry
  const handleRetry = useCallback(() => {
    setError(null);
    setConversationState('idle');
    resetRecording();
  }, [resetRecording]);

  // Format duration for display
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get button state
  const getButtonConfig = () => {
    if (isInitializing) {
      return {
        text: 'Loading...',
        onClick: () => {},
        disabled: true,
        color: '#999',
      };
    }

    if (conversationState === 'recording' || recordingState === 'recording') {
      return {
        text: `Stop Recording (${formatDuration(duration)})`,
        onClick: handleStopRecording,
        disabled: false,
        color: '#f44336',
      };
    }

    if (conversationState === 'processing') {
      return {
        text: 'Processing...',
        onClick: () => {},
        disabled: true,
        color: '#ff9800',
      };
    }

    if (conversationState === 'playing') {
      return {
        text: 'AI Speaking...',
        onClick: () => {},
        disabled: true,
        color: '#2196f3',
      };
    }

    return {
      text: 'Start Recording',
      onClick: handleStartRecording,
      disabled: false,
      color: '#4CAF50',
    };
  };

  const buttonConfig = getButtonConfig();

  return (
    <div className="conversation-container">
      <h1>AI English Tutor</h1>

      {/* Error display */}
      {(error || recordingError) && (
        <div
          style={{
            padding: '12px',
            backgroundColor: '#ffebee',
            color: '#c62828',
            borderRadius: '8px',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{error?.message || recordingError}</span>
          <button
            onClick={handleRetry}
            style={{
              padding: '6px 12px',
              backgroundColor: '#c62828',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Chat area */}
      <div
        ref={chatAreaRef}
        className="chat-area"
        style={{
          height: '400px',
          overflowY: 'auto',
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '16px',
        }}
      >
        {messages.map((message) => (
          <ChatBubble
            key={message.id}
            text={message.content}
            sender={message.sender}
            timestamp={message.timestamp}
          />
        ))}

        {conversationState === 'processing' && (
          <div
            style={{
              textAlign: 'center',
              color: '#666',
              padding: '16px',
            }}
          >
            Processing your message...
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="controls" style={{ textAlign: 'center' }}>
        <button
          onClick={buttonConfig.onClick}
          disabled={buttonConfig.disabled}
          style={{
            padding: '16px 32px',
            fontSize: '18px',
            backgroundColor: buttonConfig.color,
            color: 'white',
            border: 'none',
            borderRadius: '50px',
            cursor: buttonConfig.disabled ? 'not-allowed' : 'pointer',
            opacity: buttonConfig.disabled ? 0.7 : 1,
            transition: 'all 0.2s',
          }}
        >
          {buttonConfig.text}
        </button>

        {/* Recording indicator */}
        {recordingState === 'recording' && (
          <div
            style={{
              marginTop: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <span
              style={{
                width: '12px',
                height: '12px',
                backgroundColor: '#f44336',
                borderRadius: '50%',
                animation: 'pulse 1s infinite',
              }}
            />
            <span style={{ color: '#666' }}>Recording...</span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default Conversation;
